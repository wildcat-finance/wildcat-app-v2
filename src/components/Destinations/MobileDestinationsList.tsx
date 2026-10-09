import * as React from "react"

import {
  Box,
  ButtonBase,
  Collapse,
  SvgIcon,
  Tooltip,
  Typography,
} from "@mui/material"
import Image from "next/image"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import { useMarketDestinations } from "@/hooks/destinations/useDestinations"
import type { Destination } from "@/lib/destinations/types"
import { COLORS } from "@/theme/colors"

import {
  formatLoopMultiple,
  PLATFORM_LOGOS,
  useDestinationsCopy,
} from "./DestinationsPanel"
import { ExternalLinkGate, type ExternalLinkTarget } from "./ExternalLinkGate"
import { formatFractionPercent, formatUsdCompact } from "./format"

const NO_ESCAPE = { escapeValue: false }

const COLLAPSED_COUNT = 2

const SMALL_TEXT = {
  fontSize: "10px",
  lineHeight: "16px",
  fontWeight: 500,
}

const BODY_TEXT = {
  fontSize: "12px",
  lineHeight: "20px",
  fontWeight: 500,
  color: COLORS.blackRock,
}

const Chip = ({
  label,
  background,
  color,
  tooltip,
}: {
  label: string
  background: string
  color: string
  tooltip?: string
}) => {
  const chip = (
    <Box
      component="span"
      tabIndex={tooltip ? 0 : undefined}
      sx={{
        display: "inline-flex",
        alignItems: "center",
        maxWidth: "100%",
        minWidth: 0,
        height: "16px",
        padding: "0 6px",
        borderRadius: "12px",
        backgroundColor: background,
        cursor: tooltip ? "help" : "default",
        "&:focus-visible": {
          outline: `2px solid ${COLORS.ultramarineBlue}`,
          outlineOffset: "1px",
        },
      }}
    >
      <Typography
        component="span"
        sx={{
          ...SMALL_TEXT,
          color,
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {label}
      </Typography>
    </Box>
  )

  return tooltip ? (
    <Tooltip title={tooltip} placement="top" enterTouchDelay={0} describeChild>
      {chip}
    </Tooltip>
  ) : (
    chip
  )
}

const Metric = ({ label, value }: { label: string; value: string }) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      paddingRight: "8px",
    }}
  >
    <Typography
      sx={{ ...SMALL_TEXT, color: COLORS.manate, whiteSpace: "nowrap" }}
    >
      {label}
    </Typography>
    <Typography sx={{ ...BODY_TEXT, whiteSpace: "nowrap" }}>{value}</Typography>
  </Box>
)

export type MobileDestinationItemVariant = "section" | "card" | "panel"

const CHEVRON_DOWN_PATH =
  "M8.84837 4.67045L9.49609 5.31818L6.00178 8.8125L2.50746 5.31818L3.15518 4.67045L6.00178 7.50852L8.84837 4.67045Z"

