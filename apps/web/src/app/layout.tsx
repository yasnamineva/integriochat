import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SessionProvider } from "@/components/SessionProvider.js";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chatbot SaaS",
  description: "AI-powered chatbots for small businesses",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
