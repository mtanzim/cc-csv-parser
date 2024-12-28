import { createClient, RedisClientType } from "redis";
import { Datastore } from "./interfaces";
import { EXPENSE_CATEGORY_COLL_NAME, MONTHLY_COLL_NAME } from "./constants";

const redisUrl = process?.env?.["REDIS_URL"];

if (!redisUrl) {
  console.error("Redis environment variables are not set");
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

export class RedisCategoryCache implements Datastore {
  db: RedisClientType;
  _expenseCategoryName = EXPENSE_CATEGORY_COLL_NAME;
  _monthNameSpace = MONTHLY_COLL_NAME;
  constructor(db: RedisClientType) {
    this.db = db;
  }
  async ping(): Promise<string> {
    return this.db.ping();
  }
  setCategory(key: string, val: string): Promise<string | undefined> {
    return this.db.hSet(this._expenseCategoryName, key, val).then(String);
  }
  async getCategory(key: string): Promise<string | undefined> {
    return this.db.hGet(this._expenseCategoryName, key);
  }
  async persistMonth(
    month: string,
    expenses: Array<Record<string, unknown>>
  ): Promise<string | undefined> {
    return (
      this.db.json
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(`${this._monthNameSpace}#${month}`, "$", expenses as any)
        .then(String)
    );
  }
}

export const getRedisClient = (): Datastore => {
  return new RedisCategoryCache(redisClient);
};
