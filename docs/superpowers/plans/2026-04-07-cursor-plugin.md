# Cursor Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Cursor IDE plugin support alongside the existing Claude Code plugin, sharing the same game engine and MCP server.

**Architecture:** Parallel platform adapter files (`.cursor-plugin/`, `hooks/cursor-hooks.json`, `cursor-skills/`) sit alongside existing Claude Code files. The engine, state, config, renderers, and MCP server are unchanged. A dev install script copies the plugin to Cursor's local plugin directory for testing.

**Tech Stack:** JSON (manifests/hooks), Markdown (skills), Bash (install script), Node.js (tick hook tweak)

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `.cursor-plugin/plugin.json` | Cursor plugin manifest with MCP server config |
| Create | `hooks/cursor-hooks.json` | Cursor hook definitions (camelCase events) |
| Create | `cursor-skills/scan/SKILL.md` | Scan skill for Cursor |
| Create | `cursor-skills/catch/SKILL.md` | Catch skill for Cursor |
| Create | `cursor-skills/collection/SKILL.md` | Collection skill for Cursor |
| Create | `cursor-skills/merge/SKILL.md` | Merge skill for Cursor |
| Create | `cursor-skills/energy/SKILL.md` | Energy skill for Cursor |
| Create | `cursor-skills/status/SKILL.md` | Status skill for Cursor |
| Create | `cursor-skills/settings/SKILL.md` | Settings skill for Cursor |
| Create | `cursor-skills/list/SKILL.md` | List skill for Cursor |
| Create | `scripts/cursor-install.sh` | Dev install script for local testing |
| Modify | `scripts/tick-hook.js:60` | Add Cursor event name to notification check |
| Modify | `package.json:23-29` | Add `.cursor-plugin/` and `cursor-skills/` to files array |

---

### Task 1: Cursor Plugin Manifest

**Files:**
- Create: `.cursor-plugin/plugin.json`

- [ ] **Step 1: Create the manifest file**

Create `.cursor-plugin/plugin.json`:

```json
{
  "name": "compi",
  "displayName": "Compi",
  "version": "0.1.0",
  "description": "Terminal creature collection game — catch digital beings as you work",
  "author": { "name": "compi" },
  "repository": "https://github.com/amit221/compi",
  "license": "MIT",
  "keywords": ["game", "terminal", "creatures", "collection"],
  "category": "entertainment",
  "skills": "./cursor-skills/",
  "hooks": "./hooks/cursor-hooks.json",
  "mcpServers": {
    "compi": {
      "command": "node",
      "args": ["${CURSOR_PLUGIN_ROOT}/dist/mcp-server.js"],
      "env": {
        "COMPI_DISPLAY_FILE": "0"
      }
    }
  }
}
```

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('.cursor-plugin/plugin.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add .cursor-plugin/plugin.json
git commit -m "feat: add Cursor plugin manifest"
```

---

### Task 2: Cursor Hooks Config

**Files:**
- Create: `hooks/cursor-hooks.json`

- [ ] **Step 1: Create the hooks file**

Create `hooks/cursor-hooks.json`:

```json
{
  "hooks": {
    "afterFileEdit": [
      {
        "command": "node \"${CURSOR_PLUGIN_ROOT}/scripts/tick-hook.js\""
      }
    ],
    "stop": [
      {
        "command": "node \"${CURSOR_PLUGIN_ROOT}/scripts/tick-hook.js\""
      }
    ],
    "sessionStart": [
      {
        "command": "node \"${CURSOR_PLUGIN_ROOT}/scripts/tick-hook.js\""
      }
    ]
  }
}
```

Note: Cursor hooks use camelCase event names and a flatter structure than Claude Code hooks (no nested `hooks` array with `type` field — just `command` directly).

- [ ] **Step 2: Validate JSON**

Run: `node -e "JSON.parse(require('fs').readFileSync('hooks/cursor-hooks.json','utf8')); console.log('valid')"`
Expected: `valid`

- [ ] **Step 3: Commit**

```bash
git add hooks/cursor-hooks.json
git commit -m "feat: add Cursor hooks config"
```

---

### Task 3: Cursor Skills (all 8)

**Files:**
- Create: `cursor-skills/scan/SKILL.md`
- Create: `cursor-skills/catch/SKILL.md`
- Create: `cursor-skills/collection/SKILL.md`
- Create: `cursor-skills/merge/SKILL.md`
- Create: `cursor-skills/energy/SKILL.md`
- Create: `cursor-skills/status/SKILL.md`
- Create: `cursor-skills/settings/SKILL.md`
- Create: `cursor-skills/list/SKILL.md`

These are platform-agnostic versions of the Claude Code skills. They reference MCP tools by description rather than the `mcp__plugin_compi_compi__*` naming convention. They output MCP text directly (no temp file hack) — ANSI rendering will be tested in Cursor and adjusted if needed.

- [ ] **Step 1: Create scan skill**

Create `cursor-skills/scan/SKILL.md`:

```markdown
---
name: scan
description: Show nearby creatures that can be caught
---

Call the compi `scan` MCP tool to scan for nearby creatures.

Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
```

- [ ] **Step 2: Create catch skill**

Create `cursor-skills/catch/SKILL.md`:

```markdown
---
name: catch
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

Call the compi `catch` MCP tool with the parsed `index` (number).

Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
```

- [ ] **Step 3: Create collection skill**

Create `cursor-skills/collection/SKILL.md`:

```markdown
---
name: collection
description: Browse your caught creatures and their traits
---

Call the compi `collection` MCP tool to browse caught creatures.

Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
```

- [ ] **Step 4: Create merge skill**

Create `cursor-skills/merge/SKILL.md`:

```markdown
---
name: merge
description: Merge two creatures from your collection
---

Parse the arguments for target and food creature IDs.

Usage: `/merge [targetId] [foodId]`

If `--confirm` is NOT in the arguments:
1. Call the compi `merge` MCP tool with `targetId` and `foodId` (no `confirm`) to get the preview.
2. Output the tool's text response AS-IS in a code block.
3. Respond with: "Proceed with /merge [targetId] [foodId] --confirm"

If `--confirm` IS in the arguments:
1. Call the compi `merge` MCP tool with `targetId`, `foodId`, and `confirm: true`.
2. Output the tool's text response AS-IS in a code block.
```

- [ ] **Step 5: Create energy skill**

Create `cursor-skills/energy/SKILL.md`:

```markdown
---
name: energy
description: Show current energy level
---

Call the compi `energy` MCP tool to check energy.

Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
```

- [ ] **Step 6: Create status skill**

Create `cursor-skills/status/SKILL.md`:

```markdown
---
name: status
description: View your player profile and game stats
---

Call the compi `status` MCP tool to view player stats.

Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
```

- [ ] **Step 7: Create settings skill**

Create `cursor-skills/settings/SKILL.md`:

```markdown
---
name: settings
description: View or change game settings (notifications)
---

View or change compi settings.

Usage:
- `/settings` — view current settings
- `/settings notifications [minimal|moderate|off]` — change notification level

Parse the arguments to determine `key` and `value` (both optional strings).

Call the compi `settings` MCP tool with the parsed arguments.

Output the tool's text response AS-IS in a code block. Do NOT summarize, paraphrase, or reformat.
```

- [ ] **Step 8: Create list skill**

Create `cursor-skills/list/SKILL.md`:

```markdown
---
name: list
description: Show all available Compi slash commands
---

Display the following list of available Compi commands to the user:

| Command | Description |
|---------|-------------|
| `/compi:scan` | Show nearby creatures that can be caught |
| `/compi:catch` | Attempt to catch a nearby creature |
| `/compi:collection` | Browse your caught creatures and their traits |
| `/compi:merge` | Merge two creatures from your collection |
| `/compi:energy` | Show current energy level |
| `/compi:status` | View your player profile and game stats |
| `/compi:settings` | View or change game settings |
| `/compi:list` | Show this list of commands |
```

- [ ] **Step 9: Commit**

```bash
git add cursor-skills/
git commit -m "feat: add Cursor-specific skills (8 commands)"
```

---

### Task 4: Tick Hook Cursor Compatibility

**Files:**
- Modify: `scripts/tick-hook.js:60`

- [ ] **Step 1: Update the event name check**

In `scripts/tick-hook.js`, line 60, change:

```js
    if (data.hook_event_name === "UserPromptSubmit") {
```

to:

```js
    if (data.hook_event_name === "UserPromptSubmit" ||
        data.hook_event_name === "beforeSubmitPrompt") {
```

- [ ] **Step 2: Update the file header comment**

In `scripts/tick-hook.js`, line 4, change:

```js
// Fires on: PostToolUse, Stop, SessionStart (via plugin hooks/hooks.json)
```

to:

```js
// Fires on: PostToolUse, Stop, SessionStart (Claude Code via hooks/hooks.json)
//           afterFileEdit, stop, sessionStart (Cursor via hooks/cursor-hooks.json)
```

- [ ] **Step 3: Verify existing tests still pass**

Run: `npx jest`
Expected: All tests pass (tick-hook.js is a plain JS script, tests exercise the engine it calls)

- [ ] **Step 4: Commit**

```bash
git add scripts/tick-hook.js
git commit -m "fix: support Cursor hook event names in tick notification"
```

---

### Task 5: Update package.json Files Array

**Files:**
- Modify: `package.json:23-29`

- [ ] **Step 1: Add Cursor files to the files array**

In `package.json`, change the `files` array from:

```json
  "files": [
    "dist/",
    "scripts/",
    "skills/",
    "hooks/",
    ".claude-plugin/",
    "README.md"
  ],
```

to:

```json
  "files": [
    "dist/",
    "scripts/",
    "skills/",
    "cursor-skills/",
    "hooks/",
    ".claude-plugin/",
    ".cursor-plugin/",
    "README.md"
  ],
```

- [ ] **Step 2: Commit**

```bash
git add package.json
git commit -m "chore: add Cursor plugin files to package.json"
```

---

### Task 6: Dev Install Script

**Files:**
- Create: `scripts/cursor-install.sh`

This script copies the built plugin to Cursor's local plugin directory and registers it. Based on the [local testing guide](https://medium.com/@v.tajzich/how-to-write-and-test-cursor-plugins-locally-the-part-the-docs-dont-tell-you-4eee705d7f76).

- [ ] **Step 1: Create the install script**

Create `scripts/cursor-install.sh`:

```bash
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
```

- [ ] **Step 2: Make script executable**

Run: `chmod +x scripts/cursor-install.sh`

- [ ] **Step 3: Test script runs without errors (dry check)**

Run: `bash scripts/cursor-install.sh`
Expected: Files copied, JSON files updated, "Done! Restart Cursor to load the plugin." printed.

- [ ] **Step 4: Commit**

```bash
git add scripts/cursor-install.sh
git commit -m "feat: add Cursor plugin dev install script"
```

---

### Task 7: Manual Testing in Cursor

This task is manual — no code changes, just verification.

- [ ] **Step 1: Build the project**

Run: `npm run build`
Expected: Clean build, no errors

- [ ] **Step 2: Install to Cursor**

Run: `bash scripts/cursor-install.sh`
Expected: Files copied successfully

- [ ] **Step 3: Restart Cursor and verify plugin**

Restart Cursor. Go to Settings > Plugins.
Expected: "Compi" appears in the installed plugins list.

- [ ] **Step 4: Test hooks fire**

Edit any file in Cursor's agent mode. Then check the log:
Run: `cat ~/.compi/compi.log | tail -5`
Expected: Recent tick entries with timestamps

- [ ] **Step 5: Test scan skill**

In Cursor agent chat, type `/scan`.
Expected: MCP tool is called, creature list is returned.

- [ ] **Step 6: Check ANSI rendering**

Look at the scan output in Cursor.
- If colors render: No further changes needed. Done.
- If colors are stripped: Proceed to Task 8.

- [ ] **Step 7: Document results**

Add a note to the spec's "Open Questions" section with test results:
- Plugin root env var name (confirmed or corrected)
- Hook stdin JSON field names (confirmed or corrected)
- ANSI rendering behavior (yes/no)

---

### Task 8: ANSI Fallback (only if Task 7 Step 6 shows no colors)

**Files:**
- Modify: `.cursor-plugin/plugin.json`
- Modify: `cursor-skills/scan/SKILL.md`
- Modify: `cursor-skills/catch/SKILL.md`
- Modify: `cursor-skills/collection/SKILL.md`
- Modify: `cursor-skills/merge/SKILL.md`
- Modify: `cursor-skills/energy/SKILL.md`
- Modify: `cursor-skills/status/SKILL.md`

Skip this task entirely if Cursor renders ANSI natively.

- [ ] **Step 1: Enable display file in MCP config**

In `.cursor-plugin/plugin.json`, change `COMPI_DISPLAY_FILE` from `"0"` to `"1"`:

```json
    "env": {
      "COMPI_DISPLAY_FILE": "1"
    }
```

- [ ] **Step 2: Update scan skill with display file approach**

Replace `cursor-skills/scan/SKILL.md` with:

```markdown
---
name: scan
description: Show nearby creatures that can be caught
---

1. Call the compi `scan` MCP tool to scan for nearby creatures.
2. Then run this Bash command to display the result with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```

After both steps, count the creatures from the MCP response and respond with ONLY:
"You found [N] compis!"

Do NOT describe or list the creatures.
```

- [ ] **Step 3: Update catch skill**

Replace `cursor-skills/catch/SKILL.md` with:

```markdown
---
name: catch
description: Attempt to catch a nearby creature
---

Parse the argument for which creature number (1-indexed) from the scan list.

Usage: `/catch [number]`

1. Call the compi `catch` MCP tool with the parsed `index` (number).
2. Then run this Bash command to display the result with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```

Output the tool's text response AS-IS. Do NOT describe the catch result.
```

- [ ] **Step 4: Update collection skill**

Replace `cursor-skills/collection/SKILL.md` with:

```markdown
---
name: collection
description: Browse your caught creatures and their traits
---

1. Call the compi `collection` MCP tool to browse caught creatures.
2. Then run this Bash command to display the result with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```

Do NOT describe the collection.
```

- [ ] **Step 5: Update merge skill**

Replace `cursor-skills/merge/SKILL.md` with:

```markdown
---
name: merge
description: Merge two creatures from your collection
---

Parse the arguments for target and food creature IDs.

Usage: `/merge [targetId] [foodId]`

If `--confirm` is NOT in the arguments:
1. Call the compi `merge` MCP tool with `targetId` and `foodId` (no `confirm`) to get the preview.
2. Run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
3. Respond with: "Proceed with /merge [targetId] [foodId] --confirm"

If `--confirm` IS in the arguments:
1. Call the compi `merge` MCP tool with `targetId`, `foodId`, and `confirm: true`.
2. Run the same Bash cat+rm command.
```

- [ ] **Step 6: Update energy skill**

Replace `cursor-skills/energy/SKILL.md` with:

```markdown
---
name: energy
description: Show current energy level
---

1. Call the compi `energy` MCP tool to check energy.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
```

- [ ] **Step 7: Update status skill**

Replace `cursor-skills/status/SKILL.md` with:

```markdown
---
name: status
description: View your player profile and game stats
---

1. Call the compi `status` MCP tool to view player stats.
2. Then run this Bash command to display it with colors:
   ```
   cat "$LOCALAPPDATA/Temp/compi_display.txt" && rm -f "$LOCALAPPDATA/Temp/compi_display.txt"
   ```
```

- [ ] **Step 8: Reinstall and test**

Run: `npm run build && bash scripts/cursor-install.sh`
Restart Cursor. Test `/scan` — verify colored output appears.

- [ ] **Step 9: Commit**

```bash
git add .cursor-plugin/plugin.json cursor-skills/
git commit -m "fix: use display file fallback for Cursor ANSI rendering"
```
