/* eslint-disable @typescript-eslint/no-unused-vars */
import { categories, PersistedExpense, UNCATEGORIZED } from "@/lib/schemas";
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
    monthStr: string,
  ): Promise<{ expenses: Array<Record<string, unknown>> }> {
    const [month, year] = monthStr.split("-");
    if (!month || isNaN(Number(month))) {
      return { expenses: [] };
    }
    const fakeData: PersistedExpense = Array(28)
      .fill(null)
      .map((_, idx) => `${month}-${idx + 1}-${year}`)
      .map((d) => new Date(d))
      .map((date, idx) => {
        const category =
          categories.at(idx % categories.length) || UNCATEGORIZED;
        const name = `${category} ${idx + 1}`;
        return {
          id: String(idx + 1),
          expense: Math.floor(Math.random() * 1000) + 1,
          name,
          date,
          category,
        };
      });
    const data = { expenses: fakeData };
    return data;
  }
  async listMonths(): Promise<{ months: string[] }> {
    const months = [
      "01-2025",
      "02-2025",
      "03-2025",
      "04-2025",
      "05-2025",
      "06-2025",
      "07-2025",
      "12-2024",
    ];
    return { months };
  }
}
