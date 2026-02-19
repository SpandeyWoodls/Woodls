---
summary: "CLI reference for `woodls reset` (reset local state/config)"
read_when:
  - You want to wipe local state while keeping the CLI installed
  - You want a dry-run of what would be removed
title: "reset"
---

# `woodls reset`

Reset local config/state (keeps the CLI installed).

```bash
woodls reset
woodls reset --dry-run
woodls reset --scope config+creds+sessions --yes --non-interactive
```
