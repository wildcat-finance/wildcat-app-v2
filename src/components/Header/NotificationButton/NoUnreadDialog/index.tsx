import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  SvgIcon,
} from "@mui/material"
  
import {
  DialogContainer
} from "@/components/Header/NotificationButton/NoUnreadDialog/style"

import { NoUnreadDialogProps } from "@/components/Header/NotificationButton/NoUnreadDialog/type"

export const NoUnreadDialog = ({
  open,
  handleClose,
}: NoUnreadDialogProps) => {
  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      Read
    </Dialog>
  )
}