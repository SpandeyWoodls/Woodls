import { describe, expect, it, vi } from "vitest";
import type { WoodlsConfig } from "../../config/config.js";
import { telegramOutbound } from "./outbound/telegram.js";
import { whatsappOutbound } from "./outbound/whatsapp.js";

describe("telegramOutbound.sendPayload", () => {
  it("sends text payload with buttons", async () => {
    const sendTelegram = vi.fn(async () => ({ messageId: "m1", chatId: "c1" }));

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as WoodlsConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Hello",
        channelData: {
          telegram: {
            buttons: [[{ text: "Option", callback_data: "/option" }]],
          },
        },
      },
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledTimes(1);
    expect(sendTelegram).toHaveBeenCalledWith(
      "telegram:123",
      "Hello",
      expect.objectContaining({
        buttons: [[{ text: "Option", callback_data: "/option" }]],
        textMode: "html",
      }),
    );
    expect(result).toEqual({ channel: "telegram", messageId: "m1", chatId: "c1" });
  });

  it("sends media payloads and attaches buttons only to first", async () => {
    const sendTelegram = vi
      .fn()
      .mockResolvedValueOnce({ messageId: "m1", chatId: "c1" })
      .mockResolvedValueOnce({ messageId: "m2", chatId: "c1" });

    const result = await telegramOutbound.sendPayload?.({
      cfg: {} as WoodlsConfig,
      to: "telegram:123",
      text: "ignored",
      payload: {
        text: "Caption",
        mediaUrls: ["https://example.com/a.png", "https://example.com/b.png"],
        channelData: {
          telegram: {
            buttons: [[{ text: "Go", callback_data: "/go" }]],
          },
        },
      },
      deps: { sendTelegram },
    });

    expect(sendTelegram).toHaveBeenCalledTimes(2);
    expect(sendTelegram).toHaveBeenNthCalledWith(
      1,
      "telegram:123",
      "Caption",
      expect.objectContaining({
        mediaUrl: "https://example.com/a.png",
        buttons: [[{ text: "Go", callback_data: "/go" }]],
      }),
    );
    const secondOpts = sendTelegram.mock.calls[1]?.[2] as { buttons?: unknown } | undefined;
    expect(sendTelegram).toHaveBeenNthCalledWith(
      2,
      "telegram:123",
      "",
      expect.objectContaining({
        mediaUrl: "https://example.com/b.png",
      }),
    );
    expect(secondOpts?.buttons).toBeUndefined();
    expect(result).toEqual({ channel: "telegram", messageId: "m2", chatId: "c1" });
  });
});

describe("whatsappOutbound.resolveTarget", () => {
  it("returns error when no target is provided even with allowFrom", () => {
    const result = whatsappOutbound.resolveTarget?.({
      to: undefined,
      allowFrom: ["+15551234567"],
      mode: "implicit",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.any(Error),
    });
  });

  it("returns error when implicit target is not in allowFrom", () => {
    const result = whatsappOutbound.resolveTarget?.({
      to: "+15550000000",
      allowFrom: ["+15551234567"],
      mode: "implicit",
    });

    expect(result).toEqual({
      ok: false,
      error: expect.any(Error),
    });
  });

  it("keeps group JID targets even when allowFrom does not contain them", () => {
    const result = whatsappOutbound.resolveTarget?.({
      to: "120363401234567890@g.us",
      allowFrom: ["+15551234567"],
      mode: "implicit",
    });

    expect(result).toEqual({
      ok: true,
      to: "120363401234567890@g.us",
    });
  });
});
