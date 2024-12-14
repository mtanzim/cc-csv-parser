export interface CategoryCache {
  hGet(collName: string, key: string): Promise<string | undefined>;
  hSet(collName: string, key: string, val: string): Promise<string | undefined>;
}