export const MobileDestinationItem = ({
  destination,
  variant = "section",
  first,
  last = false,
  onOpen,
  openRef,
}: {
  destination: Destination
  variant?: MobileDestinationItemVariant
  first: boolean
  last?: boolean
  onOpen: (destination: Destination) => void
  openRef?: React.Ref<HTMLButtonElement>
}) => {
  const { t } = useTranslation()
  const { figures, affiliation } = destination
  const loopMultiple = formatLoopMultiple(figures.lltv)
  const onTint = variant === "panel"

  const body = (
    <>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "8px",
            height: "24px",
          }}
        >
          <Typography
            title={destination.title}
            sx={{
              ...BODY_TEXT,
              minWidth: 0,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {destination.title}
          </Typography>
          <ButtonBase
            ref={openRef}
            disableRipple
            onClick={() => onOpen(destination)}
            aria-label={t("destinations.panel.openAria", {
              title: destination.title,
              platform: destination.platformName,
              interpolation: NO_ESCAPE,
            })}
            sx={{
              flexShrink: 0,
              height: "24px",
              padding: "4px 10px",
              borderRadius: "8px",
              boxShadow: `inset 0 0 0 1px ${COLORS.iron}`,
              fontFamily: "inherit",
              fontSize: "10px",
              lineHeight: "16px",
              fontWeight: 600,
              color: COLORS.blackRock,
              whiteSpace: "nowrap",
              "&.Mui-focusVisible": {
                outline: `2px solid ${COLORS.ultramarineBlue}`,
                outlineOffset: "1px",
              },
              "@media (forced-colors: active)": {
                border: "1px solid ButtonText",
              },
            }}
          >
            {t("destinations.panel.open")}
          </ButtonBase>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "4px",
            height: "20px",
            minWidth: 0,
          }}
        >
          <Box
            sx={{
              display: "inline-flex",
              alignItems: "center",
              flexShrink: 0,
              gap: "4px",
              padding: "2px 8px 2px 4px",
              borderRadius: "12px",
              backgroundColor: onTint ? COLORS.white : COLORS.whiteSmoke,
            }}
          >
            <Image
              src={PLATFORM_LOGOS[destination.platform]}
              alt=""
              width={12}
              height={12}
              style={{ borderRadius: "50%" }}
            />
            <Typography
              component="span"
              sx={{
                ...SMALL_TEXT,
                color: COLORS.blackRock,
                whiteSpace: "nowrap",
              }}
            >
              {destination.platformName}
            </Typography>
          </Box>
          {destination.curators.length > 0 && (
            <Typography
              component="span"
              sx={{
                ...SMALL_TEXT,
                minWidth: 0,
                color: COLORS.blackRock07,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {destination.curators.join(", ")}
            </Typography>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
        <Metric
          label={t("destinations.columns.lltv")}
          value={formatFractionPercent(figures.lltv)}
        />
        <Metric
          label={t("destinations.columns.borrowableNow")}
          value={formatUsdCompact(figures.availableLiquidityUsd)}
        />
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            flex: "1 1 0",
            minWidth: 0,
            gap: "2px",
          }}
        >
          <Typography
            sx={{ ...SMALL_TEXT, color: COLORS.manate, whiteSpace: "nowrap" }}
          >
            {t("destinations.columns.mechanicsAndRisks")}
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "2px",
              padding: "2px 0",
            }}
          >
            <Chip
              label={t(`destinations.route.${destination.route}`)}
              background={COLORS.pinkLace}
              color={COLORS.mediumRedViolet}
            />
            {loopMultiple && (
              <Chip
                label={t("destinations.panel.loopable", {
                  multiple: loopMultiple,
                })}
                background={COLORS.pinkLace}
                color={COLORS.mediumRedViolet}
              />
            )}
            <Chip
              label={destination.token.symbol}
              background={onTint ? COLORS.white : COLORS.blackHaze}
              color={COLORS.blackRock}
            />
            {affiliation.kind === "affiliated" && (
              <Chip
                label={t("destinations.riskFlags.affiliated")}
                background={COLORS.oasis}
                color={COLORS.butteredRum}
                tooltip={t("destinations.riskFlags.affiliatedTooltip", {
                  entity: affiliation.entityName,
                  interpolation: NO_ESCAPE,
                })}
              />
            )}
            {destination.notices.includes("THIN_LIQUIDITY") && (
              <Chip
                label={t("destinations.riskFlags.thinLiquidity")}
                background={COLORS.oasis}
                color={COLORS.butteredRum}
                tooltip={t("destinations.riskFlags.thinLiquidityTooltip")}
              />
            )}
          </Box>
        </Box>
      </Box>
    </>
  )

  if (variant === "section") {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          paddingBottom: "8px",
          ...(!first && {
            paddingTop: "16px",
            borderTop: `1px solid ${COLORS.whiteLilac}`,
          }),
        }}
      >
        {body}
      </Box>
    )
  }

  return (
    <Box sx={{ padding: "4px" }}>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          padding: "4px 4px 8px",
          ...(!last && {
            borderBottom: `1px solid ${
              onTint ? COLORS.glitter : COLORS.whiteLilac
            }`,
          }),
        }}
      >
        {body}
      </Box>
    </Box>
  )
}

const MobileDestinationItems = ({
  destinations,
  variant,
  onOpen,
}: {
  destinations: Destination[]
  variant: MobileDestinationItemVariant
  onOpen: (destination: Destination) => void
}) => (
  <>
    {destinations.map((destination, index) => (
      <MobileDestinationItem
        key={destination.id}
        destination={destination}
        variant={variant}
        first={index === 0}
        last={index === destinations.length - 1}
        onOpen={onOpen}
      />
    ))}
  </>
)

