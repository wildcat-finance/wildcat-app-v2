/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"
import { UseFormReturn } from "react-hook-form"

import { getCreateMarketFormFingerprint } from "@/app/[locale]/borrower/create-market/validation/deployFingerprint"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"

import { ConfirmationForm } from "."

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock("@/app/[locale]/borrower/hooks/mla/usePreviewMla", () => ({
  usePreviewMlaFromForm: () => ({ data: undefined, isLoading: false }),
}))

jest.mock("@/app/[locale]/lender/components/MlaModal", () => ({
  MlaModal: () => null,
}))

jest.mock("@/assets/icons/arrowLeft_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock("@/assets/icons/info_icon.svg", () => ({
  __esModule: true,
  default: () => null,
}))

jest.mock("@/store/hooks", () => ({
  useAppDispatch: () => jest.fn(),
}))

describe("ConfirmationForm access-control signature guard", () => {
  it("requires a new refusal signature after switching to an allowlist", () => {
    let formValues = {
      accessControl: "defaultPullProvider",
      policy: "createNewPolicy",
      policyName: "Test Policy",
      marketType: "standard",
      mla: "noMLA",
      namePrefix: "Demo ",
      symbolPrefix: "DEMO",
      withdrawalRequiresAccess: false,
      transferRequiresAccess: false,
      disableTransfers: false,
      allowForceBuyBack: false,
      allowTermReduction: false,
    } as unknown as MarketValidationSchemaType

    const signedFingerprint = getCreateMarketFormFingerprint(formValues)
    const getValues = jest.fn((field?: keyof MarketValidationSchemaType) =>
      field ? formValues[field] : formValues,
    )
    const form = {
      getValues,
    } as unknown as UseFormReturn<MarketValidationSchemaType>
    const handleDeploy = jest.fn()
    const onClickSign = jest.fn()

    const renderForm = (paramsChangedSinceSigning: boolean) => (
      <ConfirmationForm
        form={form}
        tokenAsset={undefined}
        borrowerProfile={undefined}
        handleDeploy={handleDeploy}
        salt="0x01"
        timeSigned={1}
        onClickSign={onClickSign}
        onDiscardSignature={() => true}
        signatureRequested
        paramsChangedSinceSigning={paramsChangedSinceSigning}
        isSigning={false}
        isDeployReady
        isDeployDialogOpen={false}
        mlaSignature={{ message: "signed refusal" }}
      />
    )

    const { rerender } = render(renderForm(false))

    expect(screen.getByText("Lender Self-Onboarding")).toBeTruthy()
    expect(
      (
        screen.getByRole("button", {
          name: "createNewMarket.buttons.deploy",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)

    formValues = { ...formValues, accessControl: "manualApproval" }
    const paramsChangedSinceSigning =
      getCreateMarketFormFingerprint(formValues) !== signedFingerprint
    rerender(renderForm(paramsChangedSinceSigning))

    expect(screen.getByText("Borrower Operated Allowlist")).toBeTruthy()
    expect(
      screen.getByText("createNewMarket.confirm.alertParamsChanged"),
    ).toBeTruthy()

    const deployButton = screen.getByRole("button", {
      name: "createNewMarket.buttons.deploy",
    }) as HTMLButtonElement
    expect(deployButton.disabled).toBe(true)
    fireEvent.click(deployButton)
    expect(handleDeploy).not.toHaveBeenCalled()

    const signButton = screen.getByRole("button", {
      name: "createNewMarket.buttons.signMlaRefusal",
    }) as HTMLButtonElement
    expect(signButton.disabled).toBe(false)
    fireEvent.click(signButton)
    expect(onClickSign).toHaveBeenCalledTimes(1)
  })
})
