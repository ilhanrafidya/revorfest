import { Hero } from "@/components/hero";
import { Overview } from "@/components/overview";
import { KitShowcase } from "@/components/kit-showcase";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Overview />
      <KitShowcase />
    </>
  );
}
