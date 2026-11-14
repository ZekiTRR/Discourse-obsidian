#!/usr/bin/env bash
set -euo pipefail

REPO="ZekiTRR/Discourse-obsidian"
RELEASE_BASE="https://github.com/${REPO}/releases/latest/download"
VAULT="${1:-$(pwd)}"

if [[ ! -d "$VAULT/.obsidian" ]]; then
  echo "Vault not found: $VAULT"
  read -r -p "Path to vault (the folder containing .obsidian): " VAULT
fi

if [[ ! -d "$VAULT/.obsidian" ]]; then
  echo "Vault not found: $VAULT" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required." >&2
  exit 1
fi
if ! command -v unzip >/dev/null 2>&1; then
  echo "unzip is required." >&2
  exit 1
fi

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

THEME_URL=""
PLUGIN_URL=""
LATEST_JSON="$TMP/latest.json"

if curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" \
    -H "User-Agent: neverlose-installer" \
    -H "Accept: application/vnd.github+json" \
    -o "$LATEST_JSON" 2>/dev/null; then
  if command -v python3 >/dev/null 2>&1; then
    eval "$(python3 - "$LATEST_JSON" <<'PY'
import json
import sys

with open(sys.argv[1], "r", encoding="utf-8") as handle:
    release = json.load(handle)
assets = {asset.get("name"): asset.get("browser_download_url") for asset in release.get("assets", [])}
print(f'THEME_URL="{assets.get("Neverlose.zip", "")}"')
print(f'PLUGIN_URL="{assets.get("neverlose-theme-settings.zip", "")}"')
PY
)"
  fi
fi

THEME_URL="${THEME_URL:-$RELEASE_BASE/Neverlose.zip}"
PLUGIN_URL="${PLUGIN_URL:-$RELEASE_BASE/neverlose-theme-settings.zip}"

echo "Downloading Neverlose..."
curl -fsSL "$THEME_URL" -o "$TMP/Neverlose.zip"
curl -fsSL "$PLUGIN_URL" -o "$TMP/neverlose-theme-settings.zip"

unzip -q "$TMP/Neverlose.zip" -d "$TMP/theme"
unzip -q "$TMP/neverlose-theme-settings.zip" -d "$TMP/plugin"

THEME_SRC="$TMP/theme/Neverlose"
PLUGIN_SRC="$TMP/plugin/neverlose-theme-settings"
THEME_DST="$VAULT/.obsidian/themes/Neverlose"
PLUGIN_DST="$VAULT/.obsidian/plugins/neverlose-theme-settings"

[[ -f "$THEME_SRC/theme.css" ]] || { echo "theme.css not found in archive" >&2; exit 1; }
[[ -f "$PLUGIN_SRC/main.js" ]] || { echo "main.js not found in archive" >&2; exit 1; }

mkdir -p "$THEME_DST" "$PLUGIN_DST"
cp -R "$THEME_SRC/." "$THEME_DST/"
cp -R "$PLUGIN_SRC/." "$PLUGIN_DST/"

if command -v python3 >/dev/null 2>&1; then
  python3 - "$VAULT/.obsidian" <<'PY'
import json
import os
import sys

obs = sys.argv[1]
plugin_id = "neverlose-theme-settings"


def load(path, fallback):
    try:
        with open(path, "r", encoding="utf-8") as handle:
            return json.load(handle)
    except Exception:
        return fallback


community_path = os.path.join(obs, "community-plugins.json")
plugins = load(community_path, [])
if not isinstance(plugins, list):
    plugins = []
if plugin_id not in plugins:
    plugins.append(plugin_id)
with open(community_path, "w", encoding="utf-8") as handle:
    json.dump(plugins, handle, ensure_ascii=False, indent=2)
    handle.write("\n")

appearance_path = os.path.join(obs, "appearance.json")
appearance = load(appearance_path, {})
if not isinstance(appearance, dict):
    appearance = {}
appearance["cssTheme"] = "Neverlose"
with open(appearance_path, "w", encoding="utf-8") as handle:
    json.dump(appearance, handle, ensure_ascii=False, indent=2)
    handle.write("\n")
PY
else
  echo "python3 not found: enable the plugin and select the theme manually."
fi

echo
echo "Done."
echo "Theme:  $THEME_DST"
echo "Plugin: $PLUGIN_DST"
echo
echo "Restart Obsidian, then check:"
echo "  Settings -> Appearance -> Themes -> Neverlose"
echo "  Settings -> Community plugins -> Neverlose Theme Settings"
