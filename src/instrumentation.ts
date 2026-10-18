import { validateSettings as validateFirestoreSettings } from "./db/firestore";
export async function register() {
  console.log("STARTUP CODE");
  validateFirestoreSettings();
}
