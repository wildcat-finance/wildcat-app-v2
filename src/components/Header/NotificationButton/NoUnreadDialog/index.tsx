import { Button, Dialog, IconButton, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import NotificationsReadIcon from "@/assets/icons/notifications_read.svg"
import {
  DialogContainer,
  IconContainer,
  ButtonStyle,
  MessageStyle,
} from "@/components/Header/NotificationButton/NoUnreadDialog/style"
import { NoUnreadDialogProps } from "@/components/Header/NotificationButton/NoUnreadDialog/type"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export const NoUnreadDialog = ({ open, handleClose }: NoUnreadDialogProps) => {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <IconButton size="medium" sx={IconContainer} disabled>
        <NotificationsReadIcon style={{ stroke: COLORS.greySuit }} />
      </IconButton>
      <Typography variant="text1">
        {t("header.notifications.noNewNotifications")}
      </Typography>
      <Typography variant="text3" sx={MessageStyle}>
        {t("header.notifications.anyOtherMessage")}
      </Typography>
      <Link href={ROUTES.borrower.notifications} passHref>
        <Button
          variant="contained"
          color="secondary"
          sx={ButtonStyle}
          onClick={handleClose}
        >
          {t("header.notifications.viewEarlier")}
        </Button>
      </Link>
    </Dialog>
  )
}
