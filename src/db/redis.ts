import { createClient } from "redis";
import { CategoryCache } from "./interfaces";

const redisUrl = process?.env?.["REDIS_URL"];

if (!redisUrl) {
  throw new Error("Redis environment variables are not set");
}

let redisClient;
let isConnected = false;

if (!redisClient) {
  redisClient = createClient({
    url: redisUrl,
  });
}

if (!isConnected) {
  redisClient
    .connect()
    .then(() => {
      console.log("Redis client connected to the server");
      isConnected = true;
    })
    .catch((err) => {
      console.error("Error connecting to Redis:", err);
    });
} else {
  console.log("redis already connected");
}

redisClient.on("error", (err) => console.log("Redis Client Error", err));
export const getClient = (): CategoryCache => {
  return redisClient;
};

export const EXPENSE_CATEGORY_HKEY = "expenses";
