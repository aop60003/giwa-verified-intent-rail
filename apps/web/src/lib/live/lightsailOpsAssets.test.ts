import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const OPS_ROOT = "../../ops/lightsail";

function readOps(path: string): string {
  return readFileSync(`${OPS_ROOT}/${path}`, "utf8");
}

function occurrences(source: string, value: string): number {
  return source.split(value).length - 1;
}

describe("Lightsail systemd assets", () => {
  it("runs static and live services from the immutable release with least privilege", () => {
    const staticUnit = readOps("systemd/giwa-static.service");
    const liveUnit = readOps("systemd/giwa-live.service");

    for (const unit of [staticUnit, liveUnit]) {
      expect(unit).toContain("User=giwa");
      expect(unit).toContain("Group=giwa");
      expect(unit).toContain("WorkingDirectory=/opt/giwa/current");
      expect(unit).toContain("Restart=on-failure");
      expect(unit).toContain("NoNewPrivileges=true");
      expect(unit).toContain("PrivateTmp=true");
      expect(unit).toContain("ProtectSystem=strict");
      expect(unit).toContain("Environment=HOST=127.0.0.1");
      expect(unit).toContain("Environment=GIWA_SKIP_PUBLIC_EXPORT=1");
    }

    expect(staticUnit).toContain("Environment=PORT=4176");
    expect(staticUnit).toContain("apps/web/scripts/serve-static.mjs");
    expect(staticUnit).not.toContain("EnvironmentFile=");
    expect(staticUnit).not.toContain("ReadWritePaths=");
    expect(staticUnit).not.toContain("/var/lib/giwa");

    expect(liveUnit).toContain("Environment=PORT=4177");
    expect(liveUnit).toContain("Environment=GIWA_LIVE_MODE=staging-testnet");
    expect(liveUnit).toContain("EnvironmentFile=/etc/giwa/giwa-live.runtime");
    expect(liveUnit).toContain(
      "ExecStart=/usr/bin/node --experimental-strip-types apps/web/scripts/serve-live.mjs"
    );
    expect(liveUnit).toContain("ReadWritePaths=/var/lib/giwa");
    expect(liveUnit).toContain("KillSignal=SIGTERM");
    expect(liveUnit).toContain("TimeoutStopSec=15s");
  });

  it("schedules a bounded daily backup through only the versioned script", () => {
    const service = readOps("systemd/giwa-backup.service");
    const timer = readOps("systemd/giwa-backup.timer");

    expect(service).toContain("Type=oneshot");
    expect(service).toContain("EnvironmentFile=/etc/giwa/giwa-live.runtime");
    expect(service).toContain("ReadWritePaths=/var/lib/giwa/backups");
    expect(service).not.toContain("ReadWritePaths=/var/lib/giwa\n");
    expect(service).toContain(
      "ExecStart=/opt/giwa/current/ops/lightsail/scripts/backup-live-db.sh"
    );
    expect(occurrences(service, "ExecStart=")).toBe(1);
    expect(service).not.toMatch(/ExecStart=(?:\/usr\/bin\/)?(?:ba)?sh\b/u);
    expect(service).not.toContain("ExecStartPre=");
    expect(service).not.toContain("ExecStartPost=");

    expect(timer).toContain("OnCalendar=daily");
    expect(timer).toContain("Persistent=true");
    expect(timer).toContain("RandomizedDelaySec=30m");
    expect(timer).toContain("Unit=giwa-backup.service");
  });
});