export const MobileDestinationsList = ({
  destinations,
  stale,
}: {
  destinations: Destination[]
  stale: boolean
}) => {
  const { t } = useTranslation()
  const [expanded, setExpanded] = React.useState(false)
  const [target, setTarget] = React.useState<ExternalLinkTarget | null>(null)
  const focusRevealed = React.useRef(false)
  const firstRevealedRef = React.useRef<HTMLButtonElement>(null)

  const openDestination = ({ url, urlHost }: Destination) =>
    setTarget({ url, host: urlHost })

  const visible = destinations.slice(0, COLLAPSED_COUNT)
  const rest = destinations.slice(COLLAPSED_COUNT)

  return (
    <>
      {stale && (
        <Typography variant="mobText4" color={COLORS.amberText}>
          {t("destinations.panel.stale")}
        </Typography>
      )}

      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {visible.map((destination, index) => (
          <MobileDestinationItem
            key={destination.id}
            destination={destination}
            first={index === 0}
            onOpen={openDestination}
          />
        ))}
        {rest.length > 0 && (
          <Collapse
            in={expanded}
            timeout={250}
            unmountOnExit
            onEntered={() => {
              if (focusRevealed.current) firstRevealedRef.current?.focus()
              focusRevealed.current = false
            }}
          >
            {rest.map((destination, index) => (
              <MobileDestinationItem
                key={destination.id}
                destination={destination}
                first={false}
                onOpen={openDestination}
                openRef={index === 0 ? firstRevealedRef : undefined}
              />
            ))}
          </Collapse>
        )}
      </Box>

      {rest.length > 0 && (
        <ButtonBase
          disableRipple
          onClick={(event) => {
            focusRevealed.current = !expanded && event.detail === 0
            setExpanded((value) => !value)
          }}
          aria-expanded={expanded}
          sx={{
            alignSelf: "center",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            marginBottom: "8px",
            borderRadius: "4px",
            fontFamily: "inherit",
            "&.Mui-focusVisible": {
              outline: `2px solid ${COLORS.ultramarineBlue}`,
              outlineOffset: "2px",
            },
          }}
        >
          <SvgIcon
            viewBox="0 0 16 16"
            sx={{
              fontSize: "16px",
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform 200ms ease",
              "& path": { fill: COLORS.ultramarineBlue },
            }}
          >
            <path d="M11.7985 6.22727L12.6621 7.09091L8.00302 11.75L3.34393 7.09091L4.20756 6.22727L8.00302 10.0114L11.7985 6.22727Z" />
          </SvgIcon>
          <Typography
            component="span"
            sx={{
              fontSize: "11px",
              lineHeight: "16px",
              fontWeight: 600,
              color: COLORS.blueRibbon,
            }}
          >
            {expanded
              ? t("destinations.section.seeLess")
              : t("destinations.section.seeMore")}
          </Typography>
        </ButtonBase>
      )}

      <ExternalLinkGate target={target} onClose={() => setTarget(null)} />
    </>
  )
}

