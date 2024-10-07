"use client"

import React from "react"
import {
  Box,
  Button,
  Divider,
  InputAdornment,
  TextField,
  Typography,
  SvgIcon,
} from "@mui/material"
import { 
  PageTitleContainer,
  HeaderTitleContainer,
  HeaderStatusContainer
} from "./style"
import Icon from "@/assets/icons/search_icon.svg"
import { useTranslation } from "react-i18next"
import { COLORS } from "@/theme/colors"
import { Notification } from "@/components/Notification"
import { useAppSelector, useAppDispatch } from "@/store/hooks"
import { markAllAsRead } from "@/store/slices/notificationsSlice/notificationsSlice"

export default function Notifications() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const [searchValue, setSearchValue] = React.useState("")
  const handleSearchChange = (evt: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(evt.target.value)
  }

  const notifications = useAppSelector((state) => state.notifications)
  const sidebarState = useAppSelector((state) => state.notificationsSidebar.sidebarState)

  const filtered = notifications.filter((notification) => {
    if (sidebarState.all) return true
    else if (sidebarState.marketActivity) return notification.category === 'marketActivity'
    else return notification.category === 'newLenders'
  }).filter((notification) => notification.description.toLowerCase().includes(searchValue.toLowerCase()))

  const hasRead = filtered.some((notification) => !notification.unread)

  const handleMarkAsRead = () => {
    dispatch(markAllAsRead())
  }

  return (
    <Box sx={{ height: "calc(100vh - 43px - 43px - 52px)", overflow: "hidden" }}>
      <Box sx={PageTitleContainer}>
        <Box sx={HeaderTitleContainer}>
          <Typography variant="title2">
              {t("notifications.history.title")}
          </Typography>
        </Box>
        <Box sx={HeaderStatusContainer}>
          <TextField
          placeholder={t("notifications.history.searchPlaceholder")}
          value={searchValue}
          onChange={handleSearchChange}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
                >
                  <Icon />
                </SvgIcon>
              </InputAdornment>
            ),
          }}
        />
          <Button size="small" variant="text" color="secondary" onClick={handleMarkAsRead}>
            {t("notifications.history.markAllAsRead")}
          </Button>
        </Box>
      </Box>
      <Box sx={{ maxWidth: "624px", marginLeft: "calc(30% - 172px)", display: "grid", gap: "16px" }}>
        {filtered.filter((notification) => notification.unread).map((notification, index) => (
          <>
            <Notification key={index} type={notification.type} description={notification.description} unread={notification.unread} error={notification.error} date={notification.date} />
            {index < filtered.length - 1 && <Divider />}
          </>
        ))}
      </Box>
      {hasRead && <Box sx={{ maxWidth: "624px", marginLeft: "calc(30% - 172px)", display: "flex", marginY: "16px", paddingTop: "10px" }}>
        <Typography variant="text4" sx={{ marginX: "auto" }} color={COLORS.greySuit}>
        {t("notifications.history.earlier")}
        </Typography>
      </Box>}
      <Box sx={{ maxWidth: "624px", marginLeft: "calc(30% - 172px)", display: "grid", gap: "16px" }}>
        {filtered.filter((notification) => !notification.unread).map((notification, index) => (
          <>
            <Notification key={index} type={notification.type} description={notification.description} unread={notification.unread} error={notification.error} date={notification.date} />
            {index < filtered.length - 1 && <Divider />}
          </>
        ))}
      </Box>
    </Box>
  )
}