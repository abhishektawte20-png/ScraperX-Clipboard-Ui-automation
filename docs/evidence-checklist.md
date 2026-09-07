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
| Email Default Structure dropdown | **In review** | `registry/businessEntity.general.js`, `core/workflows/businessEntityGeneral.js`. Full 42-option catalog evidenced (native `<select name="businessEntity.emailDefaultStructure.id">`). Shares the `#saveBusinessEntityButton` group (see below) — needs the same save-heuristic confirmation. |
| Entity Type control | **Out of scope** | User decision: not needed. |
| Primary Entity dropdown | **Out of scope** | User decision: not needed. |
| Company Financing Status dropdown | **Out of scope** | User decision: not needed. |
| Website Address | **In review** | `#webURL`. Shares `#saveBusinessEntityButton` (id, `data-test-id="be-page-save-changes-btn"`) with Email Default Structure and Research Notes — all three are applied and saved together as one group (`core/workflows/businessEntityGeneral.js`). **Open gap**: the Save button was evidenced starting `disabled="disabled"`; no before/after-save screenshot pair was supplied, so the workflow's "becomes disabled again after a successful save" verification signal is an inference, not confirmed. One quick manual check (does the button re-disable after a real save?) flips this group from `evidenceStatus: "in-review"` to `"ready"`. |
| Domains table (Primary/Favicon/Accept All Email Forms, Add Domain) | Missing | Distinct from Website Address — only a read-only example row was seen, with an apparently separate row-level Save button. Not implemented. |
| Research Notes (Business Entity level) | **In review** | `.highlight-textarea` (a `contenteditable` div, not an input — new `core/adapters/contentEditable.js`). Same shared-save-group and open gap as above. Workflow appends new notes as new lines rather than overwriting, per the JSON `action` semantics. |
| Firm Logo | Missing | |
| Social Media Identifier table + Add form | Missing | The "New" button was shown `disabled`, and the only other evidence was an empty placeholder + a read-only example row from a different profile (reveals `identifierid`/`smnid`/`smnlink`/`smnnetwork` attributes, useful for future duplicate detection, but not an add-form). Still need: the Network dropdown options, the identifier input, and a Save button. |
| Query Tool / Activity Log / Gravity Identifier / Identifiers overview | Missing | |

## Company

| Field | Status | Notes |
| --- | --- | --- |
| Navigation to Company tab | Evidenced (infra, not a field) | `.navigation__text-hint`-prefixed span with text "Company"; not yet wired into any workflow since no Company field is ready to use it. |
| Name section | Missing | |
| Brief Description / Full Description | Missing | Both textareas share the exact same class (`text-input`) and Vue scope id, with no `id`/`name` to tell them apart — still need the surrounding container/label markup to disambiguate. The Save button **is** now known (`[data-test-id="description-keywords-save-btn"]`, shared with Keywords and Search Keywords), so this is the only remaining gap for these two fields. |
| Keywords | Missing | Confirmed (via screenshot) to be a taxonomy-backed autocomplete: typing shows a dropdown of existing matches plus a `"<text> (new)"` option to create one. Still need the outerHTML of that suggestion dropdown/list-item structure and how a suggestion is confirmed (click vs Enter) before this can be built without guessing. Save button now known (shared, see above). |
| Search Keywords | **In review** | `textarea[name="businessEntity.searchKeywords"]` + the shared Save button above. **Not yet built as code**: unlike the Business Entity General group, this Save button's outerHTML didn't show a `disabled` attribute either way, so there isn't even the weaker "started disabled" signal the other in-review fields have — the save-completion signal here is a bigger unknown. Needs: does this button start disabled/becomes enabled on edit, and does it return to disabled after a save? |
| Industries (primary radio, Add/Edit Industry popup, hierarchy) | Missing | **Architecture question resolved**: per your decision, the researcher will manually re-click the toolbar icon inside the popup window rather than the extension requesting a broader permission — no `tabs`/`windows` permission will be added. Still missing: the tree/checkbox DOM inside `rts.pitchbook.com/industryGroup/create.html` and its Save Changes button. |
| Published / Recommended Verticals, Add New Vertical | Missing | Also confirmed to open in a **separate browser window** (`rts.pitchbook.com/vertical/company-relation?companyId=...`), same as Industries — the same "manual re-click" resolution applies here too. The popup shows a "Recommended Verticals" table and an "Other Verticals" table with per-row **True/False** confirmation buttons (not a free-text add) — screenshot only, still need the actual row/button outerHTML and the Save button (likely below the visible screenshot area). |
| General section (Research/Financing/Ownership/Business/Publish status) | Missing | |
| Financing Status Notes / Research Notes (Company level) | Missing | Distinct from the Business Entity Research Notes already in review. |
| Business Status History / Ownership Status History | Missing | |
| Employee History, Add New Employee Count | Missing | Only the "Add New Employee Count" button caption was evidenced; no opened-form fields or Save button. |
| SIC records, Add New SIC Industry Path | **In review** | `registry/company.sic.js`, `core/workflows/companySic.js`. Code input (`input.numberField[name="code"]`), Source dropdown (blank/Morningstar/PitchBook/SEC), Add button (`onclick="companySic.add()"`), and Save button (`#saveSicIndustryPath`, evidenced starting `disabled="disabled"`) are all wired up and tested, using the same inferred (unconfirmed) "returns to disabled after save" signal as the Business Entity General group. Still open: whether "Add New Sic Industry Path" really adds a simple inline row (assumed) rather than opening its own hierarchy popup like Industries/Verticals — not screenshotted either way. |
| GECS | Missing | Only Add/Save button captions were evidenced (generic `button__caption` class, text "Add GECS" / "Save Changes"); no form fields at all. |
| NAICS | Missing | Add button has a stable `data-test-id="naics-add-button"` — good. Save button is only the generic caption pattern again. No form fields evidenced. |
| Rounds / Investors / Service Providers overview | **Out of scope** | Not requested. |
| Management overview, Add New Management, Management/Board links, Former Management | **Out of scope (user decision)** | User: "Let's not automate the management part" — duplicate-detection risk was the stated reason. This also matches the brief's own Stage 5 gating (full person-search → creation → relationship → save → verify chain required), so it stays off regardless. |
| Site Links, Add New Link, existing site table + edit form | Missing — **evidence has open inconsistencies, flagged rather than assumed** | Two separate site-related features were evidenced and must not be conflated: (1) a "crawl link" feature (`#addNewCrawlLink` → `#crawlLinkSite1` input → save button `#crawlSaveButtonSite2`) — **the input is numbered 1 and its save button is numbered 2, which may mean they were captured from two different rows, not a matched pair**; needs a single row's input+save button together to confirm. (2) A fuller "Add New Site" form (Site Name, Site Type dropdown, City, Country dropdown with ~150 countries, Province, Zip, Phone, Fax, Email, Status dropdown, one shared `#saveSiteInfoButton`) — this one looks internally consistent, **except** the field labeled "Address Line 1" has `name="site.address2"` in the actual markup, which is worth double-checking (is there a separate `site.address1`, and does `address2` really mean "Address Line 1" here, or was this a copy mix-up?) before it's trusted. Also unconfirmed: does "Add New Site" open inline on the page or in a separate window (like Industries/Verticals)? |
| Attached Files / Company Activity Log | Missing | |

## Other outstanding items

- Sample Rovo JSON output (e.g. the referenced Psypher example) — needed to sanity-check the canonical schema against real agent output.
- `selectors-data.js` / `test-static.mjs` / icon assets from the reference Conference ScraperX extension — referenced in the brief but not attached to this repo; only useful for comparison, not required to proceed.
