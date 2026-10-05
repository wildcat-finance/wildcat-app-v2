import * as React from "react"

import {
  Box,
  Button,
  IconButton,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material"
import type { TFunction } from "i18next"
import Image from "next/image"
import { useTranslation } from "react-i18next"

import MorphoLogo from "@/assets/companies-icons/morpho_icon.png"
import BorrowAgainst from "@/assets/icons/borrowAgainst_icon.svg"
import ChevronSmallUp from "@/assets/icons/chevronSmallUp_icon.svg"
import Cross from "@/assets/icons/cross_icon.svg"
import type { Destination } from "@/lib/destinations/types"
import { COLORS } from "@/theme/colors"
import { formatBps } from "@/utils/formatters"

import { ExternalLinkGate, type ExternalLinkTarget } from "./ExternalLinkGate"
import { formatFractionPercent, formatFractionPercentTrimmed } from "./format"

const NO_ESCAPE = { escapeValue: false }

export type DestinationRowsVariant = "panel" | "section"

const COLUMNS: Record<DestinationRowsVariant, string> = {
  panel:
    "minmax(0, 256fr) minmax(0, 342fr) minmax(0, 117fr) minmax(0, 117fr) minmax(0, 178fr) 103px",
  section:
    "minmax(172px, 175fr) minmax(0, 220fr) minmax(0, 99fr) minmax(0, 99fr) minmax(0, 110fr) 103px",
}

const SUBTLE_CHIP_BG: Record<DestinationRowsVariant, string> = {
  panel: COLORS.whiteSmoke,
  section: COLORS.blackHaze,
}

const PLATFORM_LOGOS: Record<Destination["platform"], typeof MorphoLogo> = {
  "morpho-blue": MorphoLogo,
}

const numberWord = (t: TFunction, value: number) =>
  value >= 1 && value <= 10
    ? t(`destinations.numberWords.${value}`)
    : String(value)

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1)

const formatCycle = (t: TFunction, seconds: number) => {
  const hours = Math.floor(seconds / 3600)
  if (hours > 0) return t("destinations.panel.cycleHours", { count: hours })
  const minutes = Math.max(1, Math.floor(seconds / 60))
  return t("destinations.panel.cycleMinutes", { count: minutes })
}

const formatLoopMultiple = (lltv: number) => {
  const bps = Math.round(lltv * 10_000)
  return bps > 0 && bps < 10_000
    ? (Math.floor(100_000 / (10_000 - bps)) / 10).toFixed(1)
    : null
}

const Label = ({ children }: { children: React.ReactNode }) => (
  <Typography
    sx={{
      fontSize: "11px",
      lineHeight: "16px",
      fontWeight: 500,
      color: COLORS.manate,
    }}
  >
    {children}
  </Typography>
)

const SmallText = ({
  children,
  color = COLORS.blackRock,
  opacity,
  wrap = false,
  ellipsis = false,
}: {
  children: React.ReactNode
  color?: string
  opacity?: number
  wrap?: boolean
  ellipsis?: boolean
}) => (
  <Typography
    component="span"
    sx={{
      fontSize: "11px",
      lineHeight: "16px",
      fontWeight: 500,
      color,
      opacity,
      whiteSpace: wrap ? "normal" : "nowrap",
      ...(ellipsis && { overflow: "hidden", textOverflow: "ellipsis" }),
    }}
  >
    {children}
  </Typography>
)

const Flag = ({
  label,
  tooltip,
  tone,
  greyBackground,
}: {
  label: string
  tooltip: string
  tone: "amber" | "grey"
  greyBackground: string
}) => (
  <Tooltip title={tooltip} placement="top" enterTouchDelay={0} describeChild>
    <Box
      component="span"
      tabIndex={0}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        minWidth: 0,
        overflow: "hidden",
        padding: "0 6px",
        borderRadius: tone === "amber" ? "12px" : "20px",
        backgroundColor: tone === "amber" ? COLORS.oasis : greyBackground,
        cursor: "help",
        "&:focus-visible": {
          outline: `2px solid ${COLORS.ultramarineBlue}`,
          outlineOffset: "1px",
        },
      }}
    >
      <SmallText
        color={tone === "amber" ? COLORS.amberText : COLORS.blackRock}
        ellipsis
      >
        {label}
      </SmallText>
    </Box>
  </Tooltip>
)

