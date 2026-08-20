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
    // React escapes text nodes itself. Escaping again in i18next displays entity
    // codes for ordinary values such as token symbols. Our local Trans wrapper
    // adds a narrower boundary before react-i18next parses translated markup.
    interpolation: { escapeValue: false },
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
