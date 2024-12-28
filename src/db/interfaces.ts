export interface CategoryCache {
  ping(): Promise<string | undefined>;
  hGet(collName: string, key: string): Promise<string | undefined>;
  hSet(collName: string, key: string, val: string): Promise<string | undefined>;
  persistMonth(
    month: string,
    expenses: Array<Record<string, unknown>>
  ): Promise<string | undefined>;
}
