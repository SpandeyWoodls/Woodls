---
summary: "Uninstall Woodls completely (CLI, service, state, workspace)"
read_when:
  - You want to remove Woodls from a machine
  - The gateway service is still running after uninstall
title: "Uninstall"
---

# Uninstall

Two paths:

- **Easy path** if `woodls` is still installed.
- **Manual service removal** if the CLI is gone but the service is still running.

## Easy path (CLI still installed)

Recommended: use the built-in uninstaller:

```bash
woodls uninstall
```

Non-interactive (automation / npx):

```bash
woodls uninstall --all --yes --non-interactive
npx -y woodls uninstall --all --yes --non-interactive
```

Manual steps (same result):

1. Stop the gateway service:

```bash
woodls gateway stop
```

2. Uninstall the gateway service (launchd/systemd/schtasks):

```bash
woodls gateway uninstall
```

3. Delete state + config:

```bash
rm -rf "${WOODLS_STATE_DIR:-$HOME/.woodls}"
```

If you set `WOODLS_CONFIG_PATH` to a custom location outside the state dir, delete that file too.

4. Delete your workspace (optional, removes agent files):

```bash
rm -rf ~/.woodls/workspace
```

5. Remove the CLI install (pick the one you used):

```bash
npm rm -g woodls
pnpm remove -g woodls
bun remove -g woodls
```

6. If you installed the macOS app:

```bash
rm -rf /Applications/Woodls.app
```

Notes:

- If you used profiles (`--profile` / `WOODLS_PROFILE`), repeat step 3 for each state dir (defaults are `~/.woodls-<profile>`).
- In remote mode, the state dir lives on the **gateway host**, so run steps 1-4 there too.

## Manual service removal (CLI not installed)

Use this if the gateway service keeps running but `woodls` is missing.

### macOS (launchd)

Default label is `bot.molt.gateway` (or `bot.molt.<profile>`; legacy `com.woodls.*` may still exist):

```bash
launchctl bootout gui/$UID/bot.molt.gateway
rm -f ~/Library/LaunchAgents/bot.molt.gateway.plist
```

If you used a profile, replace the label and plist name with `bot.molt.<profile>`. Remove any legacy `com.woodls.*` plists if present.

### Linux (systemd user unit)

Default unit name is `woodls-gateway.service` (or `woodls-gateway-<profile>.service`):

```bash
systemctl --user disable --now woodls-gateway.service
rm -f ~/.config/systemd/user/woodls-gateway.service
systemctl --user daemon-reload
```

### Windows (Scheduled Task)

Default task name is `Woodls Gateway` (or `Woodls Gateway (<profile>)`).
The task script lives under your state dir.

```powershell
schtasks /Delete /F /TN "Woodls Gateway"
Remove-Item -Force "$env:USERPROFILE\.woodls\gateway.cmd"
```

If you used a profile, delete the matching task name and `~\.woodls-<profile>\gateway.cmd`.

## Normal install vs source checkout

### Normal install (install.sh / npm / pnpm / bun)

If you used `https://woodls.ai/install.sh` or `install.ps1`, the CLI was installed with `npm install -g woodls@latest`.
Remove it with `npm rm -g woodls` (or `pnpm remove -g` / `bun remove -g` if you installed that way).

### Source checkout (git clone)

If you run from a repo checkout (`git clone` + `woodls ...` / `bun run woodls ...`):

1. Uninstall the gateway service **before** deleting the repo (use the easy path above or manual service removal).
2. Delete the repo directory.
3. Remove state + workspace as shown above.
