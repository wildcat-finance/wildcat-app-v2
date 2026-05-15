import { SvgIcon } from "@mui/material"
import i18next from "i18next"
import toast from "react-hot-toast"

import Check from "@/assets/icons/check_icon.svg"
import { Icon } from "@/components/Toasts/style"
import { COLORS } from "@/theme/colors"

const defaultStyle = {
  borderRadius: "24px",
  background: COLORS.blackRock,
  color: COLORS.white,
  fontFamily: "Roboto, sans-serif",
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
      loading: config?.pending || i18next.t("notifications.toasts.pending"),
      success: config?.success || i18next.t("notifications.toasts.success"),
      error: config?.error || i18next.t("notifications.toasts.error"),
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
