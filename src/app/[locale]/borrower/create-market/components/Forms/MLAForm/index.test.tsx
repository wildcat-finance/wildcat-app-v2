/* eslint-disable import/no-extraneous-dependencies */
import { render, screen } from "@testing-library/react"
import { UseFormReturn, useForm } from "react-hook-form"

import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"

import { MlaForm } from "."

const previewProps = jest.fn()

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))
jest.mock("@/assets/icons/arrowLeft_icon.svg", () => () => null)
jest.mock("@/store/hooks", () => ({ useAppDispatch: () => jest.fn() }))
jest.mock("@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates", () => ({
  useGetMlaTemplates: () => ({
    data: [
      { id: 1, isTestnet: true, name: "Wildcat MLA Template", isDefault: true },
      {
        id: 7,
        isTestnet: true,
        name: "OrangeLighter MLA",
        version: "2",
        borrowerId: "org",
      },
    ],
    isLoading: false,
  }),
}))
jest.mock(
  "@/app/[locale]/borrower/create-market/components/PreviewMlaModal",
  () => ({
    PreviewMlaModal: (props: { buttonText: string }) => {
      previewProps(props)
      return <button type="button">{props.buttonText}</button>
    },
  }),
)

const MlaStep = ({ mla }: { mla: string }) => {
  const form = useForm({ defaultValues: { mla } })
  return (
    <MlaForm
      form={form as unknown as UseFormReturn<MarketValidationSchemaType>}
      timeSigned={1700000000000}
      salt="0xsalt"
      borrowerProfile={undefined}
      tokenAsset={undefined}
    />
  )
}

beforeEach(() => previewProps.mockClear())

it("offers to view the chosen MLA, filled in with this market, beside Next", () => {
  render(<MlaStep mla="7" />)
  screen.getByText("createNewMarket.buttons.viewMLA")
  screen.getByText("createNewMarket.buttons.next")
  expect(previewProps).toHaveBeenLastCalledWith(
    expect.objectContaining({
      mlaTemplateId: 7,
      salt: "0xsalt",
      timeSigned: 1700000000000,
      showSignButton: false,
    }),
  )
})

it("has nothing to view when the market uses no MLA", () => {
  render(<MlaStep mla="noMLA" />)
  expect(screen.queryByText("createNewMarket.buttons.viewMLA")).toBeNull()
  expect(previewProps).not.toHaveBeenCalled()
})
