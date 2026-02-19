---
summary: "CLI reference for `woodls agents` (list/add/delete/set identity)"
read_when:
  - You want multiple isolated agents (workspaces + routing + auth)
title: "agents"
---

# `woodls agents`

Manage isolated agents (workspaces + auth + routing).

Related:

- Multi-agent routing: [Multi-Agent Routing](/concepts/multi-agent)
- Agent workspace: [Agent workspace](/concepts/agent-workspace)

## Examples

```bash
woodls agents list
woodls agents add work --workspace ~/.woodls/workspace-work
woodls agents set-identity --workspace ~/.woodls/workspace --from-identity
woodls agents set-identity --agent main --avatar avatars/woodls.png
woodls agents delete work
```

## Identity files

Each agent workspace can include an `IDENTITY.md` at the workspace root:

- Example path: `~/.woodls/workspace/IDENTITY.md`
- `set-identity --from-identity` reads from the workspace root (or an explicit `--identity-file`)

Avatar paths resolve relative to the workspace root.

## Set identity

`set-identity` writes fields into `agents.list[].identity`:

- `name`
- `theme`
- `emoji`
- `avatar` (workspace-relative path, http(s) URL, or data URI)

Load from `IDENTITY.md`:

```bash
woodls agents set-identity --workspace ~/.woodls/workspace --from-identity
```

Override fields explicitly:

```bash
woodls agents set-identity --agent main --name "Woodls" --emoji "🦞" --avatar avatars/woodls.png
```

Config sample:

```json5
{
  agents: {
    list: [
      {
        id: "main",
        identity: {
          name: "Woodls",
          theme: "space lobster",
          emoji: "🦞",
          avatar: "avatars/woodls.png",
        },
      },
    ],
  },
}
```
