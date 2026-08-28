/* eslint-disable import/no-extraneous-dependencies */
import { fireEvent, render, screen } from "@testing-library/react"
import { UseFormReturn } from "react-hook-form"

import { getCreateMarketSignatureFingerprint } from "@/app/[locale]/borrower/create-market/validation/deployFingerprint"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"

import { LegacyConfirmationForm } from "./LegacyConfirmationForm"

jest.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}))

jest.mock("@/app/[locale]/borrower/hooks/mla/usePreviewMla", () => ({
  usePreviewMlaFromForm: () => ({ data: undefined, isLoading: false }),
}))

jest.mock("@/app/[locale]/borrower/components/MlaModal", () => ({
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
  it("keeps review actions locked behind the deployment dialog", () => {
    const formValues = {
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
    const form = {
      getValues: jest.fn((field?: keyof MarketValidationSchemaType) =>
        field ? formValues[field] : formValues,
      ),
    } as unknown as UseFormReturn<MarketValidationSchemaType>
    const onClickSign = jest.fn()

    render(
      <LegacyConfirmationForm
        form={form}
        tokenAsset={undefined}
        borrowerProfile={undefined}
        handleDeploy={jest.fn()}
        salt="0x01"
        timeSigned={1}
        onClickSign={onClickSign}
        onDiscardSignature={() => true}
        signatureRequested={false}
        paramsChangedSinceSigning={false}
        isSigning={false}
        isDeployReady
        isDeployDialogOpen
        mlaSignature={undefined}
      />,
    )

    const backButton = screen.getByRole("button", {
      name: "common.buttons.back",
    }) as HTMLButtonElement
    const signButton = screen.getByRole("button", {
      name: "borrower.createMarket.buttons.signMlaRefusal",
    }) as HTMLButtonElement

    expect(backButton.disabled).toBe(true)
    expect(signButton.disabled).toBe(true)
    fireEvent.click(signButton)
    expect(onClickSign).not.toHaveBeenCalled()
  })

  it("keeps a refusal usable after switching to an allowlist", () => {
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

    const signedFingerprint = getCreateMarketSignatureFingerprint(formValues)
    const getValues = jest.fn((field?: keyof MarketValidationSchemaType) =>
      field ? formValues[field] : formValues,
    )
    const form = {
      getValues,
    } as unknown as UseFormReturn<MarketValidationSchemaType>
    const handleDeploy = jest.fn()
    const onClickSign = jest.fn()

    const renderForm = (paramsChangedSinceSigning: boolean) => (
      <LegacyConfirmationForm
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
        mlaSignature={{
          message: "signed refusal",
          signature: "0xsigned-refusal",
        }}
      />
    )

    const { rerender } = render(renderForm(false))

    expect(screen.getByText("Lender Self-Onboarding")).toBeTruthy()
    expect(
      (
        screen.getByRole("button", {
          name: "borrower.createMarket.buttons.deploy",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false)

    formValues = { ...formValues, accessControl: "manualApproval" }
    const paramsChangedSinceSigning =
      getCreateMarketSignatureFingerprint(formValues) !== signedFingerprint
    rerender(renderForm(paramsChangedSinceSigning))

    expect(screen.getByText("Borrower Operated Allowlist")).toBeTruthy()
    expect(
      screen.queryByText("borrower.createMarket.confirm.alertParamsChanged"),
    ).toBeNull()

    const deployButton = screen.getByRole("button", {
      name: "borrower.createMarket.buttons.deploy",
    }) as HTMLButtonElement
    expect(deployButton.disabled).toBe(false)
    fireEvent.click(deployButton)
    expect(handleDeploy).toHaveBeenCalledTimes(1)
    expect(onClickSign).not.toHaveBeenCalled()
  })
})
