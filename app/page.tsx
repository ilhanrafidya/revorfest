import { Hero, Statement } from "@/components/hero";
import { Overview } from "@/components/overview";
import { KitShowcase } from "@/components/kit-showcase";
import { WrappedBanner } from "@/components/wrapped-banner";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Statement />
      <WrappedBanner />
      <Overview />
      <KitShowcase />
    </>
  );
}
