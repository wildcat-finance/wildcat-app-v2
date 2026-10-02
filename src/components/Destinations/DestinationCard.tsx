import * as React from "react"

import { Box, Button, SvgIcon, Tooltip, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import LinkIcon from "@/assets/icons/link_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import type { Destination } from "@/lib/destinations/types"
import { COLORS } from "@/theme/colors"

import { formatDataAge, formatFractionPercent, formatLiquidity } from "./format"

const NO_ESCAPE = { escapeValue: false }

const Pill = ({
  label,
  tooltip,
  tone,
}: {
  label: string
  tooltip?: string
  tone: "neutral" | "amber"
}) => {
  const pill = (
    <Box
      component="span"
      sx={{
        display: "inline-flex",
        alignItems: "center",
        width: "fit-content",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        padding: "2px 8px",
        borderRadius: "6px",
        backgroundColor: tone === "amber" ? COLORS.oasis : COLORS.whiteSmoke,
        cursor: tooltip ? "help" : "default",
      }}
    >
      <Typography
        variant="text4"
        color={tone === "amber" ? COLORS.amberText : COLORS.blackRock}
        sx={{
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </Typography>
    </Box>
  )

  return tooltip ? (
    <Tooltip title={tooltip} placement="top" enterTouchDelay={0}>
      {pill}
    </Tooltip>
  ) : (
    pill
  )
}

const Figure = ({ label, value }: { label: string; value: string }) => {
  const isMobile = useMobileResolution()
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        gap: "12px",
      }}
    >
      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        color={COLORS.santasGrey}
      >
        {label}
      </Typography>
      <Typography
        variant={isMobile ? "mobText3" : "text3"}
        sx={{ textAlign: "right" }}
      >
        {value}
      </Typography>
    </Box>
  )
}

export const DestinationCard = ({
  destination,
  onOpen,
}: {
  destination: Destination
  onOpen: (destination: Destination) => void
}) => {
  const { t } = useTranslation()
  const isMobile = useMobileResolution()
  const { figures, affiliation } = destination

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "16px",
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "12px",
        backgroundColor: COLORS.white,
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
          }}
        >
          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            color={COLORS.santasGrey}
            sx={{ textTransform: "uppercase", letterSpacing: "0.04em" }}
          >
            {t(`destinations.route.${destination.route}`)} ·{" "}
            {destination.platformName}
          </Typography>
          {destination.notices.map((notice) => (
            <Pill
              key={notice}
              label={t(`destinations.notices.${notice}`)}
              tone="amber"
            />
          ))}
        </Box>
        <Typography variant={isMobile ? "mobText1" : "text1"}>
          {destination.venueName}
        </Typography>
        <Typography
          variant={isMobile ? "mobText4" : "text4"}
          color={COLORS.santasGrey}
        >
          {t("destinations.card.wrapperNote", {
            symbol: destination.token.symbol,
            interpolation: NO_ESCAPE,
          })}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <Figure
          label={t("destinations.card.lltv")}
          value={formatFractionPercent(figures.lltv)}
        />
        <Figure
          label={t("destinations.card.borrowApy")}
          value={formatFractionPercent(figures.borrowApy)}
        />
        <Figure
          label={t("destinations.card.liquidity")}
          value={formatLiquidity(
            figures.availableLiquidity,
            destination.loanAsset.symbol,
            figures.availableLiquidityUsd,
          )}
        />
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {affiliation.kind === "affiliated" ? (
          <Pill
            label={t("destinations.affiliation.affiliated", {
              entity: affiliation.entityName,
              interpolation: NO_ESCAPE,
            })}
            tooltip={t("destinations.affiliation.affiliatedTooltip")}
            tone="neutral"
          />
        ) : (
          <Pill
            label={t("destinations.affiliation.notReviewed")}
            tooltip={t("destinations.affiliation.notReviewedTooltip")}
            tone="amber"
          />
        )}
        {destination.curators.length > 0 && (
          <Typography
            variant={isMobile ? "mobText4" : "text4"}
            color={COLORS.santasGrey}
          >
            {t("destinations.card.curatedBy", {
              names: destination.curators.join(", "),
              interpolation: NO_ESCAPE,
            })}
          </Typography>
        )}
        <Typography
          variant={isMobile ? "mobText4" : "text4"}
          color={COLORS.santasGrey}
        >
          {t("destinations.card.asOf", {
            platform: destination.platformName,
            time: formatDataAge(t, figures.asOf),
          })}
        </Typography>
      </Box>

      <Button
        variant="contained"
        color="secondary"
        size="medium"
        onClick={() => onOpen(destination)}
        endIcon={
          <SvgIcon sx={{ fontSize: "16px !important" }}>
            <LinkIcon />
          </SvgIcon>
        }
        fullWidth
      >
        {t("destinations.card.open", { platform: destination.platformName })}
      </Button>
    </Box>
  )
}
