import { useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Typography,
  Tabs,
  Tab,
  Divider,
} from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import {
  DialogContainer,
  TabStyle,
  DividerStyle,
  ButtonStyle,
  LinkStyle,
} from "@/components/Header/NotificationButton/UnreadDialog/style"
import { UnreadDialogProps } from "@/components/Header/NotificationButton/UnreadDialog/type"
import { Notification } from "@/components/Notification"
import { toastSuccess } from "@/components/Toasts"
import { ROUTES } from "@/routes"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { markAllAsRead } from "@/store/slices/notificationsSlice/notificationsSlice"
import { COLORS } from "@/theme/colors"
import { setLastFetchedTimestamp } from "@/utils/timestamp"

export const UnreadDialog = ({ open, handleClose }: UnreadDialogProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(0)
  const dispatch = useAppDispatch()
  const { address } = useAccount()

  const notifications = useAppSelector((state) => state.notifications)
  const filtered = notifications.filter((notification) => {
    if (value === 0) return true
    if (value === 1) return notification.category === "marketActivity"
    return notification.category === "newLenders"
  })

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue)
  }

  const handleMarkAsRead = async () => {
    if (!address) return
    setLastFetchedTimestamp(notifications[0]?.blockTimestamp, address)
    dispatch(markAllAsRead())
    toastSuccess("All notifications marked as read")
  }

  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="text1">
          {t("header.notifications.notifications")}
        </Typography>
        <Button
          variant="contained"
          color="secondary"
          size="small"
          sx={{ width: "96px" }}
          onClick={handleMarkAsRead}
        >
          {t("header.notifications.markAsRead")}
        </Button>
      </Box>
      <Tabs value={value} onChange={handleChange} sx={{ marginTop: "16px" }}>
        <Tab
          value={0}
          style={TabStyle}
          label={
            <Typography
              variant="text3"
              color={value === 0 ? COLORS.black : COLORS.greySuit}
            >
              {t("header.notifications.all")}
            </Typography>
          }
        />
        <Tab
          value={1}
          style={TabStyle}
          label={
            <Typography
              variant="text3"
              color={value === 1 ? COLORS.black : COLORS.greySuit}
            >
              {t("header.notifications.marketActivity")}
            </Typography>
          }
        />
        <Tab
          value={2}
          style={TabStyle}
          label={
            <Typography
              variant="text3"
              color={value === 2 ? COLORS.black : COLORS.greySuit}
            >
              {t("header.notifications.newLenders")}
            </Typography>
          }
        />
      </Tabs>
      <Divider sx={{ marginX: "-20px", marginY: "-1px" }} />
      <Box
        sx={{ display: "grid", gap: "16px", paddingY: "16px", width: "480px" }}
      >
        {filtered.map((notification, index) => (
          <>
            <Notification {...notification} />
            {index !== filtered.length - 1 && <Divider sx={DividerStyle} />}
          </>
        ))}
      </Box>
      <Divider sx={{ marginX: "-20px", marginY: "-1px" }} />
      <Link href={ROUTES.borrower.notifications} passHref style={LinkStyle}>
        <Button
          size="small"
          variant="text"
          color="secondary"
          sx={ButtonStyle}
          onClick={handleClose}
        >
          {t("header.notifications.viewAll")}
        </Button>
      </Link>
    </Dialog>
  )
}
