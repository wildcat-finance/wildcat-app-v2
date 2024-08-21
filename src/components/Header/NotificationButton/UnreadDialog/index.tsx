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
} from "@/components/Header/NotificationButton/UnreadDialog/style"

import { UnreadDialogProps } from "@/components/Header/NotificationButton/UnreadDialog/type"

export const UnreadDialog = ({
  open,
  handleClose,
}: UnreadDialogProps) => {
  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      Unread
    </Dialog>
  )
}