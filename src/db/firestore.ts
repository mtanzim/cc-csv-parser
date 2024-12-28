import { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import { CategoryCache } from "./interfaces";
import { EXPENSE_CATEGORY_HKEY, VALUE_KEY } from "./constants";

const GOOGLE_PROJECT_ID = process.env?.["GOOGLE_PROJECT_ID"];
const KEY_FILENAME = process?.env?.["GOOGLE_APPLICATION_CREDENTIALS"];
const FIRESTORE_DB_ID = process.env?.["FIRESTORE_DB_ID"];

export const firestoreDB = new Firestore({
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: KEY_FILENAME,
  databaseId: FIRESTORE_DB_ID,
});

export class FirestoreCategoryCache implements CategoryCache {
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
    try {
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
    } catch (err) {
      console.error(err);
      return;
    }
  }
  async persistMonth(
    month: string,
    expenses: Array<Record<string, unknown>>
  ): Promise<string | undefined> {
    throw new Error("to be implemented");
  }
}

function validateNewDoc(doc: Record<string, string>) {
  z.object({
    [VALUE_KEY]: z.string(),
  }).parse(doc);
}

function validateCollName(collName: string) {
  z.literal(EXPENSE_CATEGORY_HKEY).parse(collName);
}

function validateStrings(vs: (string | undefined)[]) {
  vs.forEach((v) => {
    z.string().parse(v);
  });
}

export const validateSettings = () => {
  validateStrings([GOOGLE_PROJECT_ID, KEY_FILENAME, FIRESTORE_DB_ID]);
};
