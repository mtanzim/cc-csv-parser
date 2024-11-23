import { createClient } from "redis";

const redisHost = process?.env?.["REDIS_HOST"];
const redisPort = process?.env?.["REDIS_PORT"];
const redisUser = process?.env?.["REDIS_USER"];
const redisPassword = process?.env?.["REDIS_PASS"];

if (!redisHost || !redisPort) {
  throw new Error("Redis environment variables are not set");
}

let redisClient;
let isConnected = false;

if (!redisClient) {
  let url = `redis://${redisHost}:${redisPort}`;
  if (redisUser && redisPassword) {
    url = `redis://${redisUser}:${redisPassword}@${redisHost}:${redisPort}`;
  }
  redisClient = createClient({
    url,
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
export const getClient = () => {
  return redisClient;
};

export const EXPENSE_CATEGORY_HKEY = "expenses";
