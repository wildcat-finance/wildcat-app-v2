import * as React from "react"

import {
  Box,
  ButtonBase,
  Dialog,
  IconButton,
  Popover,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import { useMarketDestinations } from "@/hooks/destinations/useDestinations"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

import { DestinationsList } from "./DestinationsList"

const stopPropagation = (event: React.SyntheticEvent) => event.stopPropagation()

const stopAuxClick = (event: React.MouseEvent) => {
  event.preventDefault()
  event.stopPropagation()
}

export const DestinationsBadge = ({
  chainId,
  marketAddress,
}: {
  chainId: number
  marketAddress: string
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { destinations, stale } = useMarketDestinations(chainId, marketAddress)
  const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null)
  const titleId = React.useId()

  React.useEffect(() => {
    if (destinations.length === 0) setAnchorEl(null)
  }, [destinations.length])

  if (destinations.length === 0) return null

  const isOpen = !!anchorEl
  const handleClose = () => setAnchorEl(null)

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (isOpen || event.key === "Enter" || event.key === " ") {
      event.stopPropagation()
    }
  }

  const panel = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: "12px",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <Typography id={titleId} variant={isMobile ? "mobH3" : "text1"}>
            {t("destinations.panel.title")}
          </Typography>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.santasGrey}
          >
            {t("destinations.panel.subtitle")}
          </Typography>
        </Box>
        <IconButton
          onClick={handleClose}
          aria-label="Close"
          sx={{ width: "20px", height: "20px", flexShrink: 0 }}
        >
          <SvgIcon
            sx={{ fontSize: "16px", "& path": { fill: COLORS.santasGrey } }}
          >
            <Cross />
          </SvgIcon>
        </IconButton>
      </Box>

      <DestinationsList destinations={destinations} stale={stale} />
    </Box>
  )

  return (
    <Box
      component="span"
      onClick={stopPropagation}
      onAuxClick={stopAuxClick}
      onMouseDown={stopPropagation}
      onKeyDown={handleKeyDown}
      sx={{ display: "inline-flex", flexShrink: 0 }}
    >
      <ButtonBase
        component="span"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={`${t("destinations.badge", {
          count: destinations.length,
        })}. ${t("destinations.badgeLabel")}`}
        onClick={(event: React.MouseEvent<HTMLElement>) => {
          event.preventDefault()
          setAnchorEl(event.currentTarget)
        }}
        sx={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: "12px",
          backgroundColor: COLORS.glitter,
          "&:hover": { backgroundColor: COLORS.hawkesBlue },
          "&.Mui-focusVisible": {
            outline: `2px solid ${COLORS.ultramarineBlue}`,
            outlineOffset: "1px",
          },
        }}
      >
        <Typography
          variant={isMobile ? "mobText4" : "text4"}
          color={COLORS.blackRock}
          sx={{
            whiteSpace: "nowrap",
            ...(isMobile && { fontSize: "13px", lineHeight: "18px" }),
          }}
        >
          {t("destinations.badge", { count: destinations.length })}
        </Typography>
      </ButtonBase>

      {isMobile ? (
        <Dialog
          open={isOpen}
          onClose={handleClose}
          aria-labelledby={titleId}
          sx={{
            backdropFilter: "blur(10px)",
            "& .MuiDialog-paper": {
              width: "100%",
              maxWidth: "100%",
              maxHeight: "85vh",
              minWidth: "0 !important",
              border: "none",
              borderRadius: "14px",
              padding: 0,
              margin: "auto 4px 4px",
              overflowY: "auto",
            },
          }}
        >
          {panel}
        </Dialog>
      ) : (
        <Popover
          open={isOpen}
          anchorEl={anchorEl}
          onClose={handleClose}
          anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
          transformOrigin={{ vertical: "top", horizontal: "left" }}
          slotProps={{
            paper: {
              role: "dialog",
              "aria-labelledby": titleId,
              sx: {
                width: "400px",
                maxWidth: "calc(100vw - 32px)",
                minWidth: "0 !important",
                padding: 0,
                maxHeight: "70vh",
                overflowY: "auto",
                marginTop: "6px",
                borderRadius: "14px",
                backgroundColor: COLORS.hintOfRed,
              },
            },
          }}
        >
          {panel}
        </Popover>
      )}
    </Box>
  )
}
