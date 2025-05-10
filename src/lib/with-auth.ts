import "server-only";

import jwt, { JwtPayload } from "jsonwebtoken";
import { cookies } from "next/headers";
const jwtSecret = process.env?.["JWT_SECRET"];
type Handler = (request: Request) => Promise<Response>;
export const AUTH_COOKIE_NAME = "token";

export function withAuth(handler: Handler): Handler {
  return async function (req: Request): Promise<Response> {
    const isAuth = await getIsAuth();
    if (!isAuth) {
      return new Response("Unauthorized", { status: 401 });
    }
    return handler(req);
  };
}

export async function getIsAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value || "";
  if (!token) {
    return false;
  }

  if (!jwtSecret) {
    console.error("please setup env vars for user auth");
    return false;
  }
  try {
    const decoded = jwt.verify(token, jwtSecret || "") as JwtPayload;
    if (!decoded?.hasAccess) {
      throw new Error("invalid token");
    }
  } catch (err) {
    console.error(err);
    return false;
  }
  return true;
}
