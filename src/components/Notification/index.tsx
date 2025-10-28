import React from "react"

import { Box, Typography, SvgIcon, Button, Link } from "@mui/material"
import { useTranslation } from "react-i18next"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { TNotification } from "@/store/slices/notificationsSlice/interface"
import { COLORS } from "@/theme/colors"
import { formatBlockTimestamp } from "@/utils/formatters"

import {
  DotStyle,
  ErrorStyle,
  baseContainerStyle,
  contentContainerStyle,
  lineHeightStyle,
  actionButtonStyle,
  linkButtonStyle,
} from "./style"

export const Notification = ({
  description,
  children,
  unread,
  error,
  blockTimestamp,
  blockExplorerUrl,
  action,
}: TNotification) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Box sx={baseContainerStyle}>
        <Box sx={contentContainerStyle}>
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
          <Box sx={lineHeightStyle}>
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
              sx={actionButtonStyle}
              onClick={action.onClick}
            >
              {action.label}
            </Button>
          )}
          {blockExplorerUrl && (
            <Link target="_blank" href={blockExplorerUrl}>
              <Button size="small" variant="text" sx={linkButtonStyle}>
                <SvgIcon fontSize="small" sx={{ margin: "auto" }}>
                  <LinkIcon />
                </SvgIcon>
                {t("notifications.viewOnEtherscan")}
              </Button>
            </Link>
          )}
        </Box>
      </Box>
      <Typography variant="text4" color={COLORS.greySuit}>
        {formatBlockTimestamp(blockTimestamp)}
      </Typography>
    </Box>
  )
}
