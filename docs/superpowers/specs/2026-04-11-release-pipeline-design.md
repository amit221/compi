# Release Pipeline Design

**Date:** 2026-04-11
**Status:** Approved (pending spec review)

## Problem

Compi has no release automation. On every push to master we want:

- The project version to bump automatically based on commit contents
- The same version number kept in sync across all four JSON files that hold it
- A human-readable `CHANGELOG.md` updated in lockstep
- A git tag produced for each release, so plugin marketplaces can resolve a specific version

The four version-bearing files are:

1. `package.json`
2. `.claude-plugin/plugin.json`
3. `.claude-plugin/marketplace.json` (the version sits inside `plugins[0]`, **not** top-level)
4. `.cursor-plugin/plugin.json`

All four are currently `0.1.0`. There is no CI in the repo today (`.github/workflows/` does not exist), and there is no `CHANGELOG.md`.

## Goals

- Push to master → eventual release with zero manual version math.
- All four JSON files stay in sync automatically.
- Changelog entries are generated from commit messages.
- A git tag marks each release, so marketplaces and users can pin to a version.
- Solo-developer-friendly: no required PR workflow for day-to-day development.

## Non-Goals (Explicit)

The following are deliberately **out of scope** for v1 and can be layered on later:

- Publishing to npm
- A GitHub Releases page (duplicates `CHANGELOG.md`; adds permissions surface without current benefit)
- Commit-lint / pre-commit enforcement of Conventional Commits (manual discipline instead)
- Pre-release channels (`alpha`, `beta`, `rc`)
- Hotfix branches or backporting
- Any marketplace API calls (marketplaces read versions from the committed JSON files)

## Decisions

### Versioning: Conventional Commits, automatic

Version bumps are decided by parsing commit messages on master:

| Commit prefix | Bump |
|---|---|
| `feat:` | minor |
| `fix:` | patch |
| `feat!:` / `fix!:` / `BREAKING CHANGE:` in body | major |
| `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:` | none |

The existing commit styles `update:` and `enhance:` are **retired**. They are not valid Conventional Commits and will be silently ignored by the release pipeline.

### Tool: `release-please`

`release-please` (Google) is the selected tool. Rationale:

- Built for multi-file version synchronization via `extra-files`.
- "Release PR" model gives an explicit review step before each release — you see exactly which version and changelog will ship before merging.
- No runtime dependencies added to the project; everything runs in CI.
- Works identically for direct pushes and PR merges to master — it watches commits, not PR events.
- Battle-tested, Google-maintained.

Alternatives considered and rejected:

- **`semantic-release`** — more powerful but heavier config, and non-`package.json` version bumps require plugins. Overkill for a solo project.
- **Custom script** — full control but owning the bugs is not worth the savings. Reserve as an escape hatch if release-please v4 cannot handle the nested `marketplace.json` version field.

### Release scope: tag + versions + changelog only

Each release produces:

- Updated version in 4 JSON files
- Updated `CHANGELOG.md`
- Updated `.release-please-manifest.json`
- A single commit to master containing all of the above (via merging the Release PR)
- A git tag `vX.Y.Z` pointing at that commit

No GitHub Release page, no npm publish, no external API calls.

### Changelog seeding: clean break

`CHANGELOG.md` starts with a single manual entry for `0.1.0 - Initial release`. Historical commits are not backfilled. Release-please begins parsing from the next conventional commit after the pipeline lands.

The baseline version stays `0.1.0`. The first real conventional commit drives the first real bump (likely `0.1.1` or `0.2.0` depending on whether it is a `fix:` or `feat:`).

## Architecture

The release system is a GitHub Actions workflow driven by release-please. It has no runtime component — it is purely a CI and repo-config addition. The main project code is untouched.

