declare module "node:fs" {
  export function readFileSync(path: string, encoding: string): string;
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): {
    update(data: string, inputEncoding?: string): {
      digest(encoding: "hex"): string;
    };
  };
}

declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args: readonly string[],
    options: {
      encoding: "utf8";
      env: Record<string, string | undefined>;
    }
  ): {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: Error;
  };
}

declare const process: {
  cwd(): string;
  env: Record<string, string | undefined>;
  readonly platform: string;
};
