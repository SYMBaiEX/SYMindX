declare module 'bun:sqlite' {
  export class Database {
    constructor(filename: string);
    exec(sql: string): void;
    query(sql: string): {
      get(...params: unknown[]): unknown;
      run(...params: unknown[]): void;
    };
  }
}
