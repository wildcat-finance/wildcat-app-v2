"use client"

import { ReactNode, useState } from "react"

import { Resource, createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"

import initTranslations from "@/app/i18n"

export default function TranslationsProvider({
  children,
  locale,
  namespaces,
  resources,
}: {
  children: ReactNode
  locale: string
  namespaces: string[]
  resources: Resource
}) {
  const [i18n] = useState(() => {
    const instance = createInstance()

    initTranslations(locale, namespaces, instance, resources)

    return instance
  })

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
