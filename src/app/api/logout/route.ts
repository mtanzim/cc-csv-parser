import { COOKIE_NAME, withAuth } from "@/lib/with-auth";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = withAuth(async (_req: Request) => {
  return new Response("OK", {
    headers: {
      "Content-Type": "application/text",
      "Set-Cookie": `${COOKIE_NAME}=empty;expires=0`,
    },
  });
});
