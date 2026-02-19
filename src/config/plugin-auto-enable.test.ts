import { describe, expect, it } from "vitest";
import { applyPluginAutoEnable } from "./plugin-auto-enable.js";

describe("applyPluginAutoEnable", () => {
  it("auto-enables channel plugins and updates allowlist", () => {
    const result = applyPluginAutoEnable({
      config: {
        channels: { slack: { botToken: "x" } },
        plugins: { allow: ["telegram"] },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.slack?.enabled).toBe(true);
    expect(result.config.plugins?.allow).toEqual(["telegram", "slack"]);
    expect(result.changes.join("\n")).toContain("Slack configured, enabled automatically.");
  });

  it("respects explicit disable", () => {
    const result = applyPluginAutoEnable({
      config: {
        channels: { slack: { botToken: "x" } },
        plugins: { entries: { slack: { enabled: false } } },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.slack?.enabled).toBe(false);
    expect(result.changes).toEqual([]);
  });

  it.skip("auto-enables irc when configured via env (IRC channel removed)", () => {
    // IRC channel was removed in the Woodls rebrand
  });

  it("auto-enables provider auth plugins when profiles exist", () => {
    const result = applyPluginAutoEnable({
      config: {
        auth: {
          profiles: {
            "google-antigravity:default": {
              provider: "google-antigravity",
              mode: "oauth",
            },
          },
        },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.["google-antigravity-auth"]?.enabled).toBe(true);
  });

  it("skips when plugins are globally disabled", () => {
    const result = applyPluginAutoEnable({
      config: {
        channels: { slack: { botToken: "x" } },
        plugins: { enabled: false },
      },
      env: {},
    });

    expect(result.config.plugins?.entries?.slack?.enabled).toBeUndefined();
    expect(result.changes).toEqual([]);
  });

  describe("preferOver channel prioritization", () => {
    it.skip("prefers bluebubbles: skips imessage auto-configure when both are configured (channels removed)", () => {
      // bluebubbles and imessage channels were removed in the Woodls rebrand
    });

    it.skip("keeps imessage enabled if already explicitly enabled (non-destructive) (channels removed)", () => {
      // bluebubbles and imessage channels were removed in the Woodls rebrand
    });

    it.skip("allows imessage auto-configure when bluebubbles is explicitly disabled (channels removed)", () => {
      // bluebubbles and imessage channels were removed in the Woodls rebrand
    });

    it.skip("allows imessage auto-configure when bluebubbles is in deny list (channels removed)", () => {
      // bluebubbles and imessage channels were removed in the Woodls rebrand
    });

    it.skip("auto-enables imessage when only imessage is configured (channels removed)", () => {
      // imessage channel was removed in the Woodls rebrand
    });
  });
});