const DestinationRow = ({
  destination,
  variant,
  onOpen,
}: {
  destination: Destination
  variant: DestinationRowsVariant
  onOpen: (destination: Destination) => void
}) => {
  const { t } = useTranslation()
  const { figures, affiliation } = destination
  const loopMultiple = formatLoopMultiple(figures.lltv)

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: COLUMNS[variant],
        ...(variant === "section"
          ? {
              minHeight: "86px",
              borderTop: `1px solid ${COLORS.athensGrey}`,
            }
          : {
              minHeight: "66px",
              "&:not(:last-of-type)": {
                borderBottom: `1px solid ${COLORS.athensGrey}`,
              },
            }),
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "10px 16px 10px 0",
          minWidth: 0,
        }}
      >
        <Typography
          variant="text3"
          color={COLORS.blackRock}
          title={destination.title}
          sx={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {destination.title}
        </Typography>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "2px 8px 2px 4px",
              borderRadius: "12px",
              backgroundColor: COLORS.whiteSmoke,
            }}
          >
            <Image
              src={PLATFORM_LOGOS[destination.platform]}
              alt=""
              width={12}
              height={12}
              style={{ borderRadius: "50%" }}
            />
            <SmallText>{destination.platformName}</SmallText>
          </Box>
          {destination.curators.length > 0 && (
            <SmallText opacity={0.7}>
              {destination.curators.join(", ")}
            </SmallText>
          )}
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "8px",
          padding:
            variant === "section" ? "12px 8px 10px 0" : "12px 20px 10px 0",
          minWidth: 0,
        }}
      >
        <Label>{t("destinations.columns.type")}</Label>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "flex-start",
            gap: "2px",
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              gap: "2px",
              maxWidth: "100%",
              padding: "0 6px 0 4px",
              borderRadius: "12px",
              backgroundColor: COLORS.pinkLace,
            }}
          >
            <SvgIcon
              viewBox="0 0 12 12"
              sx={{ fontSize: "12px", flexShrink: 0 }}
            >
              <BorrowAgainst />
            </SvgIcon>
            <SmallText color={COLORS.mediumRedViolet} wrap>
              {t(`destinations.route.${destination.route}`)}
              {loopMultiple &&
                ` ・${t("destinations.panel.loopable", {
                  multiple: loopMultiple,
                })}`}
            </SmallText>
          </Box>
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              maxWidth: "100%",
              padding: "0 6px",
              borderRadius: "20px",
              backgroundColor:
                variant === "section" ? COLORS.blackHaze : COLORS.white,
            }}
          >
            <SmallText wrap>
              {variant === "section"
                ? t("destinations.panel.tokenRequired", {
                    symbol: destination.token.symbol,
                    interpolation: NO_ESCAPE,
                  })
                : destination.token.symbol}
            </SmallText>
          </Box>
        </Box>
      </Box>

      {[
        {
          label: t("destinations.columns.lltv"),
          value: formatFractionPercentTrimmed(figures.lltv),
        },
        {
          label: t("destinations.columns.borrowApy"),
          value: formatFractionPercent(figures.borrowApy),
        },
      ].map(({ label, value }) => (
        <Box
          key={label}
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: "8px",
            padding: "12px 0 10px",
          }}
        >
          <Label>{label}</Label>
          <Typography variant="text3" color={COLORS.blackRock}>
            {value}
          </Typography>
        </Box>
      ))}

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: "8px",
          padding: "12px 0 10px",
          minWidth: 0,
        }}
      >
        <Label>{t("destinations.columns.riskFlag")}</Label>
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: "2px" }}>
          {affiliation.kind === "affiliated" && (
            <Flag
              label={t("destinations.riskFlags.affiliated")}
              tooltip={t("destinations.riskFlags.affiliatedTooltip", {
                entity: affiliation.entityName,
                interpolation: NO_ESCAPE,
              })}
              tone="amber"
              greyBackground={SUBTLE_CHIP_BG[variant]}
            />
          )}
          {destination.notices.includes("THIN_LIQUIDITY") && (
            <Flag
              label={t("destinations.riskFlags.thinLiquidity")}
              tooltip={t("destinations.riskFlags.thinLiquidityTooltip")}
              tone="amber"
              greyBackground={SUBTLE_CHIP_BG[variant]}
            />
          )}
          <Flag
            label={t("destinations.riskFlags.unrated")}
            tooltip={t("destinations.riskFlags.unratedTooltip")}
            tone="grey"
            greyBackground={SUBTLE_CHIP_BG[variant]}
          />
        </Box>
      </Box>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          padding: "12px 0 12px 24px",
        }}
      >
        <Button
          variant={variant === "section" ? "contained" : "outlined"}
          size="small"
          onClick={() => onOpen(destination)}
          aria-label={t("destinations.panel.openAria", {
            title: destination.title,
            platform: destination.platformName,
            interpolation: NO_ESCAPE,
          })}
          sx={
            variant === "section"
              ? { padding: "6px 12px", whiteSpace: "nowrap" }
              : {
                  minWidth: 0,
                  padding: "5px 12px",
                  borderColor: COLORS.glitter,
                  backgroundColor: COLORS.white,
                  color: COLORS.blackRock,
                  whiteSpace: "nowrap",
                  "&:hover": {
                    borderColor: COLORS.hawkesBlue,
                    backgroundColor: COLORS.white,
                  },
                }
          }
        >
          {t("destinations.panel.open")}
        </Button>
      </Box>
    </Box>
  )
}

