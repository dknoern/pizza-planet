import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";

const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});

const mono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-space-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pizza Planet — Pizza delivered from every corner of the galaxy",
  description: "Hand-tossed dough, locally-sourced toppings from 17 nearby star systems.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${grotesk.variable} ${mono.variable}`}>
      <body>
        <div className="starfield" aria-hidden="true" />
        {children}
      </body>
    </html>
  );
}
