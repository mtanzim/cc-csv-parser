import { createClient, RedisClientType } from "redis";
import { Datastore } from "./interfaces";
import { EXPENSE_CATEGORY_COLL_NAME, MONTHLY_COLL_NAME } from "./constants";

export class RedisCategoryCache implements Datastore {
  db: RedisClientType;
  _expenseCategoryName = EXPENSE_CATEGORY_COLL_NAME;
  _monthNameSpace = MONTHLY_COLL_NAME;
  constructor() {
    const redisUrl = process?.env?.["REDIS_URL"];

    if (!redisUrl) {
      console.error("Redis environment variables are not set");
    }

    const redisClient: RedisClientType = createClient({
      url: redisUrl,
    });

    redisClient
      .connect()
      .then(() => {
        console.log("Redis client connected to the server");
      })
      .catch((err) => {
        console.error("Error connecting to Redis:", err);
      });
    redisClient.on("error", (err) => console.log("Redis Client Error", err));

    this.db = redisClient;
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

  async getMonth(
    month: string
  ): Promise<{ expenses: Array<Record<string, unknown>> }> {
    const expenses = await this.db.json.get(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      `${this._monthNameSpace}#${month}` as any,
      "$"
    );
    return { expenses } as { expenses: Array<Record<string, unknown>> };
  }
}