export const DestinationRows = ({
  destinations,
  variant,
}: {
  destinations: Destination[]
  variant: DestinationRowsVariant
}) => {
  const [target, setTarget] = React.useState<ExternalLinkTarget | null>(null)

  return (
    <Box sx={{ display: "flex", flexDirection: "column" }}>
      {destinations.map((destination) => (
        <DestinationRow
          key={destination.id}
          destination={destination}
          variant={variant}
          onOpen={({ url, urlHost }) => setTarget({ url, host: urlHost })}
        />
      ))}
      <ExternalLinkGate target={target} onClose={() => setTarget(null)} />
    </Box>
  )
}

export const useDestinationsCopy = ({
  destinations,
  stale,
  aprBips,
  withdrawalBatchDuration,
}: {
  destinations: Destination[]
  stale: boolean
  aprBips: number
  withdrawalBatchDuration: number
}) => {
  const { t } = useTranslation()
  const routeCount = new Set(destinations.map((d) => d.route)).size
  const borrowsAgainst = destinations.some((d) => d.route === "BORROW_AGAINST")

  const summary = [
    t("destinations.panel.summary", {
      destinations: capitalize(
        t("destinations.panel.destinationCount", {
          count: destinations.length,
          word: numberWord(t, destinations.length),
        }),
      ),
      routes: t("destinations.panel.routeCount", {
        count: routeCount,
        word: numberWord(t, routeCount),
      }),
    }),
    borrowsAgainst &&
      t("destinations.panel.carry", { apr: formatBps(aprBips) }),
  ]
    .filter(Boolean)
    .join(" ")

  const footer = [
    stale && t("destinations.panel.stale"),
    t("destinations.panel.disclaimer"),
    borrowsAgainst &&
      t("destinations.panel.liquidationRisk", {
        cycle: formatCycle(t, withdrawalBatchDuration),
      }),
  ]
    .filter(Boolean)
    .join(" ")

  return { summary, footer }
}

export type DestinationsPanelProps = {
  destinations: Destination[]
  stale: boolean
  marketSymbol: string
  aprBips: number
  withdrawalBatchDuration: number
  closeVariant: "collapse" | "close"
  onClose: () => void
}

export const DestinationsPanel = ({
  destinations,
  stale,
  marketSymbol,
  aprBips,
  withdrawalBatchDuration,
  closeVariant,
  onClose,
}: DestinationsPanelProps) => {
  const { t } = useTranslation()
  const { summary, footer } = useDestinationsCopy({
    destinations,
    stale,
    aprBips,
    withdrawalBatchDuration,
  })

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "2px",
        border: `1px solid ${COLORS.hawkesBlue}`,
        borderRadius: "12px",
        backgroundColor: COLORS.glitter,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: "12px",
          padding: "8px 12px",
        }}
      >
        <Box
          sx={{
            flex: 1,
            minWidth: 0,
            display: "flex",
            alignItems: "flex-start",
            columnGap: "8px",
            flexWrap: "wrap",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              flexShrink: 0,
            }}
          >
            <Typography variant="text3" color={COLORS.blackRock}>
              {t("destinations.panel.whatYouCanDo")}
            </Typography>
            <Box
              sx={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0 8px",
                borderRadius: "20px",
                boxShadow: `inset 0 0 0 1px ${COLORS.cornflowerBlue05}`,
                backgroundColor: COLORS.hawkesBlue,
              }}
            >
              <Typography
                sx={{
                  fontSize: "13px",
                  lineHeight: "20px",
                  fontWeight: 600,
                  color: COLORS.blackRock,
                }}
              >
                {marketSymbol}
              </Typography>
            </Box>
          </Box>
          <Typography
            variant="text3"
            color={COLORS.blackRock}
            sx={{ opacity: 0.8 }}
          >
            {summary}
          </Typography>
        </Box>

        <IconButton
          onClick={onClose}
          aria-label={t(
            closeVariant === "collapse"
              ? "destinations.panel.collapse"
              : "destinations.panel.close",
          )}
          sx={{
            padding: 0,
            width: closeVariant === "collapse" ? "16px" : "20px",
            height: closeVariant === "collapse" ? "16px" : "20px",
            marginTop: closeVariant === "collapse" ? "2px" : 0,
          }}
        >
          {closeVariant === "collapse" ? (
            <SvgIcon viewBox="0 0 16 16" sx={{ fontSize: "16px" }}>
              <ChevronSmallUp />
            </SvgIcon>
          ) : (
            <SvgIcon
              viewBox="0 0 24 24"
              sx={{
                fontSize: "20px",
                opacity: 0.5,
                "& path": { fill: COLORS.blackRock },
              }}
            >
              <Cross />
            </SvgIcon>
          )}
        </IconButton>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          padding: "4px 8px 12px",
          borderRadius: "10px",
          backgroundColor: COLORS.white,
        }}
      >
        <DestinationRows destinations={destinations} variant="panel" />

        <Typography
          variant="text3"
          color={COLORS.blackRock}
          sx={{ padding: "0 4px", opacity: 0.7 }}
        >
          {footer}
        </Typography>
      </Box>
    </Box>
  )
}
