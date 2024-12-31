export interface Datastore {
  ping(): Promise<string | undefined>;
  getCategory(key: string): Promise<string | undefined>;
  setCategory(key: string, val: string): Promise<string | undefined>;
  persistMonth(
    month: string,
    expenses: Array<Record<string, unknown>>
  ): Promise<string | undefined>;
  getMonth(
    month: string
  ): Promise<{ expenses: Array<Record<string, unknown>> }>;
}
