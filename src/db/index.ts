import { FirestoreCategoryCache, firestoreDB } from "./firestore";
import { CategoryCache } from "./interfaces";
import { getRedisClient } from "./redis";

const fireStoreClient: CategoryCache = new FirestoreCategoryCache(firestoreDB);
const redisClient = getRedisClient();

export const getDBClient = (): CategoryCache => {
  if (process.env["IS_REDIS"]) {
    return redisClient;
  }
  return fireStoreClient;
};
