[CmdletBinding()]
param(
  [Parameter()]
  [ValidatePattern('^[A-Za-z0-9.-]+$')]
  [string]$Server = 'YOUR_SERVER_IP',

  [Parameter()]
  [ValidatePattern('^[a-z_][a-z0-9_-]*$')]
  [string]$SshUser = 'ubuntu',

  [Parameter()]
  [string]$KeyPath = "$env:USERPROFILE\Downloads\ssh-key-2025-10-08.key",

  [Parameter()]
  [ValidatePattern('^(https?://)?[A-Za-z0-9.-]+(:[0-9]{1,5})?$')]
  [string]$SiteAddress = 'http://YOUR_SERVER_IP',

  [Parameter()]
  [ValidatePattern('^[A-Za-z0-9._/-]+$')]
  [string]$Ref = 'HEAD'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Invoke-Checked {
  param(
    [Parameter(Mandatory)]
    [string]$Program,

    [Parameter(Mandatory)]
    [string[]]$Arguments
  )

  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "$Program failed with exit code $LASTEXITCODE."
  }
}

$resolvedKey = (Resolve-Path -LiteralPath $KeyPath).Path
$repository = (& git rev-parse --show-toplevel).Trim()
if ($LASTEXITCODE -ne 0 -or -not $repository) {
  throw 'Run this script from inside the application Git repository.'
}

Push-Location $repository
$temporaryDirectory = $null

try {
  $changes = & git status --porcelain
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not inspect the Git working tree.'
  }
  if ($changes) {
    throw 'Commit or discard local changes before deploying.'
  }

  $commit = (& git rev-parse "$Ref^{commit}").Trim()
  if ($LASTEXITCODE -ne 0 -or $commit -notmatch '^[0-9a-f]{40}$') {
    throw "Could not resolve Git ref '$Ref'."
  }

  $shortCommit = $commit.Substring(0, 12)
  $temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
  $temporaryDirectory = Join-Path $temporaryRoot "whatsapp-export-viewer-$([guid]::NewGuid().ToString('N'))"
  New-Item -ItemType Directory -Path $temporaryDirectory | Out-Null
  $archive = Join-Path $temporaryDirectory "release-$shortCommit.tar"

  Invoke-Checked -Program 'git' -Arguments @(
    'archive',
    '--format=tar',
    "--output=$archive",
    $commit
  )

  $archiveHash = (Get-FileHash -Algorithm SHA256 -LiteralPath $archive).Hash.ToLowerInvariant()
  $remoteArchive = "/tmp/whatsapp-export-viewer-$shortCommit.tar"
  $target = "${SshUser}@${Server}"

  Invoke-Checked -Program 'scp' -Arguments @(
    '-i', $resolvedKey,
    '-o', 'BatchMode=yes',
    $archive,
    "${target}:$remoteArchive"
  )

  $releaseDirectory = "/opt/whatsapp-export-viewer/releases/$shortCommit"
  $remoteCommand = @(
    'set -Eeuo pipefail;',
    ('test "$(sha256sum ''{0}'' | cut -d'' '' -f1)" = ''{1}'';' -f $remoteArchive, $archiveHash),
    "sudo install -d -m 0755 -o '$SshUser' -g '$SshUser' /opt/whatsapp-export-viewer /opt/whatsapp-export-viewer/releases /opt/whatsapp-export-viewer/shared;",
    "if test -d '$releaseDirectory'; then rm -f '$remoteArchive'; else install -d -m 0755 '$releaseDirectory'; tar -xf '$remoteArchive' -C '$releaseDirectory'; rm -f '$remoteArchive'; fi;",
    "bash '$releaseDirectory/deploy/activate-release.sh' '$releaseDirectory' /opt/whatsapp-export-viewer '$SiteAddress' '$commit'"
  ) -join ' '

  Invoke-Checked -Program 'ssh' -Arguments @(
    '-i', $resolvedKey,
    '-o', 'BatchMode=yes',
    $target,
    $remoteCommand
  )

  Write-Host "Deployment complete: $commit"
  Write-Host "Address: $SiteAddress"
}
finally {
  Pop-Location
  if ($temporaryDirectory) {
    $resolvedTemporary = [IO.Path]::GetFullPath($temporaryDirectory)
    $temporaryRoot = [IO.Path]::GetFullPath([IO.Path]::GetTempPath())
    if ($resolvedTemporary.StartsWith($temporaryRoot, [StringComparison]::OrdinalIgnoreCase) -and
        (Split-Path -Leaf $resolvedTemporary) -like 'whatsapp-export-viewer-*') {
      Remove-Item -LiteralPath $resolvedTemporary -Recurse -Force -ErrorAction SilentlyContinue
    }
  }
}
