import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "Ved's Startup Events",
  description: "Discover the best startup and tech events in Tokyo — aggregated from Doorkeeper and Luma.",
  keywords: ["Tokyo events", "startup events", "tech meetup", "Japan startup", "Doorkeeper", "Luma"],
  openGraph: {
    title: "Ved's Startup Events",
    description: "Discover the best startup and tech events in Tokyo",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
