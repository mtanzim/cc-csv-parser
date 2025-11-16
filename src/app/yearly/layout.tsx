import { Navbar } from "@/components/Nav";
import { PageContainer } from "@/components/PageContainer";
import { getIsAuth } from "@/lib/with-auth";
import { redirect } from "next/navigation";

// TODO: checking auth here is not the best idea
export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await getIsAuth();
  if (!isAuth) {
    return redirect("/login");
  }

  return (
    <div>
      <Navbar />
      <PageContainer>{children}</PageContainer>
    </div>
  );
}
