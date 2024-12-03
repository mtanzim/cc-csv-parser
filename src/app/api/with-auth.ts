import { cookies } from "next/headers";

type Handler = (request: Request) => Promise<Response>;

export function withAuth(handler: Handler): Handler {
  return async function (req: Request): Promise<Response> {
    const cookieStore = await cookies();
    const token = cookieStore.get("token");
    console.log({ token });
    return handler(req);
  };
}
