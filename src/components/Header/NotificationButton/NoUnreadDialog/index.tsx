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
  DialogContainer,
  IconContainer
} from "@/components/Header/NotificationButton/NoUnreadDialog/style"

import { NoUnreadDialogProps } from "@/components/Header/NotificationButton/NoUnreadDialog/type"
import { COLORS } from "@/theme/colors"
import NotificationsReadIcon from "@/assets/icons/notifications_read.svg"

export const NoUnreadDialog = ({
  open,
  handleClose,
}: NoUnreadDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <IconButton size="medium" sx={IconContainer} disabled>
        <NotificationsReadIcon style={{ stroke: COLORS.greySuit }} />
      </IconButton>
      <Typography variant="text1">
        {t("header.notifications.noNewNotifications")}
      </Typography>
      <Typography variant="text3" sx={{ color: COLORS.greySuit, width:"178px", marginX:"auto" }}>
        {t("header.notifications.anyOtherMessage")}
      </Typography>
      <Button variant="contained" color="secondary" sx={{ width: "140px", marginTop: "14px", marginX: "auto" }}>
        {t("header.notifications.viewEarlier")}
      </Button>
    </Dialog>
  )
}