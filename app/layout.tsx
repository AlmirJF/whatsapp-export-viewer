import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "WhatsApp Export Chat Viewer — abra conversas ZIP no navegador";
  const description = "Abra e leia conversas exportadas do WhatsApp em formato ZIP diretamente no navegador. Seus arquivos ficam no dispositivo e não são enviados a servidores externos.";

  return {
    metadataBase,
    title,
    description,
    applicationName: "WhatsApp Export Viewer",
    keywords: [
      "WhatsApp export chat viewer",
      "WhatsApp export viewer",
      "open WhatsApp export",
      "WhatsApp chat viewer",
      "abrir conversa exportada do WhatsApp",
      "visualizar ZIP do WhatsApp",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      images: [{ url: new URL("/og.png", metadataBase).toString(), width: 1728, height: 915, alt: "WhatsApp Export Viewer — open exported chats in your browser" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [new URL("/og.png", metadataBase).toString()],
    },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
