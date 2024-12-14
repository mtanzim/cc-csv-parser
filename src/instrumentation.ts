import { fireStoreClient } from "./db/firestore";
export async function register() {
  console.log("STARTUP CODE");
  console.log(await fireStoreClient.ping());
}
