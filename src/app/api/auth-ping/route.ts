import { withAuth } from "../with-auth";

export const GET = withAuth(async (_req: Request) => {
  return new Response("OK");
});
