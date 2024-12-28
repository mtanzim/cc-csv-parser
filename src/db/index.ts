import { FirestoreCategoryCache, firestoreDB } from "./firestore";
import { Datastore } from "./interfaces";
import { getRedisClient } from "./redis";

const fireStoreClient: Datastore = new FirestoreCategoryCache(firestoreDB);
const redisClient = getRedisClient();

export const getDBClient = (): Datastore => {
  if (process.env["IS_REDIS"]) {
    return redisClient;
  }
  return fireStoreClient;
};
