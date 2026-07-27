import type { Metadata } from "next";
import "./globals.css";

const siteUrl = "https://whatsapp-viewer.runcode.qzz.io";
const title = "Abrir conversa exportada do WhatsApp | Chat Viewer";
const description = "Abra e leia conversas exportadas do WhatsApp em ZIP diretamente no navegador. Seus arquivos ficam no dispositivo e nunca são enviados para servidores.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title,
  description,
  applicationName: "WhatsApp Export Viewer",
  category: "utilities",
  keywords: [
    "abrir conversa exportada do WhatsApp",
    "visualizar conversa WhatsApp no navegador",
    "abrir ZIP do WhatsApp",
    "leitor de conversa WhatsApp",
    "WhatsApp export chat viewer",
    "WhatsApp export viewer",
    "open WhatsApp export",
    "WhatsApp chat viewer",
  ],
  alternates: { canonical: "/" },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    title,
    description,
    type: "website",
    url: siteUrl,
    siteName: "WhatsApp Export Viewer",
    locale: "pt_BR",
    images: [{ url: "/og.png", width: 1728, height: 915, alt: "WhatsApp Export Viewer — abra conversas exportadas no navegador" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og.png"],
  },
};

const structuredData = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "WhatsApp Export Viewer",
  alternateName: "WhatsApp Export Chat Viewer",
  url: siteUrl,
  description,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Qualquer sistema com navegador moderno",
  browserRequirements: "JavaScript e suporte a arquivos ZIP",
  inLanguage: "pt-BR",
  isAccessibleForFree: true,
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "BRL",
  },
  featureList: [
    "Abrir conversas exportadas do WhatsApp em ZIP",
    "Pesquisar mensagens",
    "Filtrar participantes e anexos",
    "Processar arquivos localmente no navegador",
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData).replace(/</g, "\\u003c") }}
        />
        <script
          type="module"
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token":"a7157ae80f474d859ec7d71bd53071ca"}'
        />
      </body>
    </html>
  );
}
