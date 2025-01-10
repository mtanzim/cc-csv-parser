import { categories, UNCATEGORIZED } from "@/lib/schemas";
import InnerPage from "./InnerPage";

export default async function Home() {
  return <InnerPage categories={categories} uncategorized={UNCATEGORIZED} />;
}
