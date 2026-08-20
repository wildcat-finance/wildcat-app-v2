/* eslint-disable import/no-extraneous-dependencies */
import { render } from "@testing-library/react"
import { Resource } from "i18next"
import { I18nextProvider } from "react-i18next"

import initTranslations from "@/app/i18n"

import { Trans } from "./index"

const resources: Resource = {
  en: {
    en: {
      plain: "Market: {{value}}",
      rich: "Market: <strong>{{value}}</strong>",
    },
  },
}

describe("translation interpolation", () => {
  it("lets React render ordinary values without i18next entity codes", async () => {
    const { t } = await initTranslations("en", ["en"], undefined, resources)
    const value = `ETH/USD & < 0.01 'quoted' "double"`

    const { container } = render(<span>{t("plain", { value })}</span>)

    expect(container.textContent).toBe(`Market: ${value}`)
  })

  it("renders tag-shaped Trans values as text without changing the component tree", async () => {
    const { i18n } = await initTranslations("en", ["en"], undefined, resources)
    const value = "</strong><strong>untrusted</strong><strong> & ETH/USD"

    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <Trans
          i18nKey="rich"
          values={{ value }}
          components={{ strong: <strong /> }}
        />
      </I18nextProvider>,
    )

    expect(container.textContent).toBe(`Market: ${value}`)
    expect(container.querySelectorAll("strong")).toHaveLength(1)
  })
})
