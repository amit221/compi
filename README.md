<div align="center">

```
 ██████╗ ██████╗ ███╗   ███╗██████╗ ██╗
██╔════╝██╔═══██╗████╗ ████║██╔══██╗██║
██║     ██║   ██║██╔████╔██║██████╔╝██║
██║     ██║   ██║██║╚██╔╝██║██╔═══╝ ██║
╚██████╗╚██████╔╝██║ ╚═╝ ██║██║     ██║
 ╚═════╝ ╚═════╝ ╚═╝     ╚═╝╚═╝     ╚═╝
```

A terminal creature collection game that lives inside your AI coding agent.
Creatures spawn while you work — each one built from **300 randomized traits** across 6 rarity tiers.
Catch them, collect them, merge them. **15.6 billion possible combinations.**

Works with **Claude Code** | **Cursor** | **Codex** | and more coming soon

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/Tests-71_passing-brightgreen.svg)]()

</div>

---

## Installation

```bash
/plugin marketplace add amit221/compi
/plugin install compi@compi
```

Then enable auto-update so you always get the latest version:
1. Type `/plugin` to open the plugin manager
2. Go to the **Marketplaces** tab
3. Select **compi**
4. Enable **auto-update**

## Playing

**Option 1: Dedicated Compi session** (recommended for best experience)

Add this alias to your shell profile (`~/.bashrc`, `~/.zshrc`, or `~/.profile`):

```bash
alias compi='claude --model haiku --verbose --allowedTools "mcp__plugin_compi_compi__*" "Read" "Write" "Edit" "Bash"'
```

**PowerShell** users — add this to your profile (`$PROFILE`):

```powershell
function compi { & claude.cmd --model haiku --verbose --allowedTools "mcp__plugin_compi_compi__*" "Read" "Write" "Edit" "Bash" @args }
```

Then just run:

```bash
compi
```

This launches a lightweight session using Haiku (fast + cheap) with Compi tools, file access, and CLI enabled.

**Option 2: Play alongside your work**

Compi runs in the background of any Claude Code session. Creatures spawn as you work — you'll see notifications and can interact with `/scan`, `/catch`, `/merge` at any time without interrupting your workflow.

<div align="center">
<img src="assets/banner.svg" alt="compi creatures" width="700" />
</div>

## Commands

| Command | CLI | What it does |
|---------|-----|-------------|
| `/scan` | `compi scan` | Show nearby creatures with traits, catch rates, and energy costs |
| `/catch [n]` | `compi catch [n]` | Catch creature #N from the current batch |
| `/merge [a] [b]` | `compi merge [a] [b]` | Merge two creatures from your collection |
| `/collection` | `compi collection` | Browse your caught creatures and their traits |
| `/energy` | `compi energy` | Check your current energy level |
| `/status` | `compi status` | Player profile, stats, and progress |
| `/settings` | `compi settings` | Configure notifications and preferences |

## Development

```bash
npm install          # Install dependencies
npm test             # Run 71 tests across 7 suites
npm run build        # Compile TypeScript → dist/
npm run dev          # Watch mode (tsc --watch)
```

<div align="center">

---

MIT License

</div>
