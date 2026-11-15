import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomTabBar, TopNav } from "@/components/nav";
import { Footer } from "@/components/footer";

const inter = Inter({
  subsets: ["latin"],
  axes: ["opsz"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Revorfest", template: "%s · Revorfest" },
  description: "The official club app of Revorfest — EA Sports FC Pro Clubs, PS5 & PC cross-play.",
  applicationName: "Revorfest",
  appleWebApp: { capable: true, title: "Revorfest", statusBarStyle: "black-translucent" },
  icons: { icon: "/icons/favicon.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const kitScript = `try{var k=localStorage.getItem('rf-kit');if(k==='home'||k==='away'||k==='third')document.documentElement.dataset.kit=k}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-kit="away" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: kitScript }} />
      </head>
      <body className="min-h-svh bg-pitch font-sans text-chalk">
        <Providers>
          <TopNav />
          <main>{children}</main>
          <Footer />
          <BottomTabBar />
        </Providers>
      </body>
    </html>
  );
}
