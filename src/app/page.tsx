import { categories, UNCATEGORIZED } from "@/lib/schemas";
import InnerPage from "./InnerPage";
import { getIsAuth } from "../lib/with-auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const isAuth = await getIsAuth();
  if (!isAuth) {
    return redirect("/login");
  }
  return <InnerPage categories={categories} uncategorized={UNCATEGORIZED} />;
}
