# WoodlsDock <!-- omit in toc -->

Stop typing `docker-compose` commands. Just type `woodlsdock-start`.

Inspired by Simon Willison's [Running Woodls in Docker](https://til.simonwillison.net/llms/woodls-docker).

- [Quickstart](#quickstart)
- [Available Commands](#available-commands)
  - [Basic Operations](#basic-operations)
  - [Container Access](#container-access)
  - [Web UI \& Devices](#web-ui--devices)
  - [Setup \& Configuration](#setup--configuration)
  - [Maintenance](#maintenance)
  - [Utilities](#utilities)
- [Common Workflows](#common-workflows)
  - [Check Status and Logs](#check-status-and-logs)
  - [Set Up WhatsApp Bot](#set-up-whatsapp-bot)
  - [Troubleshooting Device Pairing](#troubleshooting-device-pairing)
  - [Fix Token Mismatch Issues](#fix-token-mismatch-issues)
  - [Permission Denied](#permission-denied)
- [Requirements](#requirements)

## Quickstart

**Install:**

```bash
mkdir -p ~/.woodlsdock && curl -sL https://raw.githubusercontent.com/woodls/woodls/main/scripts/shell-helpers/woodlsdock-helpers.sh -o ~/.woodlsdock/woodlsdock-helpers.sh
```

```bash
echo 'source ~/.woodlsdock/woodlsdock-helpers.sh' >> ~/.zshrc && source ~/.zshrc
```

**See what you get:**

```bash
woodlsdock-help
```

On first command, WoodlsDock auto-detects your Woodls directory:

- Checks common paths (`~/woodls`, `~/workspace/woodls`, etc.)
- If found, asks you to confirm
- Saves to `~/.woodlsdock/config`

**First time setup:**

```bash
woodlsdock-start
```

```bash
woodlsdock-fix-token
```

```bash
woodlsdock-dashboard
```

If you see "pairing required":

```bash
woodlsdock-devices
```

And approve the request for the specific device:

```bash
woodlsdock-approve <request-id>
```

## Available Commands

### Basic Operations

| Command              | Description                     |
| -------------------- | ------------------------------- |
| `woodlsdock-start`   | Start the gateway               |
| `woodlsdock-stop`    | Stop the gateway                |
| `woodlsdock-restart` | Restart the gateway             |
| `woodlsdock-status`  | Check container status          |
| `woodlsdock-logs`    | View live logs (follows output) |

### Container Access

| Command                     | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `woodlsdock-shell`          | Interactive shell inside the gateway container |
| `woodlsdock-cli <command>`  | Run Woodls CLI commands                        |
| `woodlsdock-exec <command>` | Execute arbitrary commands in the container    |

### Web UI & Devices

| Command                   | Description                                |
| ------------------------- | ------------------------------------------ |
| `woodlsdock-dashboard`    | Open web UI in browser with authentication |
| `woodlsdock-devices`      | List device pairing requests               |
| `woodlsdock-approve <id>` | Approve a device pairing request           |

### Setup & Configuration

| Command                | Description                                       |
| ---------------------- | ------------------------------------------------- |
| `woodlsdock-fix-token` | Configure gateway authentication token (run once) |

### Maintenance

| Command              | Description                                      |
| -------------------- | ------------------------------------------------ |
| `woodlsdock-rebuild` | Rebuild the Docker image                         |
| `woodlsdock-clean`   | Remove all containers and volumes (destructive!) |

### Utilities

| Command                | Description                               |
| ---------------------- | ----------------------------------------- |
| `woodlsdock-health`    | Run gateway health check                  |
| `woodlsdock-token`     | Display the gateway authentication token  |
| `woodlsdock-cd`        | Jump to the Woodls project directory      |
| `woodlsdock-config`    | Open the Woodls config directory          |
| `woodlsdock-workspace` | Open the workspace directory              |
| `woodlsdock-help`      | Show all available commands with examples |

## Common Workflows

### Check Status and Logs

**Restart the gateway:**

```bash
woodlsdock-restart
```

**Check container status:**

```bash
woodlsdock-status
```

**View live logs:**

```bash
woodlsdock-logs
```

### Set Up WhatsApp Bot

**Shell into the container:**

```bash
woodlsdock-shell
```

**Inside the container, login to WhatsApp:**

```bash
woodls channels login --channel whatsapp --verbose
```

Scan the QR code with WhatsApp on your phone.

**Verify connection:**

```bash
woodls status
```

### Troubleshooting Device Pairing

**Check for pending pairing requests:**

```bash
woodlsdock-devices
```

**Copy the Request ID from the "Pending" table, then approve:**

```bash
woodlsdock-approve <request-id>
```

Then refresh your browser.

### Fix Token Mismatch Issues

If you see "gateway token mismatch" errors:

```bash
woodlsdock-fix-token
```

This will:

1. Read the token from your `.env` file
2. Configure it in the Woodls config
3. Restart the gateway
4. Verify the configuration

### Permission Denied

**Ensure Docker is running and you have permission:**

```bash
docker ps
```

## Requirements

- Docker and Docker Compose installed
- Bash or Zsh shell
- Woodls project (from `docker-setup.sh`)

## Development

**Test with fresh config (mimics first-time install):**

```bash
unset WOODLSDOCK_DIR && rm -f ~/.woodlsdock/config && source scripts/shell-helpers/woodlsdock-helpers.sh
```

Then run any command to trigger auto-detect:

```bash
woodlsdock-start
```
