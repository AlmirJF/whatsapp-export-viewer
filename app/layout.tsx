import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  const metadataBase = new URL(`${protocol}://${host}`);
  const title = "Conversa Clara — leia seus chats com privacidade";
  const description = "Abra conversas exportadas do WhatsApp no próprio navegador. Nenhum arquivo é enviado ou armazenado em servidores externos.";

  return {
    metadataBase,
    title,
    description,
    applicationName: "Conversa Clara",
    keywords: ["conversa", "WhatsApp", "exportação", "privacidade", "visualizador"],
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      type: "website",
      locale: "pt_BR",
      images: [{ url: new URL("/og.png", metadataBase).toString(), width: 1728, height: 915, alt: "Conversa Clara — suas conversas, no seu computador" }],
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
