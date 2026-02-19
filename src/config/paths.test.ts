import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  resolveDefaultConfigCandidates,
  resolveConfigPathCandidate,
  resolveConfigPath,
  resolveOAuthDir,
  resolveOAuthPath,
  resolveStateDir,
} from "./paths.js";

describe("oauth paths", () => {
  it("prefers WOODLS_OAUTH_DIR over WOODLS_STATE_DIR", () => {
    const env = {
      WOODLS_OAUTH_DIR: "/custom/oauth",
      WOODLS_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.resolve("/custom/oauth"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join(path.resolve("/custom/oauth"), "oauth.json"),
    );
  });

  it("derives oauth path from WOODLS_STATE_DIR when unset", () => {
    const env = {
      WOODLS_STATE_DIR: "/custom/state",
    } as NodeJS.ProcessEnv;

    expect(resolveOAuthDir(env, "/custom/state")).toBe(path.join("/custom/state", "credentials"));
    expect(resolveOAuthPath(env, "/custom/state")).toBe(
      path.join("/custom/state", "credentials", "oauth.json"),
    );
  });
});

describe("state + config path candidates", () => {
  it("uses WOODLS_STATE_DIR when set", () => {
    const env = {
      WOODLS_STATE_DIR: "/new/state",
    } as NodeJS.ProcessEnv;

    expect(resolveStateDir(env, () => "/home/test")).toBe(path.resolve("/new/state"));
  });

  it("uses WOODLS_HOME for default state/config locations", () => {
    const env = {
      WOODLS_HOME: "/srv/woodls-home",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/woodls-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".woodls"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".woodls", "woodls.json"));
  });

  it("prefers WOODLS_HOME over HOME for default state/config locations", () => {
    const env = {
      WOODLS_HOME: "/srv/woodls-home",
      HOME: "/home/other",
    } as NodeJS.ProcessEnv;

    const resolvedHome = path.resolve("/srv/woodls-home");
    expect(resolveStateDir(env)).toBe(path.join(resolvedHome, ".woodls"));

    const candidates = resolveDefaultConfigCandidates(env);
    expect(candidates[0]).toBe(path.join(resolvedHome, ".woodls", "woodls.json"));
  });

  it("orders default config candidates in a stable order", () => {
    const home = "/home/test";
    const resolvedHome = path.resolve(home);
    const candidates = resolveDefaultConfigCandidates({} as NodeJS.ProcessEnv, () => home);
    // First entry must be the primary config location
    expect(candidates[0]).toBe(path.join(resolvedHome, ".woodls", "woodls.json"));
    // All entries must be absolute paths under the resolved home
    expect(candidates.every((c) => c.startsWith(resolvedHome))).toBe(true);
    // Must include the primary config path
    expect(candidates).toContain(path.join(resolvedHome, ".woodls", "woodls.json"));
  });

  it("prefers ~/.woodls when it exists and legacy dir is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "woodls-state-"));
    try {
      const newDir = path.join(root, ".woodls");
      await fs.mkdir(newDir, { recursive: true });
      const resolved = resolveStateDir({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(newDir);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("CONFIG_PATH prefers existing config when present", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "woodls-config-"));
    try {
      const legacyDir = path.join(root, ".woodls");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyPath = path.join(legacyDir, "woodls.json");
      await fs.writeFile(legacyPath, "{}", "utf-8");

      const resolved = resolveConfigPathCandidate({} as NodeJS.ProcessEnv, () => root);
      expect(resolved).toBe(legacyPath);
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });

  it("respects state dir overrides when config is missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "woodls-config-override-"));
    try {
      const legacyDir = path.join(root, ".woodls");
      await fs.mkdir(legacyDir, { recursive: true });
      const legacyConfig = path.join(legacyDir, "woodls.json");
      await fs.writeFile(legacyConfig, "{}", "utf-8");

      const overrideDir = path.join(root, "override");
      const env = { WOODLS_STATE_DIR: overrideDir } as NodeJS.ProcessEnv;
      const resolved = resolveConfigPath(env, overrideDir, () => root);
      expect(resolved).toBe(path.join(overrideDir, "woodls.json"));
    } finally {
      await fs.rm(root, { recursive: true, force: true });
    }
  });
});
