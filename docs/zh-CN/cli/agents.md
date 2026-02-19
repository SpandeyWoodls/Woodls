---
read_when:
  - 你需要多个隔离的智能体（工作区 + 路由 + 认证）
summary: "`woodls agents` 的 CLI 参考（列出/添加/删除/设置身份）"
title: agents
x-i18n:
  generated_at: "2026-02-01T19:58:38Z"
  model: claude-opus-4-5
  provider: pi
  source_hash: 30556d81636a9ad8972573cc6b498e620fd266e1dfb16eef3f61096ea62f9896
  source_path: cli/agents.md
  workflow: 14
---

# `woodls agents`

管理隔离的智能体（工作区 + 认证 + 路由）。

相关内容：

- 多智能体路由：[多智能体路由](/concepts/multi-agent)
- 智能体工作区：[智能体工作区](/concepts/agent-workspace)

## 示例

```bash
woodls agents list
woodls agents add work --workspace ~/.woodls/workspace-work
woodls agents set-identity --workspace ~/.woodls/workspace --from-identity
woodls agents set-identity --agent main --avatar avatars/woodls.png
woodls agents delete work
```

## 身份文件

每个智能体工作区可以在工作区根目录包含一个 `IDENTITY.md`：

- 示例路径：`~/.woodls/workspace/IDENTITY.md`
- `set-identity --from-identity` 从工作区根目录读取（或从显式指定的 `--identity-file` 读取）

头像路径相对于工作区根目录解析。

## 设置身份

`set-identity` 将字段写入 `agents.list[].identity`：

- `name`
- `theme`
- `emoji`
- `avatar`（工作区相对路径、http(s) URL 或 data URI）

从 `IDENTITY.md` 加载：

```bash
woodls agents set-identity --workspace ~/.woodls/workspace --from-identity
```

显式覆盖字段：

```bash
woodls agents set-identity --agent main --name "Woodls" --emoji "🦞" --avatar avatars/woodls.png
```

配置示例：

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
