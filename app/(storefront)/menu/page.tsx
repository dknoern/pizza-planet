import { listAvailableMenu } from "@/lib/menu/queries";
import { Hero } from "../components/Hero";
import { MenuGrid } from "./MenuGrid";

export default async function MenuPage() {
  const items = await listAvailableMenu();
  return (
    <>
      <Hero />
      <MenuGrid items={items} />
    </>
  );
}
