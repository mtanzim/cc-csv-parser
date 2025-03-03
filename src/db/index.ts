import { DummyStore } from "./dummy";
import {  FirestoreCategoryCache, firestoreDB } from "./firestore";
import { Datastore } from "./interfaces";
import { RedisCategoryCache } from "./redis";

export const getDBClient = (): Datastore => {
  if (process.env["IS_STORE_DISABLED"]) {
    const dummyClient = new DummyStore();
    return dummyClient;
  }
  if (process.env["IS_REDIS"]) {
    const redisClient = new RedisCategoryCache();
    return redisClient;
  }
  const fireStoreClient: Datastore = new FirestoreCategoryCache(firestoreDB);
  return fireStoreClient;
};
