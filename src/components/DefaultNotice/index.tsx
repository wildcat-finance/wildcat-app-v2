import * as React from "react"

import { Box, Button, SvgIcon, SxProps, Theme, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import DefaultedIcon from "@/assets/icons/defaulted_icon.svg"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export const DefaultedGlyph = ({
  size,
  color,
  sx,
}: {
  size: string
  color: string
  sx?: SxProps<Theme>
}) => (
  <SvgIcon
    aria-hidden="true"
    sx={[
      { fontSize: size, flexShrink: 0, "& path": { fill: color } },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  >
    <DefaultedIcon />
  </SvgIcon>
)

export type LenderMarketDefaultNoticeProps = {
  showUnfulfilledRequest?: boolean
}

export const LenderMarketDefaultNotice = ({
  showUnfulfilledRequest,
}: LenderMarketDefaultNoticeProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "10px",
        padding: "8px",
        borderRadius: "14px",
        border: isMobile ? "none" : `1px solid ${COLORS.iron}`,
        bgcolor: COLORS.bunker,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          padding: "8px 10px 4px",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <Typography
            variant={isMobile ? "mobH3" : "title3"}
            color={COLORS.white}
          >
            {t("defaultedMarkets.lenderNotice.title")}
          </Typography>
          <DefaultedGlyph
            size="20px"
            color={COLORS.white}
            sx={{ opacity: 0.8 }}
          />
        </Box>

        <Typography
          variant={isMobile ? "mobText2" : "text2"}
          color={COLORS.white}
          sx={{ opacity: 0.8, maxWidth: "544px" }}
        >
          {t("defaultedMarkets.lenderNotice.description")}
        </Typography>
      </Box>

      {showUnfulfilledRequest && (
        <Box
          sx={(theme) => ({
            minHeight: "56px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px",
            padding: "8px 12px",
            borderRadius: "10px",
            bgcolor: COLORS.white,
            [theme.breakpoints.down("md")]: {
              flexDirection: "column",
              alignItems: "stretch",
              gap: "12px",
            },
          })}
        >
          <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <Typography
              variant={isMobile ? "mobText3SemiBold" : "text3Highlighted"}
              color={COLORS.blackRock}
            >
              {t("defaultedMarkets.lenderNotice.unfulfilledRequest.title")}
            </Typography>
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.blackRock08}
            >
              {t("defaultedMarkets.lenderNotice.unfulfilledRequest.subtitle")}
            </Typography>
          </Box>

          <Button
            component="a"
            href={EXTERNAL_LINKS.JURIS}
            target="_blank"
            rel="noopener noreferrer"
            variant="contained"
            size={isMobile ? "large" : "small"}
            fullWidth={isMobile}
            sx={{ flexShrink: 0, whiteSpace: "nowrap" }}
          >
            {t("defaultedMarkets.jurisButton")}
          </Button>
        </Box>
      )}
    </Box>
  )
}

export type BorrowerDefaultNoticeProps = {
  href?: string
}

export const BorrowerDefaultNotice = ({ href }: BorrowerDefaultNoticeProps) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()

  return (
    <Box
      sx={(theme) => ({
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "60px",
        padding: "12px",
        borderRadius: "10px",
        bgcolor: COLORS.bunker,
        [theme.breakpoints.down("md")]: {
          flexDirection: "column",
          alignItems: "flex-start",
          gap: "12px",
          borderRadius: "14px",
        },
      })}
    >
      <Box
        sx={{
          flex: 1,
          minWidth: 0,
          display: "flex",
          alignItems: "flex-start",
          gap: "7px",
        }}
      >
        <DefaultedGlyph size="20px" color={COLORS.white} />

        <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
          <Typography
            variant={isMobile ? "mobText3SemiBold" : "text3Highlighted"}
            color={COLORS.white}
          >
            {t("defaultedMarkets.borrowerNotice.title")}
          </Typography>
          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.white}
            sx={{ opacity: 0.8 }}
          >
            {t("defaultedMarkets.borrowerNotice.description")}
          </Typography>
        </Box>
      </Box>

      {href && (
        <Button
          component={Link}
          href={href}
          variant="contained"
          color="secondary"
          size="small"
          sx={{
            flexShrink: 0,
            whiteSpace: "nowrap",
            bgcolor: COLORS.white,
            "&:hover": { bgcolor: COLORS.whiteSmoke },
          }}
        >
          {t("defaultedMarkets.borrowerNotice.viewProfile")}
        </Button>
      )}
    </Box>
  )
}
