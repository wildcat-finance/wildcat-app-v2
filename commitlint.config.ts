// Commitlint configuration enforcing Conventional Commits.
// Format: <type>(<scope>?): <description>
// Docs: https://www.conventionalcommits.org/en/v1.0.0/

module.exports = {
  // Use the standard conventional rules as a base
  extends: ["@commitlint/config-conventional"],

  rules: {
    /**
     * Allowed commit types.
     * Keep scope optional (we do NOT force a scope).
     */
    "type-enum": [
      2,
      "always",
      [
        "feat", // a new feature
        "fix", // a bug fix
        "chore", // tooling, maintenance, no production code change
        "docs", // documentation only changes
        "refactor", // code change that neither fixes a bug nor adds a feature
        // Common extras:
        "build", // build system or external dependencies
        "ci", // CI configuration files and scripts
        "perf", // performance improvements
        "test", // adding or correcting tests
        "revert", // revert a previous commit
        "style", // formatting, missing semicolons, etc.; no code change
      ],
    ],

    /**
     * Disallow an empty subject (the short description after the type/scope).
     */
    "subject-empty": [2, "never"],

    /**
     * Do not allow a trailing period in the subject line.
     * Example: "feat: add X." ❌  -> should be "feat: add X" ✅
     */
    "subject-full-stop": [2, "never", "."],

    /**
     * Keep the entire header (type + scope + colon + subject) within a sane length.
     */
    "header-max-length": [2, "always", 100],

    /**
     * Do not enforce title-casing for the subject; allow lowercase, etc.
     * (Disallow common title-case/upper-case variants.)
     */
    "subject-case": [
      2,
      "never",
      ["sentence-case", "start-case", "pascal-case", "upper-case"],
    ],

    /**
     * A type must always be present (e.g., "feat:", "fix:", etc.).
     */
    "type-empty": [2, "never"],

    /**
     * If a body/footer exists, it must start after a blank line.
     * This keeps commit messages readable.
     */
    "body-leading-blank": [2, "always"],
    "footer-leading-blank": [2, "always"],
  },

  // Notes:
  // - By default, commitlint ignores merge/fixup/squash commits.
  //   If you need to lint them too, add: defaultIgnores: false
  // - Scope is optional. If you want to restrict scopes, enable:
  //   'scope-enum': [2, 'always', ['app', 'sdk', 'ui', 'api']]
}
