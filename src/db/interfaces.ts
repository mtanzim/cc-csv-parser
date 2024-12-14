export interface CategoryCache {
  hGet(collName: string, key: string): string | undefined;
  hSet(collName: string, key: string, val: string): Promise<string | undefined>;
}