import { cookies } from "next/headers";
import jwt, { JwtPayload } from "jsonwebtoken";
const jwtSecret = process.env?.["JWT_SECRET"];
type Handler = (request: Request) => Promise<Response>;
export const COOKIE_NAME = "token";

export function withAuth(handler: Handler): Handler {
  return async function (req: Request): Promise<Response> {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value || "";
    if (!jwtSecret) {
      console.error("please setup env vars for user auth");
    }

    try {
      const decoded = jwt.verify(token, jwtSecret || "") as JwtPayload;
      if (!decoded?.hasAccess) {
        throw new Error("invalid token");
      }
    } catch (err) {
      console.error(err);
      return new Response("Unauthorized", { status: 401 });
    }

    return handler(req);
  };
}