describe("Lightsail Nginx assets", () => {
  it("keeps route ownership explicit and upstream failures bounded", () => {
    const template = readOps("nginx/giwa-staging.conf.template");

    expect(occurrences(template, "__GIWA_STAGE_HOST__")).toBe(1);
    expect(template).toContain("listen 80;");
    expect(template).toContain("server_name __GIWA_STAGE_HOST__;");
    expect(template).toContain("server 127.0.0.1:4176;");
    expect(template).toContain("server 127.0.0.1:4177;");
    expect(template).toContain("client_max_body_size 64k;");
    expect(template).toMatch(/proxy_connect_timeout\s+[1-9][0-9]*s;/u);
    expect(template).toMatch(/proxy_read_timeout\s+[1-9][0-9]*s;/u);
    expect(template).toMatch(/proxy_send_timeout\s+[1-9][0-9]*s;/u);

    expect(template).toContain("proxy_set_header Host $host;");
    expect(template).toContain("proxy_set_header X-Real-IP $remote_addr;");
    expect(template).toContain("proxy_set_header X-Forwarded-Proto $scheme;");
    expect(template).toContain("proxy_set_header X-Forwarded-Host $host;");
    expect(template).not.toMatch(/\$http_x_(?:real_ip|forwarded)/iu);

    expect(template).toMatch(/location \^~ \/api\/\s*\{[\s\S]*?proxy_pass http:\/\/giwa_live;[\s\S]*?error_page 502 503 504 = @giwa_api_unavailable;/u);
    expect(template).toMatch(/location = \/healthz\s*\{[\s\S]*?proxy_pass http:\/\/giwa_live;/u);
    expect(template).toMatch(/location = \/readyz\s*\{[\s\S]*?proxy_pass http:\/\/giwa_live;/u);
    expect(template).toMatch(/location = \/user\s*\{[\s\S]*?proxy_pass http:\/\/giwa_live;[\s\S]*?error_page 502 503 504 = @giwa_static_user_fallback;/u);
    expect(template).toMatch(/location \^~ \/user\/\s*\{[\s\S]*?proxy_pass http:\/\/giwa_live;[\s\S]*?error_page 502 503 504 = @giwa_static_user_fallback;/u);

    for (const route of ["/", "/demo", "/partner"]) {
      const escaped = route === "/" ? "\\/" : route.replace("/", "\\/");
      expect(template).toMatch(
        new RegExp(`location = ${escaped}\\s*\\{[\\s\\S]*?proxy_pass http:\\/\\/giwa_static;`, "u")
      );
    }

    expect(template).toMatch(/location @giwa_api_unavailable\s*\{[\s\S]*?internal;[\s\S]*?default_type application\/json;[\s\S]*?add_header Cache-Control "no-store" always;[\s\S]*?return 503 '\{"error":"service_unavailable"\}';/u);
    expect(template).toMatch(/location @giwa_static_user_fallback\s*\{[\s\S]*?internal;[\s\S]*?proxy_intercept_errors off;[\s\S]*?proxy_pass http:\/\/giwa_static;/u);
    expect(template).not.toMatch(/listen\s+443|ssl_certificate|certbot/iu);
  });

  it("renders exactly one strict DNS hostname into an explicit output path", () => {
    const renderer = readOps("render-nginx-config.mjs");

    expect(renderer).toContain('const TOKEN = "__GIWA_STAGE_HOST__";');
    expect(renderer).toContain("process.env.GIWA_STAGE_HOST");
    expect(renderer).toContain("process.argv[2]");
    expect(renderer).toMatch(/tokenCount\s*!==\s*1/u);
    expect(renderer).toMatch(/__\[A-Z0-9_\]\+__/u);
    expect(renderer).toContain("isIP(host)");
    expect(renderer).toContain("writeFileSync(outputPath, rendered");
    expect(renderer).not.toMatch(/console\.(?:log|error)\([^\n]*(?:host|rendered|template|process\.env)/iu);

    const tempDirectory = mkdtempSync(join(tmpdir(), "giwa-nginx-render-"));
    try {
      const outputPath = join(tempDirectory, "staging.conf");
      const valid = spawnSync("node", [`${OPS_ROOT}/render-nginx-config.mjs`, outputPath], {
        encoding: "utf8",
        env: { ...process.env, GIWA_STAGE_HOST: "Stage.Example.COM" }
      });
      expect(valid.status).toBe(0);
      expect(valid.stdout).toBe("");
      expect(valid.stderr).toBe("");
      const rendered = readFileSync(outputPath, "utf8");
      expect(rendered).toContain("server_name stage.example.com;");
      expect(rendered).not.toMatch(/__[A-Z0-9_]+__/u);

      for (const invalidHost of [
        "https://stage.example.com",
        "stage.example.com:443",
        "stage.example.com/path",
        "user@stage.example.com",
        "*.example.com",
        "stage_name.example.com",
        "stage.example.com.",
        "127.0.0.1"
      ]) {
        const rejected = spawnSync(
          "node",
          [`${OPS_ROOT}/render-nginx-config.mjs`, join(tempDirectory, "rejected.conf")],
          {
            encoding: "utf8",
            env: { ...process.env, GIWA_STAGE_HOST: invalidHost }
          }
        );
        expect(rejected.status, invalidHost).not.toBe(0);
        expect(rejected.stdout, invalidHost).toBe("");
        expect(rejected.stderr, invalidHost).not.toContain(invalidHost);
        expect(rejected.stderr.length, invalidHost).toBeLessThan(100);
      }
    } finally {
      rmSync(tempDirectory, { recursive: true, force: true });
    }
  });
});

describe("Lightsail host scripts", () => {
  it("creates and verifies one safe SQLite backup without retention deletion", () => {
    const backup = readOps("scripts/backup-live-db.sh");

    expect(backup).toContain("#!/usr/bin/env bash");
    expect(backup).toContain("set -euo pipefail");
    expect(backup).toContain('backup_dir="/var/lib/giwa/backups"');
    expect(backup).toContain('${GIWA_LIVE_DB_PATH:-}');
    expect(backup).toContain('[ -r "$GIWA_LIVE_DB_PATH" ]');
    expect(backup).toMatch(
      /case "\$GIWA_LIVE_DB_PATH" in\s+\/\*\) ;;\s+\*\) exit 1 ;;\s+esac/u
    );
    expect(backup).toContain('[ -d "$backup_dir" ]');
    expect(backup).toContain('[ -w "$backup_dir" ]');
    expect(backup).toContain("date -u +%Y%m%dT%H%M%SZ");
    expect(backup).toContain("mktemp");
    expect(backup).toMatch(/sqlite3 "\$GIWA_LIVE_DB_PATH" "\.backup '\$backup_path'"/u);
    expect(backup).toMatch(/sqlite3[^\n]+"\$backup_path" 'PRAGMA quick_check;'/u);
    expect(backup).toContain('[ "$quick_check" = "ok" ]');
    expect(backup).toContain('printf \'%s\\n\' "$(basename -- "$backup_path")"');
    expect(backup).not.toMatch(/\b(?:find|xargs)\b|-(?:mtime|delete)\b|rm[^\n]*\*/u);
    expect(backup).not.toMatch(/(?:source|\.)\s+[^\n]*(?:runtime|env)/u);
  });

  it("smokes bounded localhost surfaces without exposing bodies or URLs", () => {
    const smoke = readOps("scripts/smoke-local.sh");

    expect(smoke).toContain("#!/usr/bin/env bash");
    expect(smoke).toContain("set -euo pipefail");
    expect(smoke).toContain("curl --fail --silent --show-error --max-time 8");
    expect(smoke).toContain("http://127.0.0.1:4176/");
    expect(smoke).toContain("http://127.0.0.1:4177/user");
    expect(smoke).toContain("http://127.0.0.1:4177/healthz");
    expect(smoke).toContain("http://127.0.0.1:4177/readyz");
    expect(smoke).toContain("http://127.0.0.1:4177/api/public/config");
    expect(smoke).toContain("GIWA Verified Intent Rail");
    expect(smoke).toContain('"ok":true');
    expect(smoke).toContain('"ready":true');
    expect(smoke).toContain('"chainId":91342');
    expect(smoke).toMatch(/curl[^\n]+2>\/dev\/null/u);
    expect(smoke.match(/if ! check[^\n]+; then\s+exit 1\s+fi/gu)).toHaveLength(5);
    expect(smoke).not.toMatch(/(?:echo|printf)[^\n]*(?:\$body|\$url|GIWA_|http:)/u);
  });

  it("contains no committed credential, provider, host, or database values", () => {
    const paths = [
      "systemd/giwa-static.service",
      "systemd/giwa-live.service",
      "systemd/giwa-backup.service",
      "systemd/giwa-backup.timer",
      "nginx/giwa-staging.conf.template",
      "render-nginx-config.mjs",
      "scripts/backup-live-db.sh",
      "scripts/smoke-local.sh"
    ];
    const source = paths.map(readOps).join("\n");

    expect(source).not.toMatch(/0x[a-fA-F0-9]{64}/u);
    expect(source).not.toMatch(/(?:CAMPAIGN_SIGNER_PRIVATE_KEY|GIWA_SEPOLIA_RPC_URL|GIWA_LIVE_PARTNER_CREDENTIAL_HASHES)=\S+/u);
    expect(source).not.toMatch(/server_name\s+(?!__GIWA_STAGE_HOST__)[^;]+;/u);
    expect(source).not.toMatch(/\/var\/lib\/giwa\/[A-Za-z0-9_.-]+\.sqlite/u);
  });
});
