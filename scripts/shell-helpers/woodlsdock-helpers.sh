#!/usr/bin/env bash
# WoodlsDock - Docker helpers for Woodls
# Inspired by Simon Willison's "Running Woodls in Docker"
# https://til.simonwillison.net/llms/woodls-docker
#
# Installation:
#   mkdir -p ~/.woodlsdock && curl -sL https://raw.githubusercontent.com/woodls/woodls/main/scripts/shell-helpers/woodlsdock-helpers.sh -o ~/.woodlsdock/woodlsdock-helpers.sh
#   echo 'source ~/.woodlsdock/woodlsdock-helpers.sh' >> ~/.zshrc
#
# Usage:
#   woodlsdock-help    # Show all available commands

# =============================================================================
# Colors
# =============================================================================
_CLR_RESET='\033[0m'
_CLR_BOLD='\033[1m'
_CLR_DIM='\033[2m'
_CLR_GREEN='\033[0;32m'
_CLR_YELLOW='\033[1;33m'
_CLR_BLUE='\033[0;34m'
_CLR_MAGENTA='\033[0;35m'
_CLR_CYAN='\033[0;36m'
_CLR_RED='\033[0;31m'

# Styled command output (green + bold)
_clr_cmd() {
  echo -e "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# Inline command for use in sentences
_cmd() {
  echo "${_CLR_GREEN}${_CLR_BOLD}$1${_CLR_RESET}"
}

# =============================================================================
# Config
# =============================================================================
WOODLSDOCK_CONFIG="${HOME}/.woodlsdock/config"

# Common paths to check for Woodls
WOODLSDOCK_COMMON_PATHS=(
  "${HOME}/woodls"
  "${HOME}/workspace/woodls"
  "${HOME}/projects/woodls"
  "${HOME}/dev/woodls"
  "${HOME}/code/woodls"
  "${HOME}/src/woodls"
)

_woodlsdock_filter_warnings() {
  grep -v "^WARN\|^time="
}

_woodlsdock_trim_quotes() {
  local value="$1"
  value="${value#\"}"
  value="${value%\"}"
  printf "%s" "$value"
}

_woodlsdock_read_config_dir() {
  if [[ ! -f "$WOODLSDOCK_CONFIG" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^WOODLSDOCK_DIR=//p' "$WOODLSDOCK_CONFIG" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _woodlsdock_trim_quotes "$raw"
}

# Ensure WOODLSDOCK_DIR is set and valid
_woodlsdock_ensure_dir() {
  # Already set and valid?
  if [[ -n "$WOODLSDOCK_DIR" && -f "${WOODLSDOCK_DIR}/docker-compose.yml" ]]; then
    return 0
  fi

  # Try loading from config
  local config_dir
  config_dir=$(_woodlsdock_read_config_dir)
  if [[ -n "$config_dir" && -f "${config_dir}/docker-compose.yml" ]]; then
    WOODLSDOCK_DIR="$config_dir"
    return 0
  fi

  # Auto-detect from common paths
  local found_path=""
  for path in "${WOODLSDOCK_COMMON_PATHS[@]}"; do
    if [[ -f "${path}/docker-compose.yml" ]]; then
      found_path="$path"
      break
    fi
  done

  if [[ -n "$found_path" ]]; then
    echo ""
    echo "🦞 Found Woodls at: $found_path"
    echo -n "   Use this location? [Y/n] "
    read -r response
    if [[ "$response" =~ ^[Nn] ]]; then
      echo ""
      echo "Set WOODLSDOCK_DIR manually:"
      echo "  export WOODLSDOCK_DIR=/path/to/woodls"
      return 1
    fi
    WOODLSDOCK_DIR="$found_path"
  else
    echo ""
    echo "❌ Woodls not found in common locations."
    echo ""
    echo "Clone it first:"
    echo ""
    echo "  git clone https://github.com/woodls/woodls.git ~/woodls"
    echo "  cd ~/woodls && ./docker-setup.sh"
    echo ""
    echo "Or set WOODLSDOCK_DIR if it's elsewhere:"
    echo ""
    echo "  export WOODLSDOCK_DIR=/path/to/woodls"
    echo ""
    return 1
  fi

  # Save to config
  if [[ ! -d "${HOME}/.woodlsdock" ]]; then
    /bin/mkdir -p "${HOME}/.woodlsdock"
  fi
  echo "WOODLSDOCK_DIR=\"$WOODLSDOCK_DIR\"" > "$WOODLSDOCK_CONFIG"
  echo "✅ Saved to $WOODLSDOCK_CONFIG"
  echo ""
  return 0
}

# Wrapper to run docker compose commands
_woodlsdock_compose() {
  _woodlsdock_ensure_dir || return 1
  command docker compose -f "${WOODLSDOCK_DIR}/docker-compose.yml" "$@"
}

_woodlsdock_read_env_token() {
  _woodlsdock_ensure_dir || return 1
  if [[ ! -f "${WOODLSDOCK_DIR}/.env" ]]; then
    return 1
  fi
  local raw
  raw=$(sed -n 's/^WOODLS_GATEWAY_TOKEN=//p' "${WOODLSDOCK_DIR}/.env" | head -n 1)
  if [[ -z "$raw" ]]; then
    return 1
  fi
  _woodlsdock_trim_quotes "$raw"
}

# Basic Operations
woodlsdock-start() {
  _woodlsdock_compose up -d woodls-gateway
}

woodlsdock-stop() {
  _woodlsdock_compose down
}

woodlsdock-restart() {
  _woodlsdock_compose restart woodls-gateway
}

woodlsdock-logs() {
  _woodlsdock_compose logs -f woodls-gateway
}

woodlsdock-status() {
  _woodlsdock_compose ps
}

# Navigation
woodlsdock-cd() {
  _woodlsdock_ensure_dir || return 1
  cd "${WOODLSDOCK_DIR}"
}

woodlsdock-config() {
  cd ~/.woodls
}

woodlsdock-workspace() {
  cd ~/.woodls/workspace
}

# Container Access
woodlsdock-shell() {
  _woodlsdock_compose exec woodls-gateway \
    bash -c 'echo "alias woodls=\"./woodls.mjs\"" > /tmp/.bashrc_woodls && bash --rcfile /tmp/.bashrc_woodls'
}

woodlsdock-exec() {
  _woodlsdock_compose exec woodls-gateway "$@"
}

woodlsdock-cli() {
  _woodlsdock_compose run --rm woodls-cli "$@"
}

# Maintenance
woodlsdock-rebuild() {
  _woodlsdock_compose build woodls-gateway
}

woodlsdock-clean() {
  _woodlsdock_compose down -v --remove-orphans
}

# Health check
woodlsdock-health() {
  _woodlsdock_ensure_dir || return 1
  local token
  token=$(_woodlsdock_read_env_token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${WOODLSDOCK_DIR}/.env"
    return 1
  fi
  _woodlsdock_compose exec -e "WOODLS_GATEWAY_TOKEN=$token" woodls-gateway \
    node dist/index.js health
}

# Show gateway token
woodlsdock-token() {
  _woodlsdock_read_env_token
}

# Fix token configuration (run this once after setup)
woodlsdock-fix-token() {
  _woodlsdock_ensure_dir || return 1

  echo "🔧 Configuring gateway token..."
  local token
  token=$(woodlsdock-token)
  if [[ -z "$token" ]]; then
    echo "❌ Error: Could not find gateway token"
    echo "   Check: ${WOODLSDOCK_DIR}/.env"
    return 1
  fi

  echo "📝 Setting token: ${token:0:20}..."

  _woodlsdock_compose exec -e "TOKEN=$token" woodls-gateway \
    bash -c './woodls.mjs config set gateway.remote.token "$TOKEN" && ./woodls.mjs config set gateway.auth.token "$TOKEN"' 2>&1 | _woodlsdock_filter_warnings

  echo "🔍 Verifying token was saved..."
  local saved_token
  saved_token=$(_woodlsdock_compose exec woodls-gateway \
    bash -c "./woodls.mjs config get gateway.remote.token 2>/dev/null" 2>&1 | _woodlsdock_filter_warnings | tr -d '\r\n' | head -c 64)

  if [[ "$saved_token" == "$token" ]]; then
    echo "✅ Token saved correctly!"
  else
    echo "⚠️  Token mismatch detected"
    echo "   Expected: ${token:0:20}..."
    echo "   Got: ${saved_token:0:20}..."
  fi

  echo "🔄 Restarting gateway..."
  _woodlsdock_compose restart woodls-gateway 2>&1 | _woodlsdock_filter_warnings

  echo "⏳ Waiting for gateway to start..."
  sleep 5

  echo "✅ Configuration complete!"
  echo -e "   Try: $(_cmd woodlsdock-devices)"
}

# Open dashboard in browser
woodlsdock-dashboard() {
  _woodlsdock_ensure_dir || return 1

  echo "🦞 Getting dashboard URL..."
  local output exit_status url
  output=$(_woodlsdock_compose run --rm woodls-cli dashboard --no-open 2>&1)
  exit_status=$?
  url=$(printf "%s\n" "$output" | _woodlsdock_filter_warnings | grep -o 'http[s]\?://[^[:space:]]*' | head -n 1)
  if [[ $exit_status -ne 0 ]]; then
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd woodlsdock-restart)"
    return 1
  fi

  if [[ -n "$url" ]]; then
    echo "✅ Opening: $url"
    open "$url" 2>/dev/null || xdg-open "$url" 2>/dev/null || echo "   Please open manually: $url"
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see 'pairing required' error:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd woodlsdock-devices)"
    echo "   2. Copy the Request ID from the Pending table"
    echo -e "   3. Run: $(_cmd 'woodlsdock-approve <request-id>')"
  else
    echo "❌ Failed to get dashboard URL"
    echo -e "   Try restarting: $(_cmd woodlsdock-restart)"
  fi
}

# List device pairings
woodlsdock-devices() {
  _woodlsdock_ensure_dir || return 1

  echo "🔍 Checking device pairings..."
  local output exit_status
  output=$(_woodlsdock_compose exec woodls-gateway node dist/index.js devices list 2>&1)
  exit_status=$?
  printf "%s\n" "$output" | _woodlsdock_filter_warnings
  if [ $exit_status -ne 0 ]; then
    echo ""
    echo -e "${_CLR_CYAN}💡 If you see token errors above:${_CLR_RESET}"
    echo -e "   1. Verify token is set: $(_cmd woodlsdock-token)"
    echo "   2. Try manual config inside container:"
    echo -e "      $(_cmd woodlsdock-shell)"
    echo -e "      $(_cmd 'woodls config get gateway.remote.token')"
    return 1
  fi

  echo ""
  echo -e "${_CLR_CYAN}💡 To approve a pairing request:${_CLR_RESET}"
  echo -e "   $(_cmd 'woodlsdock-approve <request-id>')"
}

# Approve device pairing request
woodlsdock-approve() {
  _woodlsdock_ensure_dir || return 1

  if [[ -z "$1" ]]; then
    echo -e "❌ Usage: $(_cmd 'woodlsdock-approve <request-id>')"
    echo ""
    echo -e "${_CLR_CYAN}💡 How to approve a device:${_CLR_RESET}"
    echo -e "   1. Run: $(_cmd woodlsdock-devices)"
    echo "   2. Find the Request ID in the Pending table (long UUID)"
    echo -e "   3. Run: $(_cmd 'woodlsdock-approve <that-request-id>')"
    echo ""
    echo "Example:"
    echo -e "   $(_cmd 'woodlsdock-approve 6f9db1bd-a1cc-4d3f-b643-2c195262464e')"
    return 1
  fi

  echo "✅ Approving device: $1"
  _woodlsdock_compose exec woodls-gateway \
    node dist/index.js devices approve "$1" 2>&1 | _woodlsdock_filter_warnings

  echo ""
  echo "✅ Device approved! Refresh your browser."
}

# Show all available woodlsdock helper commands
woodlsdock-help() {
  echo -e "\n${_CLR_BOLD}${_CLR_CYAN}🦞 WoodlsDock - Docker Helpers for Woodls${_CLR_RESET}\n"

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚡ Basic Operations${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-start)       ${_CLR_DIM}Start the gateway${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-stop)        ${_CLR_DIM}Stop the gateway${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-restart)     ${_CLR_DIM}Restart the gateway${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-status)      ${_CLR_DIM}Check container status${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-logs)        ${_CLR_DIM}View live logs (follows)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🐚 Container Access${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-shell)       ${_CLR_DIM}Shell into container (woodls alias ready)${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-cli)         ${_CLR_DIM}Run CLI commands (e.g., woodlsdock-cli status)${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-exec) ${_CLR_CYAN}<cmd>${_CLR_RESET}  ${_CLR_DIM}Execute command in gateway container${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🌐 Web UI & Devices${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-dashboard)   ${_CLR_DIM}Open web UI in browser ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-devices)     ${_CLR_DIM}List device pairings ${_CLR_CYAN}(auto-guides you)${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-approve) ${_CLR_CYAN}<id>${_CLR_RESET} ${_CLR_DIM}Approve device pairing ${_CLR_CYAN}(with examples)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}⚙️  Setup & Configuration${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-fix-token)   ${_CLR_DIM}Configure gateway token ${_CLR_CYAN}(run once)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🔧 Maintenance${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-rebuild)     ${_CLR_DIM}Rebuild Docker image${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-clean)       ${_CLR_RED}⚠️  Remove containers & volumes (nuclear)${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_MAGENTA}🛠️  Utilities${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-health)      ${_CLR_DIM}Run health check${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-token)       ${_CLR_DIM}Show gateway auth token${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-cd)          ${_CLR_DIM}Jump to woodls project directory${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-config)      ${_CLR_DIM}Open config directory (~/.woodls)${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-workspace)   ${_CLR_DIM}Open workspace directory${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo -e "${_CLR_BOLD}${_CLR_GREEN}🚀 First Time Setup${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  1.${_CLR_RESET} $(_cmd woodlsdock-start)          ${_CLR_DIM}# Start the gateway${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  2.${_CLR_RESET} $(_cmd woodlsdock-fix-token)      ${_CLR_DIM}# Configure token${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  3.${_CLR_RESET} $(_cmd woodlsdock-dashboard)      ${_CLR_DIM}# Open web UI${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  4.${_CLR_RESET} $(_cmd woodlsdock-devices)        ${_CLR_DIM}# If pairing needed${_CLR_RESET}"
  echo -e "${_CLR_CYAN}  5.${_CLR_RESET} $(_cmd woodlsdock-approve) ${_CLR_CYAN}<id>${_CLR_RESET}   ${_CLR_DIM}# Approve pairing${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_GREEN}💬 WhatsApp Setup${_CLR_RESET}"
  echo -e "  $(_cmd woodlsdock-shell)"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'woodls channels login --channel whatsapp')"
  echo -e "    ${_CLR_BLUE}>${_CLR_RESET} $(_cmd 'woodls status')"
  echo ""

  echo -e "${_CLR_BOLD}${_CLR_CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${_CLR_RESET}"
  echo ""

  echo -e "${_CLR_CYAN}💡 All commands guide you through next steps!${_CLR_RESET}"
  echo -e "${_CLR_BLUE}📚 Docs: ${_CLR_RESET}${_CLR_CYAN}https://docs.woodls.ai${_CLR_RESET}"
  echo ""
}
