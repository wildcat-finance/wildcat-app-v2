"use client"

import { useState } from "react"

import { Box, Button } from "@mui/material"

import NotificationsRead from "@/assets/icons/notifications_read.svg"
import NotificationsUnread from "@/assets/icons/notifications_unread.svg"
import { NoUnreadDialog } from "@/components/Header/NotificationButton/NoUnreadDialog"
import {
  ButtonStyle,
  DotStyle,
} from "@/components/Header/NotificationButton/style"
import { UnreadDialog } from "@/components/Header/NotificationButton/UnreadDialog"
import { useAppSelector } from "@/store/hooks"
import { COLORS } from "@/theme/colors"

export const NotificationButton = () => {
  const unreadNotifications = useAppSelector((state) =>
    state.notifications.filter((notification) => notification.unread),
  )
  const hasUnread = unreadNotifications.length > 0
  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  return (
    <>
      <Button size="medium" sx={ButtonStyle} onClick={handleClickOpen}>
        {hasUnread ? (
          <NotificationsUnread />
        ) : (
          <NotificationsRead style={{ stroke: COLORS.white }} />
        )}
        {hasUnread && <Box sx={DotStyle} />}
      </Button>

      {hasUnread ? (
        <UnreadDialog open={open} handleClose={handleClose} />
      ) : (
        <NoUnreadDialog open={open} handleClose={handleClose} />
      )}
    </>
  )
}
