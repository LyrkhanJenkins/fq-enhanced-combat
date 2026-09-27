# FQ Enhanced Combat for FoundryVTT

Generic combat enhancements for the **dnd5e** system.

This module is the home of the combat features that grew inside the
[FQ Card Engine](https://gitlab.com/final-quest/fq-card-engine) but belong to
dnd5e rather than to Final Quest. Moved here, they can be used at any dnd5e
table, without the Final Quest card battle system.

> **Status: initialised, empty.** The module installs, enables and loads, but
> ships no feature yet. Features are extracted from the FQ Card Engine one at a
> time — see [RELEASE.md](RELEASE.md) for what each version adds.

## Requirements

- Foundry VTT 14+
- dnd5e system 6.x

No module dependency, and no socket: each extracted feature declares what it
needs in `module.json` when it lands.

## Installation

Paste this manifest URL in Foundry's *Install Module* dialog:

```
https://github.com/LyrkhanJenkins/fq-enhanced-combat/releases/latest/download/module.json
```

## Settings

| Setting | Scope | Default | Effect |
| --- | --- | --- | --- |
| Debug logs | client | off | Writes the module's debug messages to the browser console. |

## For other modules

The module exposes its public entry points on the standard Foundry slot, and a
global façade on the FQ Card Engine model:

```js
game.modules.get("fq-enhanced-combat").api   // per-feature entry points
FqEnhancedCombatModule.moduleName            // "fq-enhanced-combat"
```

Both are deliberately bare while the module is empty.

## Development

```bash
npm install
npm run lint
npm test
```

- `src/` — sources, loaded in the order declared by `module.json`
  (`init-enhanced-combat.js` first: it opens `CONFIG.FqEnhancedCombat`, which the
  hooks then read).
  - `src/config/` — `game.settings` registrations.
  - `src/core/` — layer without any dependency on the rest of the module.
  - `src/hook/` — one file per Foundry hook.
- `lang/` — `en.json` and `fr.json`, keys prefixed `FQCOMBAT.`.
- `tests/` — Vitest, with the Foundry globals mocked in `tests/setup.js`.
- `devNotes/` — working notes, including the extraction checklist.

ESLint rules are those of the FQ Card Engine, so code extracted from it stays
lint-clean: 4-space indent, double quotes, semicolons, and `game.actors` access
banned.

Releases are cut by tagging: the GitHub workflow refuses a tag that does not
match the `version` in `module.json`, and takes the release notes from the
matching `## v<version>` section of [RELEASE.md](RELEASE.md).

## License

MIT — see [LICENSE](LICENSE). See [CREDITS](CREDITS) for what this module builds
on.
