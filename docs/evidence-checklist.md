# Evidence checklist

Status of the DOM/visual evidence needed before each RTS workflow can be added to `registry/index.js` and enabled. A field moves from **Missing** to **Ready** only after all five evidence items exist for it:

1. The parent RTS section (screenshot or DOM extract).
2. The Add/Edit button that opens the control.
3. The opened form/popup.
4. Every dropdown, shown open, with its full option list.
5. The scoped Save button and the saved record afterward (to build read-back verification).

Evidence should be provided as raw outer HTML (copy from DevTools: right-click element → Copy → Copy outerHTML) plus a screenshot for visual context. Screenshots alone are not enough — they don't expose selectors.

## Status legend
- **Missing** — no evidence yet; field is not in the registry, or is present with `evidenceStatus: "missing"` and empty `candidates`.
- **In review** — evidence supplied, being turned into a registry entry.
- **Ready** — registry entry has real selector candidates and has been exercised at least once in a controlled test.

## Business Entity

| Field | Status | Notes |
| --- | --- | --- |
| Name variations (Add New Name Variation, Type dropdown, Save, verify) | **Ready** | `registry/businessEntity.nameVariations.js`, `core/workflows/businessEntityNameVariations.js`. Evidenced from Protocol DMC Spain (PBID 862926-85): native `<select class="businessEntityNameType">` with 9 exact options, `#addNameVariation`, `#saveBusinessEntityNameVariation` (scoped — distinct from the Entity section's own unrelated Save button), and the post-save `savedNameVariation` class + `data-defaultvalue` match used for read-back verification. "View All Name Variations" toggle selector still unconfirmed (text-fallback only). |
| Formal / Familiar / Former / Legal name, start date | Missing | |
| Parent / Spun Out Of lookups | Missing | |
| Entity ID / PBID (read-only, for identity lock) | **Ready** (PBID + domain; Entity ID still missing) | `identityLock.readRtsIdentityFromPage()` reads PBID from a `flat-button__caption`-prefixed span (hash-suffix tolerant), formal name from `input[name="formalNameVariations"]`, and domain from `#domainValue` with `#webURL`-derived fallback. Entity ID has no selector evidence yet but is not required for the lock to function (PBID/domain suffice). Applying name variations now works end to end once identity matches. |
| EIN / FEIN | **Out of scope** | User decision: not needed. |
| Entity Registration area | **Out of scope** | User decision: not needed. |
| CRD area | **Out of scope** | User decision: not needed. |
| Other Name Variations field | Missing | |
| Email Default Structure dropdown | **Ready** | `registry/businessEntity.general.js`, `core/workflows/businessEntityGeneral.js`. Full 42-option catalog evidenced (native `<select name="businessEntity.emailDefaultStructure.id">`). Shares the `#saveBusinessEntityButton` group (see below). |
| Entity Type control | **Out of scope** | User decision: not needed. |
| Primary Entity dropdown | **Out of scope** | User decision: not needed. |
| Company Financing Status dropdown | **Out of scope** | User decision: not needed. |
| Website Address | **Ready** | `#webURL`. Shares `#saveBusinessEntityButton` (id, `data-test-id="be-page-save-changes-btn"`) with Email Default Structure and Research Notes — all three are applied and saved together as one group (`core/workflows/businessEntityGeneral.js`). Save-completion signal (button returns to disabled) confirmed by the researcher. |
| Domains table (Primary/Favicon/Accept All Email Forms, Add Domain) | Missing | Distinct from Website Address — only a read-only example row was seen, with an apparently separate row-level Save button. Not implemented. |
| Research Notes (Business Entity level) | **Ready** | `.highlight-textarea` (a `contenteditable` div, not an input — new `core/adapters/contentEditable.js`). Same shared-save-group as above. Workflow appends new notes as new lines rather than overwriting, per the JSON `action` semantics. |
| Firm Logo | Missing | |
| Social Media Identifier table + Add form | Missing | The "New" button was shown `disabled`, and the only other evidence was an empty placeholder + a read-only example row from a different profile (reveals `identifierid`/`smnid`/`smnlink`/`smnnetwork` attributes, useful for future duplicate detection, but not an add-form). Still need: the Network dropdown options, the identifier input, and a Save button. |
| Query Tool / Activity Log / Gravity Identifier / Identifiers overview | Missing | |

## Company

| Field | Status | Notes |
| --- | --- | --- |
| Navigation to Company tab | Evidenced (infra, not a field) | `.navigation__text-hint`-prefixed span with text "Company"; not yet wired into any workflow since no Company field is ready to use it. |
| Name section | Missing | |
| Brief Description / Full Description | Missing | Both textareas share the exact same class (`text-input`) and Vue scope id, with no `id`/`name` to tell them apart — still need the surrounding container/label markup to disambiguate. The Save button **is** now known (`[data-test-id="description-keywords-save-btn"]`, shared with Keywords and Search Keywords), so this is the only remaining gap for these two fields. |
| Keywords | Missing, but narrowing | Confirmed to be a taxonomy-backed autocomplete; confirmed that both **clicking** a suggestion and pressing **Enter** confirm it. Still missing: whether Enter always confirms whatever is *first/highlighted* (which the screenshot showed as `"<text> (new)"` even when close existing matches ranked below it) — if so, typing text that exactly matches an existing taxonomy term and pressing Enter could still create a near-duplicate "(new)" tag instead of reusing the existing one. Need either (a) confirmation that an exact match is always ranked/highlighted first, ahead of "(new)", or (b) the suggestion list's outerHTML so a matching non-"(new)" item can be found and clicked explicitly. Not built yet — the duplicate-tag risk is real enough to wait for one of these. |
| Search Keywords | **In review** | `textarea[name="businessEntity.searchKeywords"]` + the shared Save button above. **Not yet built as code**: unlike the Business Entity General group, this Save button's outerHTML didn't show a `disabled` attribute either way, so there isn't even the weaker "started disabled" signal the other in-review fields have — the save-completion signal here is a bigger unknown. Needs: does this button start disabled/becomes enabled on edit, and does it return to disabled after a save? |
| Industries (primary radio, Add/Edit Industry popup, hierarchy) | Missing | **Architecture question resolved**: per your decision, the researcher will manually re-click the toolbar icon inside the popup window rather than the extension requesting a broader permission — no `tabs`/`windows` permission will be added. Still missing: the tree/checkbox DOM inside `rts.pitchbook.com/industryGroup/create.html` and its Save Changes button. |
| Published / Recommended Verticals, Add New Vertical | Missing | Also confirmed to open in a **separate browser window** (`rts.pitchbook.com/vertical/company-relation?companyId=...`), same as Industries — the same "manual re-click" resolution applies here too. The popup shows a "Recommended Verticals" table and an "Other Verticals" table with per-row **True/False** confirmation buttons (not a free-text add) — screenshot only, still need the actual row/button outerHTML and the Save button (likely below the visible screenshot area). |
| General section (Research/Financing/Ownership/Business/Publish status) | Missing | |
| Financing Status Notes / Research Notes (Company level) | Missing | Distinct from the Business Entity Research Notes already in review. |
| Business Status History / Ownership Status History | Missing | |
| Employee History, Add New Employee Count | Missing | Only the "Add New Employee Count" button caption was evidenced; no opened-form fields or Save button. |
| SIC records, Add New SIC Industry Path | **Ready** | `registry/company.sic.js`, `core/workflows/companySic.js`. Code input (`input.numberField[name="code"]`), Source dropdown (blank/Morningstar/PitchBook/SEC), Add button (`onclick="companySic.add()"`), and Save button (`#saveSicIndustryPath`) are wired up, tested, and the "returns to disabled after save" signal is confirmed. Still open (low risk — the workflow fails loudly rather than misbehaving if this is wrong): whether "Add New Sic Industry Path" really adds a simple inline row (assumed) rather than opening its own hierarchy popup like Industries/Verticals. |
| GECS | Missing | Only Add/Save button captions were evidenced (generic `button__caption` class, text "Add GECS" / "Save Changes"); no form fields at all. |
| NAICS | Missing | Add button has a stable `data-test-id="naics-add-button"` — good. Save button is only the generic caption pattern again. No form fields evidenced. |
| Rounds / Investors / Service Providers overview | **Out of scope** | Not requested. |
| Management overview, Add New Management, Management/Board links, Former Management | **Out of scope (user decision)** | User: "Let's not automate the management part" — duplicate-detection risk was the stated reason. This also matches the brief's own Stage 5 gating (full person-search → creation → relationship → save → verify chain required), so it stays off regardless. |
| Site Links, Add New Link, existing site table + edit form | Not wired to a workflow, but catalogs now captured | `registry/company.sites.js` holds the fully evidenced Site Type (3), Site Status (2), and Country (230) catalogs plus every known field selector, purely so `core/promptBuilder.js` can ask Rovo for structured site data now — `evidenceStatus: "missing"`, nothing is applied to RTS from it yet. Two separate site-related features, must not be conflated: (1) **Crawl Links** — `#addNewCrawlLink` → `#crawlLinkSite1` input → `#crawlSaveButtonSite1` (a correctly matched row-1 triple). Each row appears to save independently via its own numbered button. Still open: is `crawlLinkSite{n}` a fixed small set of pre-rendered numbered slots, or does clicking "Add New Link" append a new numbered slot each time? (2) **Add New Site form** (Site Name, Site Type, City, Country, Province — a plain text input, not a dropdown, Zip, Phone, Fax, Email, Status, one shared `#saveSiteInfoButton`). Address Line 1/2 confirmed correct: `site.address1` and `site.address2` both exist separately. Still unconfirmed: does "Add New Site" open inline or in a separate window (like Industries/Verticals), and no before/after-save confirmation for `#saveSiteInfoButton` specifically. |
| Attached Files / Company Activity Log | Missing | |

## Other outstanding items

- `selectors-data.js` / `test-static.mjs` / icon assets from the reference Conference ScraperX extension — referenced in the brief but not attached to this repo; only useful for comparison, not required to proceed.

## Sample Rovo output received (Psypher) — findings

A real Rovo JSON output for Psypher was supplied, but it's in the **old**, free-form/prose-style shape (`"Entity Details"`, `"Funding Timeline"`, etc.) — not the schema v1.0 shape from `core/promptBuilder.js`. It was not run through the new prompt, so it doesn't test the new pipeline end to end; that's still an open ask (re-run Psypher through the actual prompt in the panel). It was still useful to sanity-check the schema design against real research output:

- **Confirmed correct behavior**: the sample's "Email Default Structure" value was the literal email `info@psypher.in`, not a pattern like `FirstName@domain.com`. `applyEmailDefaultStructureValue`'s catalog match would correctly **reject** this rather than write garbage to RTS — a real, working example of the validator doing its job.
- **Conceptual mismatch to fix in the new prompt going forward**: the sample's SIC "Source" was `"OSHA SIC Manual"` (a citation for the code) — completely different from RTS's own SIC "Source" dropdown (`classificationSource`: Morningstar/PitchBook/SEC, meaning which data vendor classified it in RTS). A citation like this belongs in the generic provenance `source` URL, not `classificationSource`. Worth double-checking Rovo understands this distinction before trusting that field from real output.
- **Data-quality flag, not a code issue**: the sample's Employee Count (7) was sourced from `inc42.com/company/psypher-ai/` — that's about **"Psypher AI"**, which may not be the same company as "Psypher" the streetwear brand this research was for. The identity lock only checks the overall profile identity (PBID/domain), not each individual claim inside the JSON, so this kind of mix-up wouldn't be caught automatically — exactly why the preview step exists. Worth flagging to whoever maintains the Rovo agent's instructions.
- Name Variations, Other Name Variation, and SIC/NAICS codes in the sample map cleanly onto the new schema's shape once translated (not automated — see above).

## Sample Rovo output received (Aroma Grow Store, run through the actual new prompt) — findings

This one DID go through the real `core/promptBuilder.js` prompt, and surfaced two real issues, both now fixed:

1. **The prompt was too narrow.** It only asked for the 5 fields with a wired-up workflow, so everything else the researcher would want captured (description, keywords, industries, verticals, employee count, sites, social media, NAICS) was never requested at all. `core/promptBuilder.js` now requests the full schema-supported shape — every field the schema validates, whether or not a workflow exists for it yet — so the research only has to happen once. Fields without a workflow (e.g. `company.sites`, `company.industries`) still show up in the preview as skipped ("no registry entry yet"), same as before; nothing new is auto-applied. **Deliberately still excluded: `company.management`** — the prompt now explicitly tells Rovo not to research it, per the earlier decision not to automate that area at all.
2. **A markdown-link corruption pattern broke the JSON**, e.g. a source URL rendered as `"https://.../privacy-policy/[",](https://.../privacy-policy/%22,)"` — almost certainly from copying out of a chat UI that auto-linkifies bare URLs. This is now **detected and rejected with a specific, actionable message** (`core/schema.js`) instead of a cryptic parse error — deliberately not auto-repaired, since an early repair attempt was shown to silently produce a duplicated/wrong URL in one case and the correct value in another, with no reliable way to tell which case applies from the corrupted text alone. The prompt now also explicitly tells Rovo not to return markdown-formatted links, to reduce how often this happens upstream.

New catalogs now available for the prompt (Site Type, Site Status, 230 Countries) live in `registry/company.sites.js`, evidenced from the "Add New Site" form fields but not yet wired to any workflow.

## Second Aroma Grow Store run (after pasting the agent setup instructions) — findings

Real progress: the agent now returns one JSON object instead of a prose report (confirming the diagnosis that the fix belonged in the agent's own configuration, not the per-run prompt), and folded its usual content-provenance tags into an extra top-level `anc` key (`accepted_used`/`rejected_not_used`) rather than appending them as trailing text — harmless, since unknown top-level keys are only ever a warning, never a blocking error.

It still failed on `businessEntity.websiteAddresses[0].value`/`.source`, but the error message didn't show the actual offending value, so this was guessed at twice already (markdown-link corruption, then a trailing-slash) without being able to confirm either against the real string. **Fixed properly this time**: every schema validation error now includes the actual received value (`core/schema.js`), so any future failure is self-diagnosable from the error text alone — no more screenshots or guessing needed. A likely candidate for this specific recurring failure: the agent's old habitual phrase "Not found on the official website." leaking into a field instead of JSON `null`, given that's exactly the phrasing its old prose format used — the next error message will confirm or rule this out directly.

## QA pass after the third round of manual editing/troubleshooting

A full audit of `content/panel.js` and everything it calls, prompted directly by feedback that the preview was unreadable and it was unclear whether a manual edit actually took effect. Findings:

- **Real bug, fixed**: `getEditedValue()` parsed an edited record with `JSON.parse()` and silently fell back to the *original, pre-edit* value on any parse failure — a manual correction could vanish with no warning, and the wrong value would get published instead. Root cause of "I don't know if editing worked."
- **Real UX defect, fixed**: a multi-field record (e.g. a name variation: name/type/action/source/sourceDate/confidence) was rendered as a raw `JSON.stringify()` blob in a 2-row textarea — illegible, and editing it safely required understanding JSON syntax. The preview now renders each proposed change as its own card with every field as its own labeled input — no JSON involved, so the parse-failure bug above is eliminated by construction rather than patched around.
- **Audited and confirmed correct** (not bugs): every other `catch` block in the codebase either surfaces an error to the user or has a documented, safe fallback (`grep -rn "catch {"` across `core/`, `content/`, `registry/` — 9 sites, all reviewed). No workflow or adapter silently swallows an error; every failure propagates up to the panel, which reports it per-row.
- **Removed**: one dead variable (`isSelected`) left over from an earlier version of the publish handler.

Still an open question, not a bug: which specific value in `websiteAddresses[0]` actually failed. The enhanced error message (above) will show it precisely on the next run.
