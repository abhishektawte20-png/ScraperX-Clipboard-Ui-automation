# ScraperX RTS Profile Assistant

A Chrome/Edge Manifest V3 extension that maps structured JSON from a ScraperX Rovo research agent into PitchBook RTS Business Entity and Company fields, with profile identity locking, preview/conflict review, and profile-scoped caching.

**Current status.** `businessEntity.nameVariations` (Add New Name Variation, Type dropdown, scoped Save, saved-value verification) is fully evidenced, implemented, and unblocked by a working identity lock (reads PBID/domain/formal name from the live RTS page). Website Address, Email Default Structure, Research Notes (Business Entity level), and Company SIC records are implemented and tested but held at `evidenceStatus: "in-review"` — each has a Save button whose "saved successfully" signal is inferred, not directly confirmed (see `docs/evidence-checklist.md`); one quick manual check per group flips it to `"ready"`. Everything else is still preview-only. Management is out of scope by explicit decision (duplicate-detection risk). Industries and Verticals both open their Add/Edit UI in a separate browser window; by decision, this stays a manual step (researcher re-clicks the toolbar icon in that window) rather than requesting a broader `tabs`/`windows` permission.

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
  identityLock.js               # identity comparison + RTS-read (PBID/domain/formal name)
  duplicates.js                  # generic normalized-match duplicate detector
  cache.js                        # profile-scoped chrome.storage.local cache
  stateMachine.js                  # pending -> ... -> savedValueVerified
  executionPlan.js                  # validated JSON + registry -> action list
  adapters/
    textField.js                    # native-setter text/textarea adapter
    nativeSelect.js                   # native <select> adapter (exact match)
    contentEditable.js                 # contenteditable adapter (e.g. Research Notes)
  workflows/
    businessEntityNameVariations.js     # ready
    businessEntityGeneral.js             # in-review (Website Address, Email Default Structure, Research Notes)
    companySic.js                         # in-review
registry/
  index.js                        # aggregates per-field registry files
  businessEntity.nameVariations.js  # ready
  businessEntity.general.js          # in-review
  company.sic.js                      # in-review
content/panel.js, bootstrap.js   # shadow-DOM UI
tests/
  test-static.mjs                 # pure-logic suite (schema, cache, state machine, execution plan)
  test-name-variations.mjs        # jsdom suite for the name-variations workflow
  test-identity-lock.mjs           # jsdom suite for RTS identity reading
  test-business-entity-general.mjs  # jsdom suite for the shared-save-group workflow
  test-company-sic.mjs              # jsdom suite for the SIC workflow
fixtures/
docs/
  stage1-assessment.md
  evidence-checklist.md
```

## Running tests

```
npm install   # first time only, pulls in jsdom (devDependency, used only for DOM-level tests)
npm test
```

## Supported JSON (schema v1.0)

See `core/schema.js` for the authoritative shape. Top level: `schemaVersion`, `meta`, `profileIdentity`, `businessEntity`, `company`. Every mutable value carries an explicit `action` (`addIfMissing`, `updateIfBlank`, `replaceAfterConfirmation`, `skip`); unrestricted replacement is never allowed. `profileIdentity` must include `companyName` and at least one of `pbId`, `entityId`, or `domain`.

## Important limitations

- Custom/searchable dropdowns, the Industries popup, Keywords' likely-taxonomy-backed autocomplete, and controlled auto-save are all unimplemented pending evidence — see `docs/evidence-checklist.md`.
- `identityLock.readRtsIdentityFromPage()` reads PBID, domain (with a Website-Address-derived fallback), and formal name. Entity ID has no selector evidence yet, but isn't required — PBID/domain are enough to lock the profile.
- The "View All Name Variations" expand toggle's selector is unconfirmed; the workflow falls back to its exact visible text if the Add button isn't already present in the DOM.
- The primary Formal Name field (`input[name="formalNameVariations"]`) shares the `businessEntityName` class with variation rows; the registry selector explicitly excludes it (`:not(.businessEntityNameMain)`) so it's never misread as a variation or overwritten.
- Website Address, Email Default Structure, and Research Notes (Business Entity) share one Save button and are held at `evidenceStatus: "in-review"` because the "saved successfully" signal (Save button returns to `disabled`) is inferred rather than directly evidenced — the panel's Apply flow won't run them until that's confirmed and the status is flipped to `"ready"`.
- **Management is out of scope by decision** (duplicate-detection risk), not just missing evidence — it will not be revisited without an explicit request.
- **Industries has an open architecture question**: its "Add/Edit Industry" control opens a separate browser window, not an in-page popup, which the current `activeTab`/`scripting`-only permission model can't reach without a new, explicitly justified permission. See `docs/evidence-checklist.md`.
