import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// Una sola familia para toda la app: sans técnica, sin serif.
const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Soporte Técnico",
  description: "Sistema de gestión de tickets de soporte técnico",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <div className="flex flex-1 flex-col">{children}</div>
        <Toaster />
      </body>
    </html>
  );
}
