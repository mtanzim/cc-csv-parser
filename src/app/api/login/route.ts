import { z } from "zod";
import jwt from "jsonwebtoken";
import { AUTH_COOKIE_NAME } from "@/lib/with-auth";
import { cookies } from "next/headers";

const allowedUsername = process.env?.["USERNAME"];
const allowedPassword = process.env?.["USERPASS"];
const jwtSecret = process.env?.["JWT_SECRET"];

if (!allowedPassword || !allowedPassword || !jwtSecret) {
  console.error("please setup env vars for user auth");
}

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

// TODO: fix this
// https://nextjs.org/docs/app/building-your-application/authentication
export const POST = async (request: Request) => {
  const body = loginSchema.parse(await request.json());
  if (body.username !== allowedUsername || body.password !== allowedPassword) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  const token = jwt.sign(
    {
      hasAccess: true,
    },
    jwtSecret || "",
    { expiresIn: 60 * 60 }
  );
  const cookieStore = await cookies();

  // 1hr
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
  cookieStore.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    sameSite: "lax",
    path: "/",
  });
  return new Response("OK", {
    headers: {
      "Content-Type": "application/text",
    },
  });
};
