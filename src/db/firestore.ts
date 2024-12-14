import { Firestore } from "@google-cloud/firestore";
import { CategoryCache } from "./interfaces";
import { z } from "zod";

const GOOGLE_PROJECT_ID = process.env?.["GOOGLE_PROJECT_ID"];

if (!GOOGLE_PROJECT_ID) {
  throw new Error("set up google project id");
}

const db = new Firestore({
  projectId: GOOGLE_PROJECT_ID,
});

class FirestoreCategoryCache implements CategoryCache {
  db: Firestore;
  constructor(db: Firestore) {
    this.db = db;
  }
  async hSet(
    collName: string,
    key: string,
    val: string
  ): Promise<string | undefined> {
    this.validateStrings([collName, key, val]);
    const docRef = this.db.collection(collName).doc(key);
    await docRef.set({
      value: val,
    });
    return val;
  }
  async hGet(collName: string, key: string): Promise<string | undefined> {
    this.validateStrings([collName, key]);
    const ref = await this.db.collection(collName).doc(key);
    const doc = await ref.get();
    if (!doc.exists) {
      throw new Error(`${key} not found in ${collName}`);
    }
    const r = doc.data()?.["value"];
    this.validateStrings([r]);
    return r;
  }

  private validateStrings(vs: string[]) {
    vs.forEach((v) => {
      z.string().parse(v);
    });
  }
}
