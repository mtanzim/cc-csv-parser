import { getClient } from "@/db/redis";
export async function register() {
  console.log("STARTUP CODE");
  getClient();
}
