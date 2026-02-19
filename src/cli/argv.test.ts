import { describe, expect, it } from "vitest";
import {
  buildParseArgv,
  getFlagValue,
  getCommandPath,
  getPrimaryCommand,
  getPositiveIntFlagValue,
  getVerboseFlag,
  hasHelpOrVersion,
  hasFlag,
  shouldMigrateState,
  shouldMigrateStateFromPath,
} from "./argv.js";

describe("argv helpers", () => {
  it("detects help/version flags", () => {
    expect(hasHelpOrVersion(["node", "woodls", "--help"])).toBe(true);
    expect(hasHelpOrVersion(["node", "woodls", "-V"])).toBe(true);
    expect(hasHelpOrVersion(["node", "woodls", "status"])).toBe(false);
  });

  it("extracts command path ignoring flags and terminator", () => {
    expect(getCommandPath(["node", "woodls", "status", "--json"], 2)).toEqual(["status"]);
    expect(getCommandPath(["node", "woodls", "agents", "list"], 2)).toEqual(["agents", "list"]);
    expect(getCommandPath(["node", "woodls", "status", "--", "ignored"], 2)).toEqual(["status"]);
  });

  it("returns primary command", () => {
    expect(getPrimaryCommand(["node", "woodls", "agents", "list"])).toBe("agents");
    expect(getPrimaryCommand(["node", "woodls"])).toBeNull();
  });

  it("parses boolean flags and ignores terminator", () => {
    expect(hasFlag(["node", "woodls", "status", "--json"], "--json")).toBe(true);
    expect(hasFlag(["node", "woodls", "--", "--json"], "--json")).toBe(false);
  });

  it("extracts flag values with equals and missing values", () => {
    expect(getFlagValue(["node", "woodls", "status", "--timeout", "5000"], "--timeout")).toBe(
      "5000",
    );
    expect(getFlagValue(["node", "woodls", "status", "--timeout=2500"], "--timeout")).toBe("2500");
    expect(getFlagValue(["node", "woodls", "status", "--timeout"], "--timeout")).toBeNull();
    expect(getFlagValue(["node", "woodls", "status", "--timeout", "--json"], "--timeout")).toBe(
      null,
    );
    expect(getFlagValue(["node", "woodls", "--", "--timeout=99"], "--timeout")).toBeUndefined();
  });

  it("parses verbose flags", () => {
    expect(getVerboseFlag(["node", "woodls", "status", "--verbose"])).toBe(true);
    expect(getVerboseFlag(["node", "woodls", "status", "--debug"])).toBe(false);
    expect(getVerboseFlag(["node", "woodls", "status", "--debug"], { includeDebug: true })).toBe(
      true,
    );
  });

  it("parses positive integer flag values", () => {
    expect(getPositiveIntFlagValue(["node", "woodls", "status"], "--timeout")).toBeUndefined();
    expect(
      getPositiveIntFlagValue(["node", "woodls", "status", "--timeout"], "--timeout"),
    ).toBeNull();
    expect(
      getPositiveIntFlagValue(["node", "woodls", "status", "--timeout", "5000"], "--timeout"),
    ).toBe(5000);
    expect(
      getPositiveIntFlagValue(["node", "woodls", "status", "--timeout", "nope"], "--timeout"),
    ).toBeUndefined();
  });

  it("builds parse argv from raw args", () => {
    const nodeArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["node", "woodls", "status"],
    });
    expect(nodeArgv).toEqual(["node", "woodls", "status"]);

    const versionedNodeArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["node-22", "woodls", "status"],
    });
    expect(versionedNodeArgv).toEqual(["node-22", "woodls", "status"]);

    const versionedNodeWindowsArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["node-22.2.0.exe", "woodls", "status"],
    });
    expect(versionedNodeWindowsArgv).toEqual(["node-22.2.0.exe", "woodls", "status"]);

    const versionedNodePatchlessArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["node-22.2", "woodls", "status"],
    });
    expect(versionedNodePatchlessArgv).toEqual(["node-22.2", "woodls", "status"]);

    const versionedNodeWindowsPatchlessArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["node-22.2.exe", "woodls", "status"],
    });
    expect(versionedNodeWindowsPatchlessArgv).toEqual(["node-22.2.exe", "woodls", "status"]);

    const versionedNodeWithPathArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["/usr/bin/node-22.2.0", "woodls", "status"],
    });
    expect(versionedNodeWithPathArgv).toEqual(["/usr/bin/node-22.2.0", "woodls", "status"]);

    const nodejsArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["nodejs", "woodls", "status"],
    });
    expect(nodejsArgv).toEqual(["nodejs", "woodls", "status"]);

    const nonVersionedNodeArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["node-dev", "woodls", "status"],
    });
    expect(nonVersionedNodeArgv).toEqual(["node", "woodls", "node-dev", "woodls", "status"]);

    const directArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["woodls", "status"],
    });
    expect(directArgv).toEqual(["node", "woodls", "status"]);

    const bunArgv = buildParseArgv({
      programName: "woodls",
      rawArgs: ["bun", "src/entry.ts", "status"],
    });
    expect(bunArgv).toEqual(["bun", "src/entry.ts", "status"]);
  });

  it("builds parse argv from fallback args", () => {
    const fallbackArgv = buildParseArgv({
      programName: "woodls",
      fallbackArgv: ["status"],
    });
    expect(fallbackArgv).toEqual(["node", "woodls", "status"]);
  });

  it("decides when to migrate state", () => {
    expect(shouldMigrateState(["node", "woodls", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "health"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "sessions"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "config", "get", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "config", "unset", "update"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "models", "list"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "models", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "memory", "status"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "agent", "--message", "hi"])).toBe(false);
    expect(shouldMigrateState(["node", "woodls", "agents", "list"])).toBe(true);
    expect(shouldMigrateState(["node", "woodls", "message", "send"])).toBe(true);
  });

  it("reuses command path for migrate state decisions", () => {
    expect(shouldMigrateStateFromPath(["status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["config", "get"])).toBe(false);
    expect(shouldMigrateStateFromPath(["models", "status"])).toBe(false);
    expect(shouldMigrateStateFromPath(["agents", "list"])).toBe(true);
  });
});
