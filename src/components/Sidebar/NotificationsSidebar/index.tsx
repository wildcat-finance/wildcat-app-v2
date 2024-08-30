import { Box, Button } from "@mui/material"
import { BackButton } from "@/components/BackButton"
import { useTranslation } from "react-i18next"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/NotificationsSidebar/style"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setCheckBlock,
  setSidebarHighlightState,
} from "@/store/slices/notificationsSidebarSlice/notificationsSidebarSlice"
import { COLORS } from "@/theme/colors"

export const NotificationsSidebar = () => {
  const { t } = useTranslation()

  const dispatch = useAppDispatch()

  const sidebarState = useAppSelector(
    (state) => state.notificationsSidebar.sidebarState,
  )
  
  return (
    <Box sx={ContentContainer}>
      <Box position="sticky" top="32px">
        <BackButton title={t("notifications.sidebar.back")} />

        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.all
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(1))
              dispatch(
                setSidebarHighlightState({
                  all: true,
                  marketActivity: false,
                  newLenders: false,
                }),
              )
            }}
          >
            {t("notifications.sidebar.all")}
          </Button>
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.marketActivity
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(2))
              dispatch(
                setSidebarHighlightState({
                  all: false,
                  marketActivity: true,
                  newLenders: false,
                }),
              )
            }}
          >
            {t("notifications.sidebar.marketActivity")}
          </Button>
          <Button
            variant="text"
            size="medium"
            sx={{
              ...MenuItemButton,
              backgroundColor: sidebarState.newLenders
                ? COLORS.whiteSmoke
                : "transparent",
            }}
            onClick={() => {
              dispatch(setCheckBlock(3))
              dispatch(
                setSidebarHighlightState({
                  all: false,
                  marketActivity: false,
                  newLenders: true,
                }),
              )
            }}
          >
            {t("notifications.sidebar.newLenders")}
          </Button>
        </Box>
      </Box>
    </Box>
  )
}