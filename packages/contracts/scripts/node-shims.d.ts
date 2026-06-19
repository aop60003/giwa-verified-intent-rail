declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdirSync(path: string, options: { recursive: true }): void;
  export function readFileSync(path: string, options: { encoding: "utf8" }): string;
  export function writeFileSync(path: string, data: string): void;
}
