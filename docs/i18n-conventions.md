# i18n conventions

`src/locales/en/en.json` is the **single source of truth** for every
user-visible string in the app. The locale file ships one namespace (`"en"`)
loaded via SSR in `src/app/[locale]/layout.tsx` and hydrated by
`src/components/TranslationsProvider`.

## Rules

1. **No hardcoded user-visible strings.** Anything a user sees — JSX text,
   `title` / `placeholder` / `label` / `aria-label` / `alt` / `helperText` /
   `headerName` attributes, toast messages, status chip labels, empty/error
   states — goes through `t()` or `<Trans i18nKey="...">`.
2. **camelCase segments**, dot-notation between segments.
3. **Max depth: 5 levels.** A 6th level is a smell — extract an atom into
   `common.*` or flatten the section.
4. **Atoms live in `common.*` only.** If the same wording appears in ≥2
   places with the same meaning, it MUST be a `common.*` key and both call
   sites reference it. Do not redefine "Cancel", "Search", "Yes", "No",
   "Loading…", "Wallet Address" inside a feature section.
5. **Static keys only.** Never construct a key via concatenation or template
   literals (e.g. `` t(`foo.${x}`) `` is banned). If you need a switch by
   value, use an explicit map of allowed keys.
6. **No `defaultValue` fallbacks.** We are single-locale; a missing key must
   be visible (logged in dev), not silently masked.
7. **No new strings outside the locale file.** This includes
   "developer-facing" error strings that bubble up to a toast — those are
   user-visible.

## Top-level section map

| Section | Purpose |
| --- | --- |
| `common.buttons` | Button labels reused across pages (`confirm`, `cancel`, `save`, `back`, `next`, `close`, `apply`, `clear`, `search`, `submit`, `edit`, `delete`, `view`, `copy`, `add`, `remove`, `selectAll`, `deselectAll`, `retry`, …). |
| `common.fields` | Reused field/column names (`name`, `walletAddress`, `marketName`, `tokenSymbol`, `underlyingAsset`, `apr`, `crr`, `totalDebt`, `status`, `jurisdiction`, `marketDescription`, `mla`, …). |
| `common.placeholders` | Reused input placeholders (`pleaseSelect`, `searchByName`, `enterAddress`, `enterAmount`, `range0to100`, …). |
| `common.states` | Reused UI states (`loading`, `error`, `empty`, `noData`, `noResults`, `comingSoon`). |
| `common.units` | Display units (`percent`, `days`, `hours`, `apr`, `usd`). |
| `common.yesNo` | `yes`, `no`, `na`. |
| `common.errors` | Reused error phrases that surface in UI. |
| `nav` | Sidebar / header navigation, breadcrumbs, "Back to …". |
| `header` | Top-bar: role switch, network switch, wallet connect. |
| `footer` | Links, copyright, cookies-settings. |
| `validation` | Form validation messages (yup/zod). |
| `notifications` | Toast / in-app notifications; tx outcome strings. |
| `agreement` | `/agreement` page. |
| `modals.shared` | HelpModal, TxModal, generic confirm modals. |
| `marketList` | Market list pages (shared between roles). Sub-divided into `shared` / `lender` / `borrower`. |
| `marketDetails` | Market detail pages (shared between roles). Sub-divided into `shared` / `lender` / `borrower`. |
| `marketParameters` | Market-parameter content (deposit access, market type, early closure, maturity reduction, APR, CRR, …). Shared between roles. |
| `borrower` | Borrower-only pages outside markets (`createMarket`, `editPolicy`, `editLenders`, `profile`, `invitation`). |
| `lender` | Lender-only pages outside markets (reserved). |
| `admin` | Admin pages (`borrowers`, `invites`, `inviteBorrower`, `editBorrower`). |
| `profile` | Read-only `/profile`. |

## Where does this string go?

```
Is the wording used in ≥2 unrelated places with the same meaning?
├── yes  → common.<group>.<key>
└── no   → Is the page used by both lender and borrower?
           ├── yes  → marketList | marketDetails | marketParameters
           │         (with .shared / .lender / .borrower subdivision)
           └── no   → <role>.<page>.<block>.<element>
                     (or admin.* / profile.* for those areas)
```

## Examples

Good:

```ts
t("common.buttons.cancel")
t("common.fields.walletAddress")
t("marketDetails.borrower.modals.terminate.title")
t("marketList.shared.columns.marketName")
t("marketParameters.marketType.FixedTerm.text")
t("admin.borrowers.table.columns.signedAt")
```

Bad:

```ts
t("borrowerMarketDetails.modals.terminate.cancel")  // 'cancel' is an atom
t(`borrower.${page}.title`)                          // dynamic key
t("foo.bar", "Some default")                         // default value
<Typography>Wallet Address</Typography>              // hardcoded
```

## Adding a new key

1. Search `src/locales/en/en.json` for the exact wording first — it may
   already exist under `common.*`.
2. Choose the section by the decision tree above.
3. Place the key under the lowest meaningful sub-section. If you find
   yourself at 6 levels deep, stop and refactor the parent group.
4. Use it via `t("…")` or `<Trans i18nKey="…">`. Never via
   `` t(`…${dynamic}`) ``.

## Tooling

- **Dev runtime:** `src/app/i18n.ts` is configured with `saveMissing` and a
  `missingKeyHandler` that logs `[i18n] missing key: <path>` to the browser
  console whenever a `t()` call hits a missing key in non-production builds.
  If you see one of those warnings during local dev, fix it before opening
  the PR.
- **Lint:** `eslint-plugin-i18next`'s `i18next/no-literal-string` rule is
  enabled at `warn` level with a focused whitelist (technical attributes,
  test files, Storybook, theme tokens, hooks/utils/providers/store/lib/API
  routes). The rule will flag new hardcoded user-visible strings in PRs —
  treat warnings as a checklist, not noise.
