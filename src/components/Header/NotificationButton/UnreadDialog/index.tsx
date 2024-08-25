import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  Typography,
  SvgIcon,
  Tabs,
  Tab,
  Divider,
} from "@mui/material"
  
import {
  DialogContainer
} from "@/components/Header/NotificationButton/UnreadDialog/style"

import { UnreadDialogProps } from "@/components/Header/NotificationButton/UnreadDialog/type"
import { COLORS } from "@/theme/colors"
import { toastifyRequest } from "@/components/toasts/index"

export const UnreadDialog = ({
  open,
  handleClose,
}: UnreadDialogProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  // Show a toast notification when the user clicks the "Mark as read" button
  const handleMarkAsRead = async () => {
    await toastifyRequest(
      new Promise((resolve) => { setTimeout(resolve, 1000) }).then((res) => {
        console.log("Mark as read successful")
      }),
      {
        pending: `Waiting for signature...`,
        success: `Service agreement signed!`,
        error: `Failed to sign service agreement!`,
      },
    )
  }
  
  return (
    <Dialog open={open} onClose={handleClose} sx={DialogContainer}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="text1">
          {t("header.notifications.notifications")}
        </Typography>
        <Button variant="contained" color="secondary" size="small" sx={{ width: "96px" }} onClick={handleMarkAsRead}>
          {t("header.notifications.markAsRead")}
        </Button>
      </Box>
      <Tabs value={value} onChange={handleChange} sx={{ marginTop: "16px" }}>
        <Tab value={0} style={{ minWidth:"20px", marginRight: "12px", borderBottom: "none", color: COLORS.greySuit }} label={<Typography variant="text3" color={value == 0 ? COLORS.black : COLORS.greySuit}>{t("header.notifications.all")}</Typography>} />
        <Tab value={1} style={{ minWidth:"20px", marginRight: "12px", borderBottom: "none", color: COLORS.greySuit }} label={<Typography variant="text3" color={value == 1 ? COLORS.black : COLORS.greySuit}>{t("header.notifications.marketActivity")}</Typography>} />
        <Tab value={2} style={{ minWidth:"20px", marginRight: "12px", borderBottom: "none", color: COLORS.greySuit }} label={<Typography variant="text3" color={value == 2 ? COLORS.black : COLORS.greySuit}>{t("header.notifications.newLenders")}</Typography>} />
      </Tabs>
      <Divider sx={{ marginX: "-20px", marginY: "-1px" }} />
      <div style={{ height: "128px" }}>

      </div>
      <Divider sx={{ marginX: "-20px", marginY: "-1px" }} />
      <Button size="small" variant="text" color="secondary" sx={{ width: "140px", marginTop: "12px", marginBottom: "-10px", marginX: "auto" }}>
        View All
      </Button>
    </Dialog>
  )
}