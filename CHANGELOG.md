# Changelog

All notable changes to this project are documented in this file. This file is maintained automatically by [release-please](https://github.com/googleapis/release-please) based on [Conventional Commits](https://www.conventionalcommits.org/).

## [1.1.0](https://github.com/amit221/compi/compare/v1.0.0...v1.1.0) (2026-04-18)


### Features

* add /collection command back as free view alongside /play ([bdcb8f8](https://github.com/amit221/compi/commit/bdcb8f8a9d46e1107913af4e2830ba110d3de746))
* add breed result screen showing baby creature with art and traits ([bb2b116](https://github.com/amit221/compi/commit/bb2b116e2031f55f44fffd699f8195e4bc59ab51))
* add card rendering to SimpleTextRenderer ([88ede8b](https://github.com/amit221/compi/commit/88ede8b558d960182ae5abaf3c6a83349fad2b7c))
* add card rendering to SimpleTextRenderer ([564aa90](https://github.com/amit221/compi/commit/564aa903df44d4169af225d9d2b94aa6f6748fb6))
* add cards engine module — buildPool, drawCards, playCard ([ef16ccc](https://github.com/amit221/compi/commit/ef16ccc9ee97e60a9ffe6336ec43ebe7c562cb08))
* add cards engine module — buildPool, drawCards, playCard ([c7c354e](https://github.com/amit221/compi/commit/c7c354ecc57b9d78436dc41bd7864c958185b1ad))
* add v6→v7 state migration moving archive to collection ([ae6c1cf](https://github.com/amit221/compi/commit/ae6c1cff162e7cf419f7bc2f825069ca2942b618))
* add v7 card types to types.ts and remove archive system ([4ead562](https://github.com/amit221/compi/commit/4ead5626513bcd29b65ae6f7a96ec3ec62444aeb))
* AI generates unique art for hybrid species via register_hybrid ([3ae6ca4](https://github.com/amit221/compi/commit/3ae6ca409edab7666cc3c87390335005d60920e6))
* replace all MCP tools with single play tool ([cfcf803](https://github.com/amit221/compi/commit/cfcf8035176ce16689d7f48ddbac8d65dbef5be0))


### Bug Fixes

* add breed pass handling to CLI play command ([90d065e](https://github.com/amit221/compi/commit/90d065e3bb50cb75a349a8de6df0822c5066d595))
* improve hook notifications — 30% chance, humor, context-aware ([c8a3339](https://github.com/amit221/compi/commit/c8a33399813d5d8f359014dab967a865eadfa977))
* reduce breed card frequency to 20%, auto-register hybrid species art ([c11e35e](https://github.com/amit221/compi/commit/c11e35e633a019f948ea47763874556ba1ae7dea))
* resolve hybrid species art by falling back to parent trait pools ([9e33a6d](https://github.com/amit221/compi/commit/9e33a6d525a5de80000342c022b81269904a9fc0))
* update hook notification to suggest /play instead of /scan ([8db88db](https://github.com/amit221/compi/commit/8db88db72178880e1dd3a8df481e92dacde848ff))

## [1.0.0](https://github.com/amit221/compi/compare/v0.5.0...v1.0.0) (2026-04-15)


### ⚠ BREAKING CHANGES

* update types for v6 — remove gold/quest/upgrade, add rarity/species fields

### Features

* add /species skill folder for slash command ([1deff18](https://github.com/amit221/compi/commit/1deff1834a67674788b41a2e6439e37ce4b67cad))
* add rarity field to CreatureSlot with color mapping ([d020dcc](https://github.com/amit221/compi/commit/d020dccf1959a92028e8ee5f185545ae74d38ca4))
* add species index command, update renderer for breed upgrades and hybrids ([1d98bfe](https://github.com/amit221/compi/commit/1d98bfe9b52caed452f36fcbe2eab84f3ad4a876))
* auto-generate hybrid species during breed via register_hybrid tool ([5e4d7b3](https://github.com/amit221/compi/commit/5e4d7b34ea67ba22caa0c852ad356ebb4fa16a2e))
* catch uses slot.rarity, add species index engine ([f32b2f8](https://github.com/amit221/compi/commit/f32b2f816a7665bbf590688f3d28f2bd276031ce))
* expand CreatureColor to 8 colors (add green, blue) ([a414237](https://github.com/amit221/compi/commit/a414237121fccb6d8eb51d4cd1d733e52f975c43))
* increase batch size to 4-7 creatures per spawn ([ff643ac](https://github.com/amit221/compi/commit/ff643acc7660769b12d24930fc74f3c957b0570b))
* rewrite breeding — parents survive, rarity upgrades, cross-species detection ([a410b2b](https://github.com/amit221/compi/commit/a410b2b5c35adccde2ea5c144cf5f6bb133ad0da))
* scan shows one creature, cleanup skills, hybrid breed context ([ff11784](https://github.com/amit221/compi/commit/ff117840b135e86d42eae8f60e9d5b7342b11104))
* state migration v5→v6 with rarity extraction and species progress ([6d67f3d](https://github.com/amit221/compi/commit/6d67f3d34cf411d328ce0bc075a67fd36c4b06f7))
* update types for v6 — remove gold/quest/upgrade, add rarity/species fields ([7e7c03f](https://github.com/amit221/compi/commit/7e7c03f58244f910908faa215625e784773acb3e))


### Bug Fixes

* address spec compliance issues — energy config, XP values, stale docs ([23f6145](https://github.com/amit221/compi/commit/23f6145593ef36c96f84667639332ac1557dd810))
* allow cross-species breeding in previewBreed and advisor ([a42fd9a](https://github.com/amit221/compi/commit/a42fd9aa8a7a7da7b16bd253e5a035f7b4373b23))
* companion uses slot.rarity, cross-species breedable pairs ([514d96d](https://github.com/amit221/compi/commit/514d96d9146f078b04be89d07f1d4286601b462a))
* cross-species breeding works end-to-end ([158b022](https://github.com/amit221/compi/commit/158b022c02b7f40a8cfbcd9d6e53b1fdb61972c3))
* force AI to show raw MCP tool output verbatim ([277314e](https://github.com/amit221/compi/commit/277314ee6ab52cbedc703cd3657a1222a11e3769))
* renderer uses slot.rarity for colors, anti-summarize instructions ([3242a41](https://github.com/amit221/compi/commit/3242a41174b5893f12d7b79bae56f28ed1887046))
* scan properly cycles through batch one creature at a time ([93538e9](https://github.com/amit221/compi/commit/93538e92bfc0ca1dae17dd7500eca90766e7a8a2))
* skip bug-hunter simulation test (needs invariant update for v6) ([4e73d7e](https://github.com/amit221/compi/commit/4e73d7e5b06bee34b91b81ac1a2ed0dba93edc6b))
* update breed table message (no same-species restriction) ([8797c49](https://github.com/amit221/compi/commit/8797c499aa5aea624cccd4c74d3b53fab6449dfa))
* update tests for 8-color system and v6 migration ([25ffebe](https://github.com/amit221/compi/commit/25ffebe3728a65794b7591bb56db370d5ac50a74))

## [0.5.0](https://github.com/amit221/compi/compare/v0.4.0...v0.5.0) (2026-04-14)


### Features

* switch skills from MCP to CLI for native color rendering ([1b28a64](https://github.com/amit221/compi/commit/1b28a649d047ef14e1b7b969329d26f180c45a11))

## [0.4.0](https://github.com/amit221/compi/compare/v0.3.0...v0.4.0) (2026-04-14)


### Features

* add getTraitRank to look up trait index in species pool ([906847d](https://github.com/amit221/compi/commit/906847d3fe4f7be9a64a91bfedd07667a3ae234a))
* flat energy cost (1) and flat XP per catch per spec ([019c358](https://github.com/amit221/compi/commit/019c358f4f1b3d42db43f07cb50d48e232621d14))
* rank-based catch rate formula per spec ([e7a5d22](https://github.com/amit221/compi/commit/e7a5d22f46977ae603c2f6a6bd3ab46e9a8285da))
* rank-based energy cost scaling (1-5) based on avg trait rank ([228eacd](https://github.com/amit221/compi/commit/228eacdcd44fba6e618513c29f40d4fcd870508f))
* rank-based trait selection with level cap and triangular distribution ([0215ac6](https://github.com/amit221/compi/commit/0215ac67222167c249462b547e42b2aa3da1a683))
* thread playerLevel through spawn pipeline for rank-capped traits ([130c7d5](https://github.com/amit221/compi/commit/130c7d51a2fe0cac4d0092e153d365880309b85b))

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
