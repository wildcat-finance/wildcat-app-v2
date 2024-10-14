import { Box, Typography, SvgIcon, Button, Link } from "@mui/material"
import { useTranslation } from "react-i18next"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { DotStyle, ErrorStyle } from "@/components/Notification/Base/style"
import { BaseProps } from "@/components/Notification/Base/type"
import { COLORS } from "@/theme/colors"

export const Base = ({
  description,
  unread,
  error,
  action,
  date,
  children,
}: BaseProps) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Box
        sx={{ display: "flex", justifyContent: "space-between", gap: "8px" }}
      >
        <Box sx={{ display: "flex", gap: "8px" }}>
          {unread && <div style={DotStyle} />}
          {error && (
            <div style={ErrorStyle}>
              <Box sx={{ marginTop: "-8px !important", marginBottom: "8px" }}>
                <Typography
                  variant="text4"
                  color={COLORS.white}
                  fontWeight={600}
                  sx={{ marginLeft: "4px" }}
                >
                  !
                </Typography>
              </Box>
            </div>
          )}

          <Box sx={{ lineHeight: "20px" }}>
            <Typography variant="text3">{description}</Typography>
            {children && <Box sx={{ marginTop: "4px" }}>{children}</Box>}
          </Box>
        </Box>
        <Box sx={{ display: "flex", gap: "4px", height: "24px" }}>
          {action && (
            <Button
              size="small"
              variant="contained"
              color="secondary"
              sx={{ gap: "4px", width: "fit-content", whiteSpace: "nowrap" }}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          <Button
            size="small"
            variant="text"
            sx={{ gap: "4px", width: "fit-content", whiteSpace: "nowrap" }}
          >
            <SvgIcon fontSize="small" sx={{ margin: "auto" }}>
              <LinkIcon />
            </SvgIcon>
            {t("notifications.viewOnEtherscan")}
          </Button>
        </Box>
      </Box>
      <Typography variant="text4" color={COLORS.greySuit}>
        {date}
      </Typography>
    </Box>
  )
}
