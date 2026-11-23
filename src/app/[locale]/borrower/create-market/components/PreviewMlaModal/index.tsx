import { SxProps, Theme } from "@mui/material"
import { Token } from "@wildcatfi/wildcat-sdk"
import { UseFormReturn } from "react-hook-form"

import { MlaModal } from "@/app/[locale]/borrower/components/MlaModal"
import { MarketValidationSchemaType } from "@/app/[locale]/borrower/create-market/validation/validationSchema"
import { usePreviewMlaFromForm } from "@/app/[locale]/borrower/hooks/mla/usePreviewMla"
import { SignMlaFromFormInputs } from "@/app/[locale]/borrower/hooks/mla/useSignBorrowerMla"
import { BorrowerProfile } from "@/app/api/profiles/interface"

/// The chosen MLA filled in with the market being created, lender fields as
/// placeholders, behind a button; with a sign button when signing is due.
export const PreviewMlaModal = ({
  form,
  mlaTemplateId,
  timeSigned,
  borrowerProfile,
  asset,
  salt,
  onSign,
  isSigning,
  sx,
  disabled,
  modalButtonVariant,
  modalButtonSize,
  buttonText = "Sign",
  showSignButton = true,
  isClosed,
}: {
  form: UseFormReturn<MarketValidationSchemaType>
  mlaTemplateId: number
  timeSigned: number
  borrowerProfile: BorrowerProfile | undefined
  asset: Token | undefined
  salt: string
  onSign?: (args: SignMlaFromFormInputs) => void
  isSigning: boolean
  sx?: SxProps<Theme> | undefined
  disabled?: boolean
  modalButtonVariant?: "text" | "outlined" | "contained"
  modalButtonSize?: "small" | "medium" | "large"
  buttonText?: string
  showSignButton?: boolean
  isClosed?: boolean
}) => {
  const { data: mla, isLoading } = usePreviewMlaFromForm(
    form,
    mlaTemplateId,
    timeSigned,
    borrowerProfile,
    asset,
    salt,
  )
  return (
    <MlaModal
      mla={mla ? { html: mla.htmlWithPlaceholders } : mla}
      onSign={() => {
        onSign?.({
          form,
          timeSigned,
          borrowerProfile,
          asset,
        })
      }}
      disableModalButton={disabled}
      disableSignButton={disabled}
      isLoading={isLoading}
      showSignButton={showSignButton}
      isSigning={isSigning}
      buttonText={buttonText}
      sx={sx}
      modalButtonVariant={modalButtonVariant}
      modalButtonSize={modalButtonSize}
      isClosed={isClosed}
    />
  )
}
