import { withAuth } from "@/lib/with-auth";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (req: Request) => {
  return new Response("OK");
});
