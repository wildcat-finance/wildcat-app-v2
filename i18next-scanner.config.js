module.exports = {
  input: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.stories.{ts,tsx}",
    "!**/node_modules/**",
  ],
  output: "./",
  options: {
    debug: false,
    removeUnusedKeys: false,
    sort: true,
    func: {
      list: ["t", "i18next.t"],
      extensions: [".ts", ".tsx"],
    },
    trans: {
      component: "Trans",
      i18nKey: "i18nKey",
      defaultsKey: "defaults",
      extensions: [],
    },
    lngs: ["en"],
    ns: ["en"],
    defaultLng: "en",
    defaultNs: "en",
    resource: {
      loadPath: "src/locales/{{lng}}/{{ns}}.json",
      savePath: "src/locales/{{lng}}/{{ns}}.json",
    },
    keySeparator: ".",
    nsSeparator: false,
    interpolation: {
      prefix: "{{",
      suffix: "}}",
    },
  },
}
