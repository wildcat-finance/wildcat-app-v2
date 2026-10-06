import { SvgIcon } from "@mui/material"
import toast from "react-hot-toast"

import Check from "@/assets/icons/check_icon.svg"
import { Icon } from "@/components/Toasts/style"
import { COLORS, TOKENS } from "@/theme/colors"

/* Toasts float over the entire app and need to read on any background.
 * We use the inverse surface token so they appear as a high-contrast
 * pill in both light (dark pill on light bg) and dark (light pill — via
 * the inverse token's dark-mode value — on dark bg) modes. */
const defaultStyle = {
  borderRadius: "24px",
  background: TOKENS.surfaceInverse,
  color: TOKENS.textOnInverse,
  fontFamily: "Roboto, sans-serif",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  boxShadow: TOKENS.shadowPopover,
}

export type ToastRequestConfig = {
  pending?: string
  success?: string
  error?: string
}

export const toastRequest = async <T,>(
  promiseFn: Promise<T>,
  config?: ToastRequestConfig,
  style: object = {},
) => {
  toast.promise(
    promiseFn,
    {
      loading: config?.pending || "Request is pending",
      success: config?.success || "Request is successful 🎉",
      error: config?.error || "Request failed 😢",
    },
    {
      style: {
        ...defaultStyle,
        ...style,
      },
    },
  )

  return promiseFn
}

export const toastInfo = (message: string, style: object = {}) =>
  toast(message, {
    icon: (
      <SvgIcon fontSize="small" sx={Icon}>
        <Check />
      </SvgIcon>
    ),
    style: {
      ...defaultStyle,
      ...style,
    },
  })

export const toastError = (message: string, style: object = {}) =>
  toast.error(message, {
    style: {
      ...defaultStyle,
      ...style,
    },
  })

export const toastSuccess = (message: string, style: object = {}) =>
  toast(message, {
    icon: (
      <SvgIcon fontSize="small" sx={Icon}>
        <Check />
      </SvgIcon>
    ),
    style: {
      ...defaultStyle,
      ...style,
    },
  })

// Re-exports kept for backward compatibility
export { COLORS }
