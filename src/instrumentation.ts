import {
  fireStoreClient,
  validateSettings as validateFirestoreSettings,
} from "./db/firestore";
export async function register() {
  console.log("STARTUP CODE");
  validateFirestoreSettings();
  console.log(await fireStoreClient.ping());
}
