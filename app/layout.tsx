import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { BottomTabBar, MobileAccount, TopNav } from "@/components/nav";
import { currentPlayer } from "@/lib/session";
import { avatarUrl } from "@/lib/players";
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const player = await currentPlayer();
  const me = player
    ? { slug: player.slug, name: player.display_name, avatar: avatarUrl({ id: player.id, avatar_version: player.avatar_version, has_avatar: player.has_avatar }) }
    : null;
  return (
    <html lang="en" data-kit="away" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: kitScript }} />
      </head>
      <body className="min-h-svh font-sans text-chalk">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 transition-[background] duration-700"
          style={{
            background:
              "radial-gradient(55% 45% at 10% 0%, color-mix(in oklab, var(--accent-2) 20%, transparent), transparent 70%), radial-gradient(50% 40% at 100% 55%, color-mix(in oklab, var(--glow) 16%, transparent), transparent 70%), radial-gradient(45% 35% at 0% 100%, color-mix(in oklab, var(--accent) 6%, transparent), transparent 70%)",
          }}
        />
        <Providers>
          <TopNav me={me} />
          <MobileAccount me={me} />
          <main>{children}</main>
          <Footer />
          <BottomTabBar />
        </Providers>
      </body>
    </html>
  );
}
