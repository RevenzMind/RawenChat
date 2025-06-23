import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Viewport } from "next";

const inter = Inter({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const viewport: Viewport = {
  themeColor: '#ffb823',

}

export const metadata: Metadata = {
  title: "RawenChat",
  description: "Minimalist Twitch chat viewer with TTS support. Clean interface designed for streamers and OBS integration. Free and open source.",
  keywords: [
    "Twitch",
    "chat",
    "TTS",
    "text to speech",
    "streaming",
    "OBS",
    "overlay",
    "minimalist",
    "open source",
    "live chat",
    "streamer tools",
    "rawenchat",
    "rawen",
    "rawen chat",
    "rawen chat viewer",
    "rawen chat tts",
    "rawen chat overlay",
    "rawen chat minimalist",
    "rawen chat obs",
  ],
 openGraph: {
    countryName: "MX",
    title: "RawenChat - Twitch Chat Viewer",
    description: "Minimalist Twitch chat viewer with TTS support. Clean interface designed for streamers and OBS integration. Free and open source.",
    url: "https://rawenchat.vercel.app",
    siteName: "RawenChat",
    images: [
      {
        url: "https://rawenchat.vercel.app/banner.png",
        width: 1200,
        height: 630,
        alt: "RawenChat - Minimalist Twitch Chat Viewer",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "RawenChat - Twitch Chat Viewer",
    description: "Minimalist Twitch chat viewer with TTS support. Clean interface designed for streamers and OBS integration. Free and open source.",
    images: ["https://rawenchat.vercel.app/banner.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
