/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"

import type { MasterLoanAgreementResponse } from "@/app/api/mla/interface"

import { LenderMlaModal } from "."

const MARKET = "0x8172fcd937572b00b3824576f3af08a761ab7ca9"
const LENDER = "0x00000000000000000000000000000000000000aa"
let mockSignedMla: unknown

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { name?: string }) =>
      values?.name ? `${key}:${values.name}` : key,
  }),
}))
jest.mock("wagmi", () => ({
  useAccount: () => ({ address: LENDER, chainId: 11155111 }),
}))
jest.mock("@/app/[locale]/lender/hooks/useSignMla", () => ({
  useGetSignedMla: () => ({ data: mockSignedMla, isLoading: false }),
}))
jest.mock("@/app/[locale]/lender/hooks/useSignLenderMla", () => ({
  useSignLenderMLA: () => ({ mutate: jest.fn(), isPending: false }),
}))

const mla = {
  chainId: 11155111,
  market: MARKET,
  borrower: "0xf01d",
  html: "<p>Lender: {{lender.address}}</p>",
  plaintext: "Lender: {{lender.address}}",
  templateId: 7,
  templateName: "Stormwind MLA",
  templateVersion: "2",
  isCustomTemplate: true,
  lenderFields: [{ source: "lender.address", placeholder: "Lender Address" }],
} as unknown as MasterLoanAgreementResponse

const open = () => {
  render(<LenderMlaModal mla={mla} isLoading={false} />)
  fireEvent.click(screen.getByText("mla.viewNamed:mla.customMla:Stormwind MLA"))
  return document.querySelector("iframe") as HTMLIFrameElement
}

afterEach(() => {
  jest.restoreAllMocks()
})

const downloadUrls = () => {
  const opened = jest.spyOn(window, "open").mockImplementation(() => null)
  screen
    .getAllByRole("button")
    .filter((button) => button.textContent?.startsWith("mla.download"))
    .forEach((button) => fireEvent.click(button))
  return opened.mock.calls.map(([url]) => url)
}

it("lets a lender read and download the agreement before signing", () => {
  mockSignedMla = null
  const frame = open()
  expect(frame.getAttribute("sandbox")).not.toContain("allow-scripts")
  expect(frame.getAttribute("srcdoc")).toBe("<p>Lender: [Lender Address]</p>")
  screen.getByText("mla.signMla")
  expect(downloadUrls()).toEqual([
    `/api/mla/${MARKET}/pdf?chainId=11155111`,
    `/api/mla/${MARKET}/signed?chainId=11155111`,
  ])
})

it("offers the lender's own copies once signed", () => {
  mockSignedMla = { html: `<p>Lender: ${LENDER}</p>` }
  const frame = open()
  expect(frame.getAttribute("srcdoc")).toBe(`<p>Lender: ${LENDER}</p>`)
  expect(screen.queryByText("mla.signMla")).toBeNull()
  expect(downloadUrls()).toEqual([
    `/api/mla/${MARKET}/${LENDER}/pdf?chainId=11155111`,
    `/api/mla/${MARKET}/${LENDER}/signed?chainId=11155111`,
  ])
})
