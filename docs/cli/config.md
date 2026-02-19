---
summary: "CLI reference for `woodls config` (get/set/unset config values)"
read_when:
  - You want to read or edit config non-interactively
title: "config"
---

# `woodls config`

Config helpers: get/set/unset values by path. Run without a subcommand to open
the configure wizard (same as `woodls configure`).

## Examples

```bash
woodls config get browser.executablePath
woodls config set browser.executablePath "/usr/bin/google-chrome"
woodls config set agents.defaults.heartbeat.every "2h"
woodls config set agents.list[0].tools.exec.node "node-id-or-name"
woodls config unset tools.web.search.apiKey
```

## Paths

Paths use dot or bracket notation:

```bash
woodls config get agents.defaults.workspace
woodls config get agents.list[0].id
```

Use the agent list index to target a specific agent:

```bash
woodls config get agents.list
woodls config set agents.list[1].tools.exec.node "node-id-or-name"
```

## Values

Values are parsed as JSON5 when possible; otherwise they are treated as strings.
Use `--json` to require JSON5 parsing.

```bash
woodls config set agents.defaults.heartbeat.every "0m"
woodls config set gateway.port 19001 --json
woodls config set channels.whatsapp.groups '["*"]' --json
```

Restart the gateway after edits.
