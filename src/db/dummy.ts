/* eslint-disable @typescript-eslint/no-unused-vars */
import { Datastore } from "./interfaces";

export class DummyStore implements Datastore {
  async ping(): Promise<string> {
    return "OK";
  }
  async setCategory(_key: string, val: string): Promise<string | undefined> {
    return val;
  }
  async getCategory(_key: string): Promise<string | undefined> {
    return undefined;
  }
  async persistMonth(
    _month: string,
    _expenses: Array<Record<string, unknown>>,
  ): Promise<string | undefined> {
    return "OK";
  }

  async getMonth(
    _month: string,
  ): Promise<{ expenses: Array<Record<string, unknown>> }> {
    return { expenses: [] };
  }
  async listMonths(): Promise<{ months: string[] }> {
    return { months: [] };
  }
}
