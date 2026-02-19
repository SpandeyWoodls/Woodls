import { describe, expect, it } from "vitest";
import { validateConfigObject } from "./config.js";

function expectValidConfig(result: ReturnType<typeof validateConfigObject>) {
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected config to be valid");
  }
  return result.config;
}

function _expectInvalidConfig(result: ReturnType<typeof validateConfigObject>) {
  expect(result.ok).toBe(false);
  if (result.ok) {
    throw new Error("expected config to be invalid");
  }
  return result.issues;
}

describe("config irc", () => {
  it("accepts basic irc config", () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          host: "irc.libera.chat",
          nick: "woodls-bot",
          channels: ["#woodls"],
        },
      },
    });

    const config = expectValidConfig(res);
    expect(config.channels?.irc?.host).toBe("irc.libera.chat");
    expect(config.channels?.irc?.nick).toBe("woodls-bot");
  });

  it('accepts irc.dmPolicy="open" without allowFrom "*" (validation removed)', () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          dmPolicy: "open",
          allowFrom: ["alice"],
        },
      },
    });

    const config = expectValidConfig(res);
    expect(config.channels?.irc?.dmPolicy).toBe("open");
  });

  it('accepts irc.dmPolicy="open" with allowFrom "*"', () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          dmPolicy: "open",
          allowFrom: ["*"],
        },
      },
    });

    const config = expectValidConfig(res);
    expect(config.channels?.irc?.dmPolicy).toBe("open");
  });

  it("accepts mixed allowFrom value types for IRC", () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          allowFrom: [12345, "alice"],
          groupAllowFrom: [67890, "alice!ident@example.org"],
          groups: {
            "#ops": {
              allowFrom: [42, "alice"],
            },
          },
        },
      },
    });

    const config = expectValidConfig(res);
    expect(config.channels?.irc?.allowFrom).toEqual([12345, "alice"]);
    expect(config.channels?.irc?.groupAllowFrom).toEqual([67890, "alice!ident@example.org"]);
    expect(config.channels?.irc?.groups?.["#ops"]?.allowFrom).toEqual([42, "alice"]);
  });

  it("accepts nickserv register without registerEmail (validation removed)", () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          nickserv: {
            register: true,
            password: "secret",
          },
        },
      },
    });

    const config = expectValidConfig(res);
    expect(config.channels?.irc?.nickserv?.register).toBe(true);
  });

  it("accepts nickserv register with password and registerEmail", () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          nickserv: {
            register: true,
            password: "secret",
            registerEmail: "bot@example.com",
          },
        },
      },
    });

    const config = expectValidConfig(res);
    expect(config.channels?.irc?.nickserv?.register).toBe(true);
  });

  it("accepts nickserv register with registerEmail only (password may come from env)", () => {
    const res = validateConfigObject({
      channels: {
        irc: {
          nickserv: {
            register: true,
            registerEmail: "bot@example.com",
          },
        },
      },
    });

    expectValidConfig(res);
  });
});
