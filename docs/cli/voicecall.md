---
summary: "CLI reference for `woodls voicecall` (voice-call plugin command surface)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall call|continue|status|tail|expose`
title: "voicecall"
---

# `woodls voicecall`

`voicecall` is a plugin-provided command. It only appears if the voice-call plugin is installed and enabled.

Primary doc:

- Voice-call plugin: [Voice Call](/plugins/voice-call)

## Common commands

```bash
woodls voicecall status --call-id <id>
woodls voicecall call --to "+15555550123" --message "Hello" --mode notify
woodls voicecall continue --call-id <id> --message "Any questions?"
woodls voicecall end --call-id <id>
```

## Exposing webhooks (Tailscale)

```bash
woodls voicecall expose --mode serve
woodls voicecall expose --mode funnel
woodls voicecall unexpose
```

Security note: only expose the webhook endpoint to networks you trust. Prefer Tailscale Serve over Funnel when possible.
