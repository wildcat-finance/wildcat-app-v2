# Internationalization conventions

The app currently ships an English resource at
`src/locales/en/en.json`. The structure is intended to support additional
locales without another application-wide key migration.

## Key placement

Use the narrowest stable product surface that owns the copy:

- `common.*` for genuinely shared atoms that should change together everywhere
- `nav.*`, `header.*`, and `footer.*` for application chrome
- `modals.*` for reusable dialogs
- `marketList.*`, `marketDetails.*`, and `marketParameters.*` for market UI
- `borrower.*`, `lender.*`, `admin.*`, and `profile.*` for role-specific flows
- `auth.*`, `validation.*`, `notifications.*`, and `agreement.*` for their
  corresponding domains

Keep keys at six segments or fewer. Name keys after their meaning or placement,
not their current English wording.

Identical English copy does not automatically belong under one key. Different
surfaces may need different grammar or product wording in another language. The
duplicate-value check is therefore advisory: reuse a `common.*` atom only when
all call sites are intended to change together.

## Call sites

Translation keys must remain statically discoverable:

```tsx
t("marketDetails.lender.transactions.deposit.button")
```

Do not build keys with template interpolation or concatenation. For runtime
variants, use an exhaustive map of literal keys and pass the selected value to
`t()`.

Do not pass a default English value to `t()`. A fallback hides missing resources
from both the checks and the user until another locale is enabled.

Use the protected `<Trans>` exported by `@/components/Translation` when a
resource contains component tags; direct imports from `react-i18next` are
blocked. Use `t()` for plain text. Every `{{placeholder}}` in a resource must be
supplied at the call site.

User-visible JSX text must use a translation key. User-visible attributes such
as `label`, `placeholder`, `title`, `alt`, and `aria-label` must also use keys.
Tests, stories, API code, low-level utilities, and proper names explicitly listed
by the checker are exempt from the hardcoded-copy rules.

## Adding or changing copy

1. Add or update the English resource in `src/locales/en/en.json`.
2. Reference the key literally, or add it to an exhaustive key map.
3. Use interpolation for data, not for sentence fragments or key construction.
4. Run the locale gates and the relevant application tests.
5. Remove keys when their final call site is removed.

## Checks

Run:

```sh
npm run lint:errors
npm run i18n:check
npm run i18n:verify
```

The checks cover complementary concerns:

- ESLint rejects hardcoded JSX text.
- `i18n:check` rejects missing or dynamic keys, hidden default values, invalid
  sections or depth, hardcoded user-visible attributes, and orphaned resources.
  Repeated English values are reported as a warning for human review.
- `i18n:verify` resolves real call sites through i18next and rejects keys that
  render raw, resolve to objects, omit placeholders, or pass tagged resources to
  `t()`.

The pre-commit hook invokes the two locale scripts with `--staged`, so partial
commits are checked against the Git index rather than unrelated working-tree
changes. CI runs the complete lint and locale gates against the committed tree.
