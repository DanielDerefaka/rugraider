import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./provider";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";

const lufga = localFont({
  src: [
    {
      path: './lufga/LufgaLight.ttf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './lufga/LufgaRegular.ttf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './lufga/LufgaMedium.ttf',
      weight: '500',
      style: 'normal',
    },
    {
      path: './lufga/LufgaBold.ttf',
      weight: '700',
      style: 'normal',
    }
  ],
  variable: "--font-lufga"
});

export const metadata: Metadata = {
  title: "SolGuard",
  description: "SolGuard is a platform for monitoring and protecting Solana wallets and transactions.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={lufga.variable}>
      <ThemeProvider  attribute="class" defaultTheme="system" enableSystem>

 
      <body className="font-sans antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
      </ThemeProvider>
    </html>
  );
}