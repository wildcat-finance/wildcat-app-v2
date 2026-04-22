import { Theme } from "@mui/material"
import { SxProps } from "@mui/system"

export type MlaModalProps = {
  mla: { html: string } | undefined | null
  isLoading: boolean
  onSign: () => void
  showSignButton: boolean
  downloadPdfUrl?: string
  downloadSignedUrl?: string
  disableModalButton?: boolean
  buttonText?: string
  sx?: SxProps<Theme>
  isSigning?: boolean
  disableSignButton?: boolean
  modalButtonVariant?: "text" | "outlined" | "contained"
  modalButtonSize?: "small" | "medium" | "large"
  isClosed?: boolean
}
