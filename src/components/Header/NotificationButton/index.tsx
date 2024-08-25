"use client"

import { useState, useEffect } from "react"
import { Button } from "@mui/material"
import { UnreadDialog } from "@/components/Header/NotificationButton/UnreadDialog"
import { NoUnreadDialog } from "@/components/Header/NotificationButton/NoUnreadDialog"
import { ButtonStyle, DotStyle } from "@/components/Header/NotificationButton/style"
import NotificationsUnread from "@/assets/icons/notifications_unread.svg"
import NotificationsRead from "@/assets/icons/notifications_read.svg"
import { COLORS } from "@/theme/colors"

export const NotificationButton = () => {
  const { hasUnread } = { hasUnread: false }

  const [open, setOpen] = useState(false)

  const handleClickOpen = () => {
    setOpen(true)
  }

  const handleClose = () => {
    setOpen(false)
  }

  useEffect(() => {
    
  }, [])

  return (
    <>
      <Button size="medium" sx={ButtonStyle} onClick={handleClickOpen}>
        {!hasUnread ? (
          <NotificationsUnread />
        ) : (
          <NotificationsRead style={{ stroke: COLORS.white }} />
        )}
        {!hasUnread && <div style={DotStyle} />}
      </Button>

      {!hasUnread ? (
        <UnreadDialog open={open} handleClose={handleClose} />
      ) : (
        <NoUnreadDialog open={open} handleClose={handleClose} />
      )}
    </>
  )
}