export const MobileDestinationsPanel = ({
  id,
  destinations,
  stale,
  marketSymbol,
  aprBips,
  withdrawalBatchDuration,
  onClose,
}: {
  id?: string
  destinations: Destination[]
  stale: boolean
  marketSymbol: string
  aprBips: number
  withdrawalBatchDuration: number
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const [target, setTarget] = React.useState<ExternalLinkTarget | null>(null)
  const { summary } = useDestinationsCopy({
    destinations,
    stale,
    aprBips,
    withdrawalBatchDuration,
  })

  return (
    <Box
      id={id}
      role="region"
      aria-label={`${t("destinations.panel.whatYouCanDo")} ${marketSymbol}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose()
      }}
      sx={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        border: `1px solid ${COLORS.glitter}`,
        borderRadius: "8px",
        backgroundColor: COLORS.zircon,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "6px",
          padding: "12px 8px 6px",
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            paddingRight: "24px",
            minWidth: 0,
          }}
        >
          <Typography
            sx={{
              fontSize: "14px",
              lineHeight: "24px",
              fontWeight: 500,
              color: COLORS.blackRock,
              whiteSpace: "nowrap",
            }}
          >
            {t("destinations.panel.whatYouCanDo")}
          </Typography>
          <Box
            component="span"
            sx={{
              display: "inline-flex",
              alignItems: "center",
              minWidth: 0,
              padding: "0 8px",
              borderRadius: "20px",
              boxShadow: `inset 0 0 0 1px ${COLORS.cornflowerBlue05}`,
              backgroundColor: COLORS.hawkesBlue,
            }}
          >
            <Typography
              component="span"
              sx={{
                ...BODY_TEXT,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {marketSymbol}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ ...BODY_TEXT, opacity: 0.8 }}>{summary}</Typography>
        {stale && (
          <Typography variant="mobText4" color={COLORS.amberText}>
            {t("destinations.panel.stale")}
          </Typography>
        )}
      </Box>

      <ButtonBase
        disableRipple
        onClick={onClose}
        aria-label={t("destinations.panel.close")}
        sx={{
          position: "absolute",
          top: "8px",
          right: "2px",
          padding: "8px",
          borderRadius: "8px",
          "&.Mui-focusVisible": {
            outline: `2px solid ${COLORS.ultramarineBlue}`,
            outlineOffset: "2px",
          },
        }}
      >
        <SvgIcon
          viewBox="0 0 24 24"
          sx={{
            fontSize: "16px",
            opacity: 0.7,
            "& path": { fill: COLORS.blueRibbon },
          }}
        >
          <Cross />
        </SvgIcon>
      </ButtonBase>

      <MobileDestinationItems
        destinations={destinations}
        variant="panel"
        onOpen={({ url, urlHost }) => setTarget({ url, host: urlHost })}
      />

      <ExternalLinkGate target={target} onClose={() => setTarget(null)} />
    </Box>
  )
}

export const MobileComposableBlock = ({
  chainId,
  marketAddress,
  marginTop,
}: {
  chainId: number
  marketAddress: string
  marginTop?: string
}) => {
  const { t } = useTranslation()
  const { destinations } = useMarketDestinations(chainId, marketAddress)
  const [expanded, setExpanded] = React.useState(false)
  const [target, setTarget] = React.useState<ExternalLinkTarget | null>(null)
  const regionId = `composable-card-${marketAddress.toLowerCase()}`

  if (destinations.length === 0) return null

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        marginTop,
        padding: "6px 2px 2px",
        borderRadius: "10px",
        backgroundColor: COLORS.glitter07,
      }}
    >
      <ButtonBase
        disableRipple
        aria-expanded={expanded}
        aria-controls={regionId}
        onClick={() => setExpanded((value) => !value)}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: expanded ? "0 10px 4px" : "0 8px 4px",
          borderRadius: "6px",
          fontFamily: "inherit",
          transition: "padding 250ms ease",
          "&.Mui-focusVisible": {
            outline: `2px solid ${COLORS.ultramarineBlue}`,
            outlineOffset: "1px",
          },
        }}
      >
        <Typography
          component="span"
          sx={{
            fontSize: "10px",
            lineHeight: "16px",
            fontWeight: 600,
            color: COLORS.blueRibbon,
            whiteSpace: "nowrap",
          }}
        >
          {t("destinations.cardToggle", { count: destinations.length })}
        </Typography>
        <SvgIcon
          viewBox="0 0 12 12"
          sx={{
            fontSize: "12px",
            transform: expanded ? "rotate(180deg)" : "none",
            transition: "transform 200ms ease",
            "& path": { fill: COLORS.ultramarineBlue },
          }}
        >
          <path d={CHEVRON_DOWN_PATH} />
        </SvgIcon>
      </ButtonBase>

      <Collapse in={expanded} timeout={250} unmountOnExit>
        <Box id={regionId} sx={{ paddingTop: "3px" }}>
          <Box sx={{ borderRadius: "8px", backgroundColor: COLORS.white }}>
            <MobileDestinationItems
              destinations={destinations}
              variant="card"
              onOpen={({ url, urlHost }) => setTarget({ url, host: urlHost })}
            />
          </Box>
        </Box>
      </Collapse>

      <ExternalLinkGate target={target} onClose={() => setTarget(null)} />
    </Box>
  )
}
