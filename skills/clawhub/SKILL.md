---
name: woodlshub
description: Use the WoodlsHub CLI to search, install, update, and publish agent skills from woodlshub.com. Use when you need to fetch new skills on the fly, sync installed skills to latest or a specific version, or publish new/updated skill folders with the npm-installed woodlshub CLI.
metadata:
  {
    "woodls":
      {
        "requires": { "bins": ["woodlshub"] },
        "install":
          [
            {
              "id": "node",
              "kind": "node",
              "package": "woodlshub",
              "bins": ["woodlshub"],
              "label": "Install WoodlsHub CLI (npm)",
            },
          ],
      },
  }
---

# WoodlsHub CLI

Install

```bash
npm i -g woodlshub
```

Auth (publish)

```bash
woodlshub login
woodlshub whoami
```

Search

```bash
woodlshub search "postgres backups"
```

Install

```bash
woodlshub install my-skill
woodlshub install my-skill --version 1.2.3
```

Update (hash-based match + upgrade)

```bash
woodlshub update my-skill
woodlshub update my-skill --version 1.2.3
woodlshub update --all
woodlshub update my-skill --force
woodlshub update --all --no-input --force
```

List

```bash
woodlshub list
```

Publish

```bash
woodlshub publish ./my-skill --slug my-skill --name "My Skill" --version 1.2.0 --changelog "Fixes + docs"
```

Notes

- Default registry: https://woodlshub.com (override with WOODLSHUB_REGISTRY or --registry)
- Default workdir: cwd (falls back to Woodls workspace); install dir: ./skills (override with --workdir / --dir / WOODLSHUB_WORKDIR)
- Update command hashes local files, resolves matching version, and upgrades to latest unless --version is set
