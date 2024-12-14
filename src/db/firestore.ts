import { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import { CategoryCache } from "./interfaces";

const GOOGLE_PROJECT_ID = process.env?.["GOOGLE_PROJECT_ID"];
const KEY_FILENAME = process?.env?.["GOOGLE_APPLICATION_CREDENTIALS"];
const FIRESTORE_DB_ID = process.env?.["FIRESTORE_DB_ID"];
validateStrings([GOOGLE_PROJECT_ID, KEY_FILENAME, FIRESTORE_DB_ID]);
const CACHE_COLL_NAME = "expenses";
const VALUE_KEY = "value";

const _db = new Firestore({
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: KEY_FILENAME,
  databaseId: FIRESTORE_DB_ID,
});

class FirestoreCategoryCache implements CategoryCache {
  db: Firestore;
  constructor(db: Firestore) {
    this.db = db;
  }
  async ping(): Promise<string> {
    return this.db.databaseId;
  }
  async hSet(
    collName: string,
    key: string,
    val: string
  ): Promise<string | undefined> {
    validateStrings([collName, key, val]);
    validateCollName(collName);
    const docRef = this.db.collection(collName).doc(key);
    const newDoc = {
      [VALUE_KEY]: val,
    };
    validateNewDoc(newDoc);
    await docRef.set(newDoc);
    console.log(`firestore cache put: ${collName} -> ${key}: ${val}`);
    return val;
  }
  async hGet(collName: string, key: string): Promise<string | undefined> {
    validateCollName(collName);
    validateStrings([collName, key]);
    const ref = await this.db.collection(collName).doc(key);
    const doc = await ref.get();
    if (!doc.exists) {
      console.log(`firestore cache miss: ${key} not found in ${collName}`);
      return;
    }
    const r = doc.data()?.[VALUE_KEY];
    validateStrings([r]);
    console.log(`firestore cache hit: ${collName} -> ${key}: ${r}`);
    return r;
  }
}

function validateNewDoc(doc: Record<string, string>) {
  z.object({
    [VALUE_KEY]: z.string(),
  }).parse(doc);
}

function validateCollName(collName: string) {
  z.literal(CACHE_COLL_NAME).parse(collName);
}

function validateStrings(vs: (string | undefined)[]) {
  vs.forEach((v) => {
    z.string().parse(v);
  });
}

export const fireStoreClient: CategoryCache = new FirestoreCategoryCache(_db);
