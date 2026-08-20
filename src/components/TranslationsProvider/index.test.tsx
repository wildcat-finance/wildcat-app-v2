/* eslint-disable import/no-extraneous-dependencies */
import { render } from "@testing-library/react"
import { Resource, i18n } from "i18next"
import { useTranslation } from "react-i18next"

import { MarketCycleChip } from "@/components/MarketCycleChip"
import english from "@/locales/en/en.json"
import { MarketStatus } from "@/utils/marketStatus"

import TranslationsProvider from "./index"

const resources: Resource = {
  en: { en: english },
}

const TranslationSmokeTest = ({ instances }: { instances: Set<i18n> }) => {
  const { i18n: instance, t } = useTranslation()

  instances.add(instance)

  return (
    <>
      <span>{t("common.labels.deposit")}</span>
      <MarketCycleChip status={MarketStatus.HEALTHY} time="3 days" />
    </>
  )
}

describe("TranslationsProvider", () => {
  it("renders the real English resource without replacing i18next on rerender", () => {
    const instances = new Set<i18n>()
    const children = <TranslationSmokeTest instances={instances} />
    const { container, rerender } = render(
      <TranslationsProvider
        locale="en"
        namespaces={["en"]}
        resources={resources}
      >
        {children}
      </TranslationsProvider>,
    )

    expect(container.textContent).toContain("Deposit")
    expect(container.textContent).toContain("Ongoing Cycle")
    expect(container.textContent).toContain("3 days left")

    rerender(
      <TranslationsProvider
        locale="en"
        namespaces={["en"]}
        resources={resources}
      >
        {children}
      </TranslationsProvider>,
    )

    expect(instances.size).toBe(1)
  })
})
