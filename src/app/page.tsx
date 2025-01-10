import { categories, UNCATEGORIZED } from "@/lib/schemas";
import InnerPage from "./InnerPage";
import { getIsAuth } from "../lib/with-auth";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/Nav";
import { PageContainer } from "@/components/PageContainer";

export default async function Home() {
  const isAuth = await getIsAuth();
  if (!isAuth) {
    return redirect("/login");
  }
  return (
    <>
      <Navbar />
      <PageContainer>
        <InnerPage categories={categories} uncategorized={UNCATEGORIZED} />
      </PageContainer>
    </>
  );
}
