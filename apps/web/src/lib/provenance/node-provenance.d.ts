declare module "node:fs" {
  export type Dirent = {
    name: string;
    isDirectory(): boolean;
    isFile(): boolean;
  };

  export function existsSync(path: string): boolean;
  export function readdirSync(path: string, options: { withFileTypes: true }): Dirent[];
  export function readFileSync(path: string): Uint8Array;
  export function readFileSync(path: string, options: { encoding: "utf8" } | "utf8"): string;
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string | Uint8Array): void;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function isAbsolute(path: string): boolean;
  export function join(...parts: string[]): string;
  export function relative(from: string, to: string): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string | Uint8Array, inputEncoding?: string): {
      digest(encoding: "hex"): string;
    };
  };
}
