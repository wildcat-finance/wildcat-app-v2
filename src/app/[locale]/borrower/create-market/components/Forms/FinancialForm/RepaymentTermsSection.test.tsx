/* eslint-disable import/no-extraneous-dependencies */
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useForm, UseFormReturn } from "react-hook-form"

import { RepaymentTermsSection } from "./RepaymentTermsSection"
import { getRepaymentDeploymentTerms } from "../../../validation/repaymentTerms"
import { MarketValidationSchemaType } from "../../../validation/validationSchema"
import { RepaymentTermsConfirmation } from "../ConfirmationForm/RepaymentTermsConfirmation"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, values?: { count?: number; deadline?: string }) =>
      values?.count !== undefined
        ? `${values.count} hours`
        : values?.deadline ?? key,
  }),
}))

let form: UseFormReturn<MarketValidationSchemaType>
const Harness = ({
  chainId = SupportedChainId.Sepolia,
  scheduled = false,
}: {
  chainId?: SupportedChainId
  scheduled?: boolean
}) => {
  form = useForm<MarketValidationSchemaType>({
    defaultValues: {
      implementationType: "standard",
      scheduleRepayment: scheduled,
      repaymentPeriod: 0,
    },
  })
  form.watch()
  return (
    <>
      <RepaymentTermsSection form={form} repaymentChainId={chainId} />
      <RepaymentTermsConfirmation form={form} />
    </>
  )
}

describe("repayment form controls", () => {
  beforeEach(() =>
    jest.spyOn(Date, "now").mockReturnValue(Date.UTC(2029, 11, 31)),
  )
  afterEach(() => jest.restoreAllMocks())
  it("stores UTC calendar input as seconds and displays the same deadline in confirmation", async () => {
    render(<Harness />)
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "borrower.createMarket.repayment.enable",
      }),
    )
    fireEvent.change(
      screen.getByLabelText("borrower.createMarket.repayment.dateUtc"),
      { target: { value: "31/12/2030 23:30" } },
    )
    await waitFor(() =>
      expect(form.getValues("repaymentDate")).toBe(
        Date.UTC(2030, 11, 31, 23, 30) / 1000,
      ),
    )
    expect(form.getValues("repaymentPeriod")).toBe(0)
    expect(
      screen.getAllByText("31/12/2030 23:30:00 UTC").length,
    ).toBeGreaterThan(0)
    fireEvent.change(screen.getByLabelText("common.units.hours"), {
      target: { value: "1.25" },
    })
    expect(form.getValues("repaymentPeriod")).toBe(4500)
    expect(
      screen.getAllByText("01/01/2031 00:45:00 UTC").length,
    ).toBeGreaterThan(0)
  })

  it("supports zero periods, distinguishes an empty input, and clears disabled terms from calldata", async () => {
    render(<Harness scheduled />)
    await act(async () => {
      form.setValue("repaymentDate", 1_893_499_200)
    })
    expect(screen.getByText("0 hours")).toBeTruthy()
    fireEvent.change(screen.getByLabelText("common.units.hours"), {
      target: { value: "" },
    })
    expect(form.getValues("repaymentPeriod")).toBeUndefined()
    expect(screen.getByText(/Enter a repayment period/)).toBeTruthy()
    fireEvent.click(
      screen.getByRole("checkbox", {
        name: "borrower.createMarket.repayment.enable",
      }),
    )
    expect(getRepaymentDeploymentTerms(form.getValues())).toEqual({
      repaymentDate: 0,
      repaymentPeriod: 0,
    })
    expect(screen.queryByText("marketDetails.repayment.deadline")).toBeNull()
  })

  it("hides creation controls for an unsupported target but lets an imported schedule be turned off", () => {
    const view = render(<Harness chainId={SupportedChainId.Mainnet} />)
    expect(screen.queryByRole("checkbox")).toBeNull()
    view.unmount()
    render(<Harness chainId={SupportedChainId.Mainnet} scheduled />)
    expect(screen.getByRole("alert").textContent).toBe(
      "borrower.createMarket.repayment.unsupported",
    )
    fireEvent.click(screen.getByRole("checkbox"))
    expect(screen.queryByRole("checkbox")).toBeNull()
  })
})
