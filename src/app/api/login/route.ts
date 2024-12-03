import { z } from "zod";
import jwt from "jsonwebtoken";
import { COOKIE_NAME } from "../with-auth";

const allowedUsername = process.env?.["USERNAME"];
const allowedPassword = process.env?.["USERPASS"];
const jwtSecret = process.env?.["JWT_SECRET"];

if (!allowedPassword || !allowedPassword || !jwtSecret) {
  throw new Error("please setup env vars for user auth");
}

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

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
    jwtSecret,
    { expiresIn: 60 * 60 }
  );
  return new Response("OK", {
    headers: {
      "Content-Type": "application/text",
      "Set-Cookie": `${COOKIE_NAME}=${token}`,
    },
  });
};
