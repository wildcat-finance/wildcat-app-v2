import { SxProps, Theme } from "@mui/material"

import { BorrowerProfileInput } from "@/app/api/profiles/interface"

export type EditProfileFormProps = {
  address: `0x${string}`
  hideAvatar?: boolean
  hideExternalLinks?: boolean
  hideHeaders?: boolean
  onCancel?: () => void
  afterSubmit?: () => void
  onSubmit?: (changedValues: BorrowerProfileInput) => void
  sx?: SxProps<Theme>
  isAdmin?: boolean
}
