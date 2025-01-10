import { AUTH_COOKIE_NAME, withAuth } from "@/lib/with-auth";
import { cookies } from "next/headers";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const POST = withAuth(async (_req: Request) => {
  const cookieStore = await cookies();
  cookieStore.delete(AUTH_COOKIE_NAME);
  return new Response("OK");
});