```
Developer commit (conventional format)
          │
          │ git push origin master
          ▼
GitHub Actions (.github/workflows/release.yml, on push to master)
          │
          │ invokes googleapis/release-please-action@v4
          ▼
release-please reads release-please-config.json + .release-please-manifest.json
          │
          │ if bump-triggering commits exist since last tag:
          ▼
Opens / updates "chore(main): release X.Y.Z" Release PR
(bot-authored, contains version bumps + changelog diff)
          │
          │ developer clicks Merge when ready to ship
          ▼
Merge lands bumps + changelog on master
          │
          │ release-please's next run on that merge:
          ▼
Creates git tag vX.Y.Z pointing at the merge commit
```

## Files Added / Changed

### New files

#### 1. `.github/workflows/release.yml`

```yaml
name: release
on:
  push:
    branches: [master]
permissions:
  contents: write
  pull-requests: write
jobs:
  release-please:
    runs-on: ubuntu-latest
    steps:
      - uses: googleapis/release-please-action@v4
        with:
          config-file: release-please-config.json
          manifest-file: .release-please-manifest.json
```

The two permissions (`contents: write`, `pull-requests: write`) are the minimum required for release-please to commit version bumps, tag releases, and open/update the Release PR. `GITHUB_TOKEN` is auto-provided by GitHub Actions — no secrets to configure.

#### 2. `release-please-config.json`

```json
{
  "release-type": "node",
  "packages": {
    ".": {
      "package-name": "compi",
      "changelog-path": "CHANGELOG.md",
      "include-v-in-tag": true,
      "draft": false,
      "prerelease": false,
      "extra-files": [
        ".claude-plugin/plugin.json",
        ".cursor-plugin/plugin.json",
        {
          "type": "json",
          "path": ".claude-plugin/marketplace.json",
          "jsonpath": "$.plugins[0].version"
        }
      ]
    }
  }
}
```

**Note on `marketplace.json`:** the version field is nested inside `plugins[0]`, not top-level. `release-please` supports this via the `json` extra-file type with an explicit `jsonpath`. During implementation, this exact shape must be confirmed against the `googleapis/release-please-action@v4` docs; if the syntax has changed, use the closest equivalent. If release-please cannot address the nested field at all, fall back to adding an `x-release-please-version` annotation comment in the file and using `"type": "generic"`.

#### 3. `.release-please-manifest.json`

```json
{
  ".": "0.1.0"
}
```

Seeds release-please with the current baseline version. Release-please will update this file on every release.

#### 4. `CHANGELOG.md`

```markdown
# Changelog

All notable changes to this project are documented in this file. This file is maintained automatically by [release-please](https://github.com/googleapis/release-please) based on [Conventional Commits](https://www.conventionalcommits.org/).

## 0.1.0

- Initial release.
```

### Edited files

#### 5. `CLAUDE.md` — add commit message rules

A new section added to `CLAUDE.md` so future Claude sessions enforce the convention automatically:

```markdown
## Commit Messages

All commits MUST follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature (triggers minor bump)
- `fix:` — bug fix (triggers patch bump)
- `chore:`, `docs:`, `refactor:`, `test:`, `style:`, `ci:`, `build:`, `perf:` — no version bump
- Breaking changes: add `!` after type (`feat!: ...`) or include `BREAKING CHANGE:` in the commit body (triggers major bump)

Do **not** use `update:` or `enhance:` — these are not valid Conventional Commits and will be ignored by the release pipeline.

Releases are fully automated by `release-please` on push to master. See `docs/superpowers/specs/2026-04-11-release-pipeline-design.md` for details.
```

## Release Flow Walkthrough

### First push after landing the pipeline

1. `chore: add release-please pipeline` lands on master.
2. Workflow runs. Release-please reads manifest (`0.1.0`), parses commit, sees `chore:` → no bump.
3. No Release PR is opened. Pipeline is armed but dormant.

### First feature commit

