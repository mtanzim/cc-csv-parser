import { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import { Datastore } from "./interfaces";
import { EXPENSE_CATEGORY_COLL_NAME, VALUE_KEY } from "./constants";
import { expenseSchema } from "@/lib/schemas";

const GOOGLE_PROJECT_ID = process.env?.["GOOGLE_PROJECT_ID"];
const KEY_FILENAME = process?.env?.["GOOGLE_APPLICATION_CREDENTIALS"];
const FIRESTORE_DB_ID = process.env?.["FIRESTORE_DB_ID"];

export const firestoreDB = new Firestore({
  projectId: GOOGLE_PROJECT_ID,
  keyFilename: KEY_FILENAME,
  databaseId: FIRESTORE_DB_ID,
});

export class FirestoreCategoryCache implements Datastore {
  db: Firestore;
  _monthCollectionName = "monthly";
  _expenseCategoryName = EXPENSE_CATEGORY_COLL_NAME;
  constructor(db: Firestore) {
    this.db = db;
  }
  async ping(): Promise<string> {
    return this.db.databaseId;
  }
  async setCategory(key: string, val: string): Promise<string | undefined> {
    validateStrings([key, val]);

    const docRef = this.db.collection(this._expenseCategoryName).doc(key);
    const newDoc = {
      [VALUE_KEY]: val,
    };
    validateNewDoc(newDoc);
    await docRef.set(newDoc);
    console.log(
      `firestore cache put: ${this._expenseCategoryName} -> ${key}: ${val}`
    );
    return val;
  }
  async getCategory(key: string): Promise<string | undefined> {
    validateStrings([key]);
    try {
      const ref = await this.db.collection(this._expenseCategoryName).doc(key);
      const doc = await ref.get();
      if (!doc.exists) {
        console.log(
          `firestore cache miss: ${key} not found in ${this._expenseCategoryName}`
        );
        return;
      }
      const r = doc.data()?.[VALUE_KEY];
      validateStrings([r]);
      console.log(
        `firestore cache hit: ${this._expenseCategoryName} -> ${key}: ${r}`
      );
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
    validateStrings([month])
    expenseSchema.parse(expenses);
    const docRef = this.db.collection(this._monthCollectionName).doc(month);
    await docRef.set(expenses);
    throw new Error("to be implemented");
  }
}

function validateNewDoc(doc: Record<string, string>) {
  z.object({
    [VALUE_KEY]: z.string(),
  }).parse(doc);
}

function validateStrings(vs: (string | undefined)[]) {
  vs.forEach((v) => {
    z.string().parse(v);
  });
}

export const validateSettings = () => {
  validateStrings([GOOGLE_PROJECT_ID, KEY_FILENAME, FIRESTORE_DB_ID]);
};
