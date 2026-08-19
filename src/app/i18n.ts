import { Resource, createInstance, i18n } from "i18next"
import resourcesToBackend from "i18next-resources-to-backend"
import { initReactI18next } from "react-i18next/initReactI18next"

import i18nConfig from "../../i18nConfig"

export default async function initTranslations(
  locale: string,
  namespaces: string[],
  i18nInstance?: i18n,
  resources?: Resource,
) {
  i18nInstance = i18nInstance || createInstance()

  const isDev = process.env.NODE_ENV !== "production"

  i18nInstance.use(initReactI18next)

  if (!resources) {
    i18nInstance.use(
      resourcesToBackend(
        (language: string, namespace: string) =>
          import(`@/locales/${language}/${namespace}.json`),
      ),
    )
  }

  await i18nInstance.init({
    lng: locale,
    resources,
    fallbackLng: i18nConfig.defaultLocale,
    supportedLngs: i18nConfig.locales,
    defaultNS: namespaces[0],
    fallbackNS: namespaces[0],
    ns: namespaces,
    preload: resources ? [] : i18nConfig.locales,
    // i18next's default escaping is wrong for React twice over. React already
    // escapes text nodes, so escaping here shows the user entity codes: a token
    // symbol "ETH/USD" renders as the literal "ETH&#x2F;USD", and worse through
    // <Trans>, where the value is escaped by the interpolator and again by the
    // AST walk ("ETH&amp;#x2F;USD"). Token symbols and market names come from
    // chain data, so this is not a theoretical input.
    //
    // Turning escaping off entirely fixes that but opens a different hole: with
    // it off, <Trans> parses the resolved string as markup, so a third-party
    // value containing tag syntax becomes real elements -- "<strong>x</strong>"
    // renders bold, and a stray "</strong>" breaks out and mangles the
    // components mapping. No script executes (react-i18next drops attributes),
    // but the layout is defaceable.
    //
    // So escape exactly the two characters that start a tag and nothing else.
    // Verified against this repo's i18next 23.10.1 / react-i18next 14.1.0: "/",
    // "&", "'" and '"' pass through untouched and render correctly, while tag
    // syntax comes out as inert text through both t() and <Trans>.
    interpolation: {
      escapeValue: true,
      escape: (value) =>
        typeof value === "string"
          ? value.replace(/</g, "&lt;").replace(/>/g, "&gt;")
          : String(value),
    },
    // Surfaces a key that only breaks on a specific runtime path, which neither
    // i18n:check nor i18n:verify can reach.
    saveMissing: isDev,
    missingKeyHandler: isDev
      ? (lngs, ns, key) => {
          if (typeof window !== "undefined") {
            // eslint-disable-next-line no-console
            console.warn(`[i18n] missing key: ${key}`)
          }
        }
      : undefined,
  })

  return {
    i18n: i18nInstance,
    resources: i18nInstance.services.resourceStore.data,
    t: i18nInstance.t,
  }
}
