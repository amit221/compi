# Changelog

All notable changes to this project are documented in this file. This file is maintained automatically by [release-please](https://github.com/googleapis/release-please) based on [Conventional Commits](https://www.conventionalcommits.org/).

## [0.3.0](https://github.com/amit221/compi/compare/v0.2.4...v0.3.0) (2026-04-14)


### Features

* add /create-species skill for AI-driven species generation ([6edf03e](https://github.com/amit221/compi/commit/6edf03ee55d4155185fb90fa3f28dbff5d10bbc5))
* add /upgrade and /quest skill files for Claude Code plugin ([de4a9d2](https://github.com/amit221/compi/commit/de4a9d2347ed08727ed03b4d1b8f310df6ac5004))
* add narrator voice instructions to all skill SKILL.md files ([32e5707](https://github.com/amit221/compi/commit/32e5707848f02f7149f29fbe6fa4b8382986292e))
* add optional zones field to SpeciesDefinition type ([cfb03ed](https://github.com/amit221/compi/commit/cfb03ed106a9f27bf5351d4ff8605dba6a5c8ef7))
* add Pyrax species and /play companion mode ([d007f82](https://github.com/amit221/compi/commit/d007f82305485ed8d6c5d4ba44cefff1e699d34a))
* add renderStatusBar, renderActionMenu, renderProgressPanel to renderer ([3e0f2d8](https://github.com/amit221/compi/commit/3e0f2d8813bdf24eb61f72dacb466da9bc7af9c9))
* add renderUpgradeResult, renderQuestStart, renderQuestComplete, renderLevelUp, renderDiscovery to renderer ([0fa0b2a](https://github.com/amit221/compi/commit/0fa0b2ae387462f4c0118126b47c48add5c055ab))
* add species validation script ([fe9039e](https://github.com/amit221/compi/commit/fe9039ec29b31ac7492a918d682955ab0c620311))
* add upgrade, quest_start, and quest_check MCP tools ([9f2a799](https://github.com/amit221/compi/commit/9f2a799c3b825ac9ab0395d1ad19924e44b6a329))
* add upgrade, quest, and gold CLI subcommands ([a24bbc1](https://github.com/amit221/compi/commit/a24bbc1ab143b1155a3a85165f7c11e03cecedf5))
* add v5 state with gold, quests, upgrades, discovery types ([fc13682](https://github.com/amit221/compi/commit/fc13682bc0663cf51abb836350e551e2f86a2df9))
* add zone-based line coloring to renderer ([358201f](https://github.com/amit221/compi/commit/358201fbdcf9dbb8cdba43e665c1f29e77dff999))
* add zones to all existing species for zone-based coloring ([4a55cba](https://github.com/amit221/compi/commit/4a55cba4624af9401eee10ab80d4434cfe8ba1dc))
* **advisor:** add buildAdvisorContext entry point and wire into GameEngine ([db3d5a1](https://github.com/amit221/compi/commit/db3d5a1fc8ac281be7ac746836a19d33446daf29))
* **advisor:** add getProgressInfo calculator with team power, tier tracking, and milestones ([23cb217](https://github.com/amit221/compi/commit/23cb2175ee0d77b4a76d2f7b3affae294cd38ff7))
* **companion:** add /compi:play interactive companion skill ([e74667e](https://github.com/amit221/compi/commit/e74667ea14825a8ec7ee3bcadadf8dd2e4f894eb))
* **companion:** add companion overview engine module with tests ([6688465](https://github.com/amit221/compi/commit/668846521949301353cffc4806db6d63cfcc949c))
* **companion:** add CompanionOverview type and renderer interface ([50d8402](https://github.com/amit221/compi/commit/50d84022e27ad900084a9ffaefa88f2046873d0a))
* **companion:** add renderCompanionOverview to SimpleTextRenderer ([aabeb6a](https://github.com/amit221/compi/commit/aabeb6a7c80a62a90c2cec307adcdee7691adce0))
* **companion:** register companion MCP tool ([6c8d7a1](https://github.com/amit221/compi/commit/6c8d7a1f81b43f2f542db1f175b6f1aed03beb30))
* **config:** add upgrade, quest, merge gold, leveling, and discovery balance params ([6e3b65a](https://github.com/amit221/compi/commit/6e3b65a4ef18f614a92bd1078b82a589e1748165))
* display advisor status bar and action menu in CLI after game actions ([9b628a9](https://github.com/amit221/compi/commit/9b628a94320e5aaea1aa1998111915087cf97764))
* **engine:** add gold cost, downgrade chance, and XP grant to merge ([abd77aa](https://github.com/amit221/compi/commit/abd77aab16b1f155a6b1dacd0703769ac1a773de))
* **engine:** add gold earn/spend/canAfford helpers ([f2a34db](https://github.com/amit221/compi/commit/f2a34dbfd08d474142c7ae0cff3fe9c05817043c))
* **engine:** add quest system with team power, gold rewards, and session lock ([17079e2](https://github.com/amit221/compi/commit/17079e2cae3b460d69c47442ee8055a20c6a3744))
* **engine:** add session-based energy regen (+3 per new session) ([36c22cc](https://github.com/amit221/compi/commit/36c22cce38ddc3e2154a3c1a5e53a02078fb35a5))
* **engine:** add species discovery tracking with bonus XP ([1fafd02](https://github.com/amit221/compi/commit/1fafd02643688e8f1bca3d4764fa875c428c8b4a))
* **engine:** add trait upgrade module with gold cost, session cap, and XP grant ([69dd467](https://github.com/amit221/compi/commit/69dd4679f1aae7d14ad829e0330a746a53f36586))
* **engine:** add XP granting, leveling, and trait rank cap progression ([fb59c57](https://github.com/amit221/compi/commit/fb59c570ebd93fa3710a832dc2aa668eeaefb2e3))
* enhance CLAUDE.md and plugin structure for improved gameplay ([d1f1911](https://github.com/amit221/compi/commit/d1f191115391527ec52f1c4dc38372a004ec9736))
* include advisor_context JSON in MCP tool responses after game actions ([374f09d](https://github.com/amit221/compi/commit/374f09d035b08e43f2af6a8e327282850c6d56c1))
* **simulation:** add BalanceAnalyzer stats collector ([ee96531](https://github.com/amit221/compi/commit/ee96531650c30f1c73dab492ec40ffd3a75fb945))
* **simulation:** add BugHunter invariant checker ([d560f47](https://github.com/amit221/compi/commit/d560f471cd811386e7bc5b011ad324315e22d867))
* **simulation:** add CLI entry point and barrel export ([709d773](https://github.com/amit221/compi/commit/709d773c82774414a9aeee4930da4d7be0efb82c))
* **simulation:** add core GameSimulator with strategies ([f9a6ddc](https://github.com/amit221/compi/commit/f9a6ddcdae6357d270f844851b3e5b54cabc4a56))
* **simulation:** add MCP smoke tester with edge cases ([e3b808a](https://github.com/amit221/compi/commit/e3b808af1f332fdc72b24379675bc35eb70e78ee))
* **simulation:** add report formatter for terminal and JSON output ([e49ee43](https://github.com/amit221/compi/commit/e49ee4301472b1198adeaab7581b22b009d7ee56))
* **simulation:** add simulation type definitions and helpers ([49898cb](https://github.com/amit221/compi/commit/49898cb964a21dbc7d4ff5054e08ef581b11ebae))
* **simulation:** add UX scenario definitions for Claude agent ([fe1815f](https://github.com/amit221/compi/commit/fe1815f5af229c2c3c4afa66a93c70d4075c30e1))
* **types:** add SuggestedAction, ProgressInfo, AdvisorContext, and ActionMenuEntry types ([4f06e8c](https://github.com/amit221/compi/commit/4f06e8cbe0154dbf440091f2f797e3de0d026cf0))
* wire new modules into GameEngine (Task 10) ([1f57934](https://github.com/amit221/compi/commit/1f579344bfc0214627b41334a28e0db3e91cfc00))
* wire status bar and game system info into all renderer screens ([47d9dfd](https://github.com/amit221/compi/commit/47d9dfd8e66e756a44688fd7f26208095ef180e3))


### Bug Fixes

* add labels to status bar icons and include energy display ([529a92b](https://github.com/amit221/compi/commit/529a92b51e4ab6491a24ee23e0be979b3efebd0c))
* address review findings — quest session gating, energy config, advisor tiers, skill narrator ([3569642](https://github.com/amit221/compi/commit/356964209f701366091a7c9ddf2b8329dad8a0ae))

## [0.2.4](https://github.com/amit221/compi/compare/v0.2.3...v0.2.4) (2026-04-12)


### Bug Fixes

* new players start with full energy and complete plugin manifest ([00a7ff0](https://github.com/amit221/compi/commit/00a7ff0f56e9bd939f63a0ab7fc6062372423105)), closes [#8](https://github.com/amit221/compi/issues/8)

## [0.2.3](https://github.com/amit221/compi/compare/v0.2.2...v0.2.3) (2026-04-12)


### Bug Fixes

* **ci:** auto-merge release PRs and create tags in one workflow run ([42ec1d1](https://github.com/amit221/compi/commit/42ec1d1f0ef642e6856aea38c55a4a65a73f8ca9))
* use cross-platform temp path in skill display commands ([2db2466](https://github.com/amit221/compi/commit/2db246635ae3132dfbd0582e757f56ddf0a1907e))

## [0.2.2](https://github.com/amit221/compi/compare/v0.2.1...v0.2.2) (2026-04-11)


### Bug Fixes

* bundle MCP servers into scripts/ so plugin installs work ([c798e4c](https://github.com/amit221/compi/commit/c798e4c5c3798e132cc43189a9331d24a2f54f0e))
* **ci:** remove fragile if-expression from build-bundles workflow ([6ff47ee](https://github.com/amit221/compi/commit/6ff47eee0e7734e7784609639639b2eb94c1c311))

## [0.2.1](https://github.com/amit221/compi/compare/v0.2.0...v0.2.1) (2026-04-11)


### Bug Fixes

* **release:** build dist/ into release PR so plugin MCP servers work ([8aca4ca](https://github.com/amit221/compi/commit/8aca4ca8766e678b5125f0c2d662c4c3565b972a))

## [0.2.0](https://github.com/amit221/compi/compare/v0.1.1...v0.2.0) (2026-04-11)


### Features

* **breed:** trait-score mini-table view, drop /breed N partner mode ([673fcf0](https://github.com/amit221/compi/commit/673fcf08f86dd060891ac95728c7b9fd28c72de8))
* **engine:** add buildBreedTable helper + BreedTable types ([2051008](https://github.com/amit221/compi/commit/20510089f8797360988d13aa097a27cb8716e857))

## [0.1.1](https://github.com/amit221/compi/compare/v0.1.0...v0.1.1) (2026-04-11)


### Bug Fixes

* clarify initial release entry in changelog ([1fdbd08](https://github.com/amit221/compi/commit/1fdbd081e2fd5c3d003c95f6d691fa3ab44105ca))

## 0.1.0

- Initial release. (pipeline bootstrap)
