# ScraperX RTS Profile Assistant

A Chrome/Edge Manifest V3 extension that maps structured JSON from a ScraperX Rovo research agent into PitchBook RTS Business Entity and Company fields, with profile identity locking, preview/conflict review, and profile-scoped caching.

**Current status: foundation stage.** No RTS field is automated yet. Every field is added to `registry/index.js` only after its full DOM evidence (section, Add button, opened form, every open dropdown, Save button, saved record) has been supplied and reviewed — see `docs/evidence-checklist.md`. Opening the assistant today lets you validate a pasted JSON response against the schema and preview the execution plan it would produce; every action in that preview reports as skipped, with the reason, until its field is evidenced.

The related [Conference ScraperX Field Assistant](https://github.com/abhishektawte20-png/scraperxsa123) is the architectural reference for this project and is not modified by this repo.

## Privacy model

- No backend, analytics, telemetry, remote scripts, or AI API calls from the extension itself.
- No network requests of any kind (`connect-src 'none'` in the extension CSP).
- Permissions: `activeTab`, `scripting`, and `storage` (see `SECURITY.md` for why `storage` was added over the reference extension).
- Data enters only by manual paste; nothing is read from the clipboard automatically.
- Cache holds only the execution plan and its outcomes for the current profile, never raw research text — see `SECURITY.md`.

## Install for testing

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable **Developer mode**.
3. **Load unpacked** → select this folder.
4. Pin **ScraperX RTS Profile Assistant** to the toolbar.

## Repository layout

```
manifest.json
background/background.js       # injects the assistant on toolbar click
core/
  schema.js                    # canonical JSON schema + validator
  identityLock.js               # identity comparison (pure) + RTS-read stub
  duplicates.js                  # generic normalized-match duplicate detector
  cache.js                        # profile-scoped chrome.storage.local cache
  stateMachine.js                  # pending -> ... -> savedValueVerified
  executionPlan.js                  # validated JSON + registry -> action list
  adapters/
    textField.js                    # native-setter text/textarea adapter
    nativeSelect.js                   # native <select> adapter (exact match)
registry/index.js                # per-field selector registry, evidence-gated
content/panel.js, bootstrap.js   # shadow-DOM UI
tests/test-static.mjs            # node --test suite for the logic above
docs/
  stage1-assessment.md
  evidence-checklist.md
```

## Running tests

```
npm test
```

## Supported JSON (schema v1.0)

See `core/schema.js` for the authoritative shape. Top level: `schemaVersion`, `meta`, `profileIdentity`, `businessEntity`, `company`. Every mutable value carries an explicit `action` (`addIfMissing`, `updateIfBlank`, `replaceAfterConfirmation`, `skip`); unrestricted replacement is never allowed. `profileIdentity` must include `companyName` and at least one of `pbId`, `entityId`, or `domain`.

## Important limitations

- Custom/searchable dropdowns, the Industries popup, the person-search/management journey, and controlled auto-save are all unimplemented pending evidence — see `docs/evidence-checklist.md`.
- `identityLock.readRtsIdentityFromPage()` intentionally throws: reading PBID/Entity ID/domain from the live RTS page is not implemented until that DOM is evidenced.
