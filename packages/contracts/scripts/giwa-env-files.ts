import { existsSync, readFileSync } from "node:fs";

import { mergeEnvMaps, parseEnvFileContent, type EnvMap } from "./preflight-giwa-helpers.js";

export type LoadedEnv = {
  effectiveEnv: EnvMap;
  loadedEnvFiles: string[];
};

export function loadEnvFromFiles(processEnv: EnvMap, cwd: string): LoadedEnv {
  const normalizedCwd = cwd.replace(/\\/gu, "/");
  const candidates = [
    { label: "workspace .env", path: `${normalizedCwd}/../../.env` },
    { label: "workspace .env.local", path: `${normalizedCwd}/../../.env.local` },
    { label: "cwd .env", path: `${normalizedCwd}/.env` },
    { label: "cwd .env.local", path: `${normalizedCwd}/.env.local` }
  ];
  const fileEnv: EnvMap = {};
  const loadedEnvFiles: string[] = [];
  const loadedPaths = new Set<string>();

  for (const candidate of candidates) {
    if (loadedPaths.has(candidate.path) || !existsSync(candidate.path)) {
      continue;
    }

    loadedPaths.add(candidate.path);
    Object.assign(fileEnv, parseEnvFileContent(readFileSync(candidate.path, { encoding: "utf8" })));
    loadedEnvFiles.push(candidate.label);
  }

  return {
    effectiveEnv: mergeEnvMaps(processEnv, fileEnv),
    loadedEnvFiles
  };
}
