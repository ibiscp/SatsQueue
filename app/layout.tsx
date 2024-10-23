import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { QueueProvider } from './context/QueueContext'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SatsQueue",
  description: "Join the lightning-fast queue!",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
      </head>
      <body className={inter.className}>
        <QueueProvider>
          {children}
        </QueueProvider>
      </body>
    </html>
  );
}
