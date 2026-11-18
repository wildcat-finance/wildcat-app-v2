/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen, within } from "@testing-library/react"
import type { MarketAccount } from "@wildcatfi/wildcat-sdk"

import { MarketMLA } from "."

const MARKET = "0x8172fcd937572b00b3824576f3af08a761ab7ca9"
const signMla = jest.fn()
let mockMarketMla: unknown

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) =>
      values?.name ? `${key}:${values.name}` : key,
  }),
}))
jest.mock("@/app/[locale]/borrower/components/CustomMlaLoginHint", () => ({
  CustomMlaLoginHint: () => null,
}))
jest.mock("@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates", () => ({
  useGetMlaTemplates: () => ({
    data: [
      {
        id: 7,
        isTestnet: true,
        name: "Stormwind Custom MLA",
        version: "1",
        borrowerId: "11111111-1111-4111-8111-111111111111",
      },
    ],
    isLoggedIn: true,
  }),
}))
jest.mock("@/app/[locale]/borrower/hooks/mla/usePreviewMla", () => ({
  usePreviewMla: (_market: unknown, templateId: number | undefined) => ({
    data: templateId
      ? {
          htmlWithPlaceholders: "<p>Stormwind agreement</p>",
          mlaTemplate: { id: templateId },
        }
      : undefined,
    isLoading: false,
  }),
}))
jest.mock("@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla", () => ({
  useBorrowerProfileTmp: () => ({
    data: { name: "Stormwind" },
    isLoading: false,
  }),
  useSetMarketMLA: () => ({ mutate: signMla, isPending: false }),
}))
jest.mock("@/hooks/useMarketMla", () => ({
  useMarketMla: () => ({ data: mockMarketMla, isLoading: false }),
}))
jest.mock("@/utils/mlaTemplateLabel", () => ({
  getMlaTemplateLabel: (_t: unknown, { name }: { name: string }) => name,
}))

const marketAccount = {
  isBorrower: true,
  market: { address: MARKET, chainId: 11155111, borrower: "0xf01d" },
} as unknown as MarketAccount

const frameHtml = () =>
  (document.querySelector("iframe") as HTMLIFrameElement).getAttribute("srcdoc")

beforeEach(() => {
  signMla.mockClear()
})

it("shows the selected MLA's text on the page and signs it from there", () => {
  mockMarketMla = undefined
  render(<MarketMLA marketAccount={marketAccount} />)
  expect(document.querySelector("iframe")).toBeNull()

  fireEvent.mouseDown(screen.getByRole("combobox"))
  fireEvent.click(
    within(screen.getByRole("listbox")).getByText("Stormwind Custom MLA"),
  )
  expect(frameHtml()).toBe("<p>Stormwind agreement</p>")

  fireEvent.click(screen.getByText("mla.signAndSet"))
  expect(signMla).toHaveBeenCalledWith(
    expect.objectContaining({ template: { id: 7 } }),
  )
})

it("shows an existing agreement with lender details as placeholders", () => {
  mockMarketMla = {
    chainId: 11155111,
    market: MARKET,
    borrower: "0xf01d",
    html: "<p>Lender: {{lender.address}}</p>",
    plaintext: "Lender: {{lender.address}}",
    templateId: 7,
    templateName: "Stormwind Custom MLA",
    templateVersion: "1",
    isCustomTemplate: true,
    lenderFields: [{ source: "lender.address", placeholder: "Lender Address" }],
  }
  render(<MarketMLA marketAccount={marketAccount} />)
  screen.getByText("mla.governing:Stormwind Custom MLA")
  expect(frameHtml()).toBe("<p>Lender: [Lender Address]</p>")
  screen.getByText("mla.downloadPdf")
  screen.getByText("mla.downloadSigned")
})
