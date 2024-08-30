import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import Link from "next/link"
import { ROUTES } from "@/routes"
import { toastSuccess } from "@/components/Toasts/index"

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
  DialogContainer,
  TabStyle,
  DividerStyle,
  ButtonStyle,
  LinkStyle
} from "@/components/Header/NotificationButton/UnreadDialog/style"

import { UnreadDialogProps } from "@/components/Header/NotificationButton/UnreadDialog/type"
import { COLORS } from "@/theme/colors"

// Placeholder for testing
const notify = () => toastSuccess('Wildcat 1 is registered')

export const UnreadDialog = ({
  open,
  handleClose,
}: UnreadDialogProps) => {
  const { t } = useTranslation()
  const [value, setValue] = useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleMarkAsRead = async () => {
    notify()
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
        <Tab value={0} style={TabStyle} label={
          <Typography variant="text3" color={value == 0 ? COLORS.black : COLORS.greySuit}>
            {t("header.notifications.all")}
          </Typography>} 
        />
        <Tab value={1} style={TabStyle} label={
          <Typography variant="text3" color={value == 1 ? COLORS.black : COLORS.greySuit}>
            {t("header.notifications.marketActivity")}
          </Typography>} 
        />
        <Tab value={2} style={TabStyle} label={
          <Typography variant="text3" color={value == 2 ? COLORS.black : COLORS.greySuit}>
            {t("header.notifications.newLenders")}
          </Typography>} 
        />
      </Tabs>
      <Divider sx={{ marginX: "-20px", marginY: "-1px" }} />
      <div style={{ height: "128px" }}>

      </div>
      <Divider sx={{ marginX: "-20px", marginY: "-1px" }} />
      <Link href={ROUTES.borrower.notifications} passHref style={LinkStyle}>
        <Button size="small" variant="text" color="secondary" sx={ButtonStyle} onClick={handleClose}>
          {t("header.notifications.viewAll")}
        </Button>
      </Link>
    </Dialog>
  )
}