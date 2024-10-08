import { COLORS } from "@/theme/colors"
import toast from 'react-hot-toast';
import Check from "@/assets/icons/check_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import {
  SvgIcon,
} from "@mui/material"
import {
  Icon,
} from "@/components/Toasts/style"

const defaultStyle = {
  borderRadius: '24px',
  background: COLORS.blackRock,
  color: COLORS.white,
  fontFamily: 'Roboto, sans-serif'
}

type ToastRequestConfig = {
  pending?: string
  success?: string
  error?: string
}

export const toastRequest = async <T,>(
  promiseFn: Promise<T>,
  config?: ToastRequestConfig,
  style: Object = {}
) => {
  toast.promise(promiseFn, {
    loading: config?.pending || "Request is pending",
    success: config?.success || "Request is successful 🎉",
    error: config?.error || "Request failed 😢",
  }, {
    style: {
      ...defaultStyle,
      ...style
    }
  })

  return promiseFn
}

export const toastInfo = (message: string, style: Object = {}) => toast(message, {
  icon: <SvgIcon fontSize="small" sx={Icon}><Check /></SvgIcon>,
  style: {
    ...defaultStyle,
    ...style
  }
})

export const toastError = (message: string, style: Object = {}) => toast(message, {
  icon: <SvgIcon fontSize="small" sx={Icon}><Check /></SvgIcon>,
  style: {
    ...defaultStyle,
    ...style
  }
})

export const toastSuccess = (message: string, style: Object = {}) => toast(message, {
  icon: <SvgIcon fontSize="small" sx={Icon}><Check /></SvgIcon>,
  style: {
    ...defaultStyle,
    ...style
  }
})

export const dismissToast = (id: string) => toast.dismiss(id)