1. `git commit -m "feat: add breed UI flow"` → `git push`.
2. Workflow runs. Release-please calculates `0.1.0 → 0.2.0`.
3. Release-please opens a PR titled **`chore(main): release 0.2.0`**. PR contains:
   - `package.json`: `"version": "0.2.0"`
   - `.claude-plugin/plugin.json`: `"version": "0.2.0"`
   - `.claude-plugin/marketplace.json`: `plugins[0].version = "0.2.0"`
   - `.cursor-plugin/plugin.json`: `"version": "0.2.0"`
   - `.release-please-manifest.json`: `"." : "0.2.0"`
   - `CHANGELOG.md`: prepends `## [0.2.0]` section with the new feature listed under `### Features`.

### Subsequent pushes before merging the Release PR

Every push updates the *same* Release PR. Examples:

- Add a `fix:` → PR still targets `0.2.0` (the minor bump wins; the fix is added under `### Bug Fixes`).
- Add a `feat!:` → PR is upgraded to target `1.0.0` (major wins).
- Add a `chore:` → PR is unchanged (no bump contribution) but the commit is on master.

### Shipping a release

1. Developer clicks Merge on the Release PR.
2. The merge commit lands on master with all bumps + changelog.
3. Release-please runs again on the merge, detects the release commit, creates `v0.2.0` git tag.
4. Marketplaces pick up `0.2.0` from the JSON files on master.

### Edge cases

- **Direct push to master while a Release PR is open** — release-please updates the open PR to include the new commit. No duplicate PRs.
- **All-`chore`/`docs:` period** — no Release PR opens, no empty release. Intentional.
- **Non-conventional commit slips through** — silently ignored. If *every* commit between releases is non-conventional, no release happens at all. **This is a known silent-failure mode.** Mitigation: the `CLAUDE.md` rule + developer discipline. A commit-lint hook can be added later if this becomes a problem in practice.
- **Multiple bump types in one release window** — highest bump wins (major > minor > patch).
- **Release PR is abandoned for days/weeks** — no harm, just keeps accumulating. Merge whenever.

## Verification Plan

This is a CI/config change with no runtime code, so "testing" means verifying the pipeline runs end-to-end.

### Pre-push local checks

1. **JSON validity** — `node -e "JSON.parse(require('fs').readFileSync('release-please-config.json','utf8'))"` on both new config files.
2. **Extra-files target check** — visually confirm each of the 4 files still has exactly one `"version"` field at the expected location (top-level for three, nested in `plugins[0]` for `marketplace.json`).
3. **Workflow syntax** — push `release.yml` to a throwaway branch first and confirm GitHub's Actions tab parses it without errors.

### Post-merge verification

4. **Dormant run** — the `chore:` commit that adds the pipeline should trigger a workflow run that does nothing visible (no Release PR, no tags). Confirm in the Actions tab.
5. **Live run** — make one deliberate small `fix:` commit, push, confirm a Release PR appears proposing `0.1.1` with all 4 files updated correctly and a `CHANGELOG.md` entry.
6. **Diff audit** — inspect the Release PR diff manually. Each version field must be touched exactly once and must match. Particular attention to `marketplace.json` (nested path).
7. **Merge the test Release PR** — confirm `v0.1.1` tag lands on master, all 4 JSON files show `0.1.1`, `CHANGELOG.md` has the `0.1.1` entry.

### Definition of Done

- [ ] All 5 files added/edited and committed to master
- [ ] Workflow runs green on the initial `chore:` commit (dormant)
- [ ] A test `fix:` commit produces a correctly-filled Release PR
- [ ] Merging the test Release PR creates a `v0.1.1` tag and updates all 4 JSON files + `CHANGELOG.md` on master
- [ ] `CLAUDE.md` commit-message rules are in place

## Open Questions Resolved During Design

- *Do we need a GitHub Release page?* — No, it duplicates `CHANGELOG.md`. Can be enabled later via release-please config.
- *How do direct pushes to master interact with the "Release PR" model?* — Fine. Release-please watches commits regardless of how they got there.
- *What happens to existing mixed-style commits?* — Left in git log, not backfilled to `CHANGELOG.md`. Clean break from this point forward.
- *Does the first release bump from `0.1.0` immediately?* — No. Baseline stays at `0.1.0`; the next conventional commit drives the first real bump.
