import { withAuth } from "../with-auth";

export const GET = withAuth(async () => {
  return new Response("OK");
});
