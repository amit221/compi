#!/usr/bin/env bash
# scripts/cursor-install.sh
#
# Install the Compi plugin into Cursor's local plugin directory for testing.
# Run after `npm run build`. Restart Cursor after running this script.
#
# Usage: bash scripts/cursor-install.sh

set -euo pipefail

PLUGIN_NAME="compi"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Determine Cursor plugin directory (cross-platform)
if [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" || "$OSTYPE" == "win32" ]]; then
  CURSOR_PLUGINS="$USERPROFILE/.cursor/plugins"
  CLAUDE_DIR="$USERPROFILE/.claude"
else
  CURSOR_PLUGINS="$HOME/.cursor/plugins"
  CLAUDE_DIR="$HOME/.claude"
fi

INSTALL_DIR="$CURSOR_PLUGINS/$PLUGIN_NAME"

echo "=== Compi Cursor Plugin Installer ==="
echo ""
echo "Source:  $REPO_ROOT"
echo "Target:  $INSTALL_DIR"
echo ""

# 1. Check dist/ exists
if [ ! -f "$REPO_ROOT/dist/cli.js" ]; then
  echo "ERROR: dist/ not found. Run 'npm run build' first."
  exit 1
fi

# 2. Clean previous install
if [ -d "$INSTALL_DIR" ]; then
  echo "Removing previous install..."
  rm -rf "$INSTALL_DIR"
fi

# 3. Create target directory
mkdir -p "$INSTALL_DIR"

# 4. Copy plugin files
echo "Copying plugin files..."
cp -r "$REPO_ROOT/.cursor-plugin" "$INSTALL_DIR/.cursor-plugin"
cp -r "$REPO_ROOT/cursor-skills" "$INSTALL_DIR/cursor-skills"
cp -r "$REPO_ROOT/hooks" "$INSTALL_DIR/hooks"
cp -r "$REPO_ROOT/scripts" "$INSTALL_DIR/scripts"
cp -r "$REPO_ROOT/dist" "$INSTALL_DIR/dist"
cp -r "$REPO_ROOT/config" "$INSTALL_DIR/config"
cp "$REPO_ROOT/package.json" "$INSTALL_DIR/package.json"

# 5. Copy node_modules (needed for MCP server runtime deps)
if [ -d "$REPO_ROOT/node_modules" ]; then
  echo "Copying node_modules..."
  cp -r "$REPO_ROOT/node_modules" "$INSTALL_DIR/node_modules"
fi

# 6. Register plugin in installed_plugins.json
PLUGINS_JSON="$CLAUDE_DIR/plugins/installed_plugins.json"
mkdir -p "$(dirname "$PLUGINS_JSON")"

INSTALL_PATH_ESCAPED=$(echo "$INSTALL_DIR" | sed 's/\\/\\\\/g')

if [ -f "$PLUGINS_JSON" ]; then
  # Upsert the plugin entry using node
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$PLUGINS_JSON', 'utf8'));
    if (!data.plugins) data.plugins = {};
    data.plugins['${PLUGIN_NAME}@local'] = [{ scope: 'user', installPath: '$INSTALL_PATH_ESCAPED' }];
    fs.writeFileSync('$PLUGINS_JSON', JSON.stringify(data, null, 2));
    console.log('Updated $PLUGINS_JSON');
  "
else
  node -e "
    const fs = require('fs');
    const data = { plugins: { '${PLUGIN_NAME}@local': [{ scope: 'user', installPath: '$INSTALL_PATH_ESCAPED' }] } };
    fs.writeFileSync('$PLUGINS_JSON', JSON.stringify(data, null, 2));
    console.log('Created $PLUGINS_JSON');
  "
fi

# 7. Enable plugin in settings.json
SETTINGS_JSON="$CLAUDE_DIR/settings.json"

if [ -f "$SETTINGS_JSON" ]; then
  node -e "
    const fs = require('fs');
    const data = JSON.parse(fs.readFileSync('$SETTINGS_JSON', 'utf8'));
    if (!data.enabledPlugins) data.enabledPlugins = {};
    data.enabledPlugins['${PLUGIN_NAME}@local'] = true;
    fs.writeFileSync('$SETTINGS_JSON', JSON.stringify(data, null, 2));
    console.log('Updated $SETTINGS_JSON');
  "
else
  node -e "
    const fs = require('fs');
    const data = { enabledPlugins: { '${PLUGIN_NAME}@local': true } };
    fs.writeFileSync('$SETTINGS_JSON', JSON.stringify(data, null, 2));
    console.log('Created $SETTINGS_JSON');
  "
fi

echo ""
echo "Done! Restart Cursor to load the plugin."
echo "Check Settings > Plugins to verify it appears."
