/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"
import {
  SignerOrProvider,
  SupportedChainId,
  Token,
} from "@wildcatfi/wildcat-sdk"
import { Resource } from "i18next"
import { I18nextProvider } from "react-i18next"

import type { WithdrawalBatchJoinWarningResult } from "@/app/[locale]/lender/market/[address]/hooks/useWithdrawalBatchJoinWarning"
import initTranslations from "@/app/i18n"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import en from "@/locales/en/en.json"

import { WithdrawalBatchJoinWarning } from "./WithdrawalBatchJoinWarning"

const token = new Token(
  SupportedChainId.Sepolia,
  "0x0000000000000000000000000000000000000001",
  "USD Coin",
  "USDC",
  6,
  false,
  {} as SignerOrProvider,
)

const renderWarning = async (warning: WithdrawalBatchJoinWarningResult) => {
  const resources: Resource = { en: { en } }
  const { i18n } = await initTranslations("en", ["en"], undefined, resources)
  return render(
    <I18nextProvider i18n={i18n}>
      <WithdrawalBatchJoinWarning warning={warning} />
    </I18nextProvider>,
  )
}

const baseWarning = {
  expiry: 1,
  openedSecondsAgo: 52 * 60,
  remainingSeconds: 2 * 60 * 60 + 8 * 60,
  refresh: jest.fn(),
}

describe("WithdrawalBatchJoinWarning", () => {
  it("shows the estimated payout, reallocation, expiry, and docs link", async () => {
    const { container } = await renderWarning({
      ...baseWarning,
      state: "warning",
      estimate: {
        estimatedPayout: token.getAmount(49_964_150_000n),
        estimatedLoss: token.getAmount(35_850_000n),
        lossPercentThousandths: 72n,
      },
    })

    expect(container.textContent).toContain(
      "You are joining a batch that opened 52 minutes ago",
    )
    expect(container.textContent).toContain("49,964.15 USDC")
    expect(container.textContent).toContain(
      "35.85 USDC (0.072% of your request)",
    )
    expect(container.textContent).toContain("protocol design, not a fee")
    expect(container.textContent).toContain(
      "Batch closes in 2 hours, 8 minutes",
    )

    const docsLink = screen.getByRole("link", { name: "Read the docs" })
    expect(docsLink.getAttribute("href")).toBe(
      EXTERNAL_LINKS.DOCS_WITHDRAWAL_BATCH_INTEREST,
    )
  })

  it("does not silently hide a failed batch estimate", async () => {
    const { container } = await renderWarning({
      ...baseWarning,
      state: "unknown",
      estimate: undefined,
    })

    expect(container.textContent).toContain(
      "Unable to verify withdrawal batch pricing",
    )
    expect(container.textContent).toContain(
      "Continuing may make less than the requested amount claimable",
    )
  })
})
