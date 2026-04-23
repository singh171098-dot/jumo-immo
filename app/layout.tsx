import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Chatbot from "../components/Chatbot";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Jumo-Immo | L'immobilier entre particuliers sans frais d'agence",
  description: "Découvrez le vrai prix de l'immobilier, générez vos documents juridiques et achetez ou vendez sans frais d'agence.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${plusJakarta.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className={`${plusJakarta.className} min-h-full flex flex-col`}>
        {children}
        <Chatbot />
      </body>
    </html>
  );
}
