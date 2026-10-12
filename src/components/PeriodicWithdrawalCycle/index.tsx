import { Box, SvgIcon, Typography } from "@mui/material"
import type { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { COLORS } from "@/theme/colors"
import { formatCompactDuration } from "@/utils/periodicWithdrawalWindow"

import { getWithdrawalCyclePhase } from "./timing"

const arcs = {
  open: "M160 55 A85 85 0 0 1 160 225",
  closed: "M160 225 A85 85 0 0 1 160 55",
}

export const PeriodicWithdrawalCycle = ({ market }: { market: Market }) => {
  const { t } = useTranslation()
  const now = useLivePeriodicNowSeconds(market)
  const phase = getWithdrawalCyclePhase(market, now)
  const config = market.periodicHooksConfig
  if (!phase || !config) return null

  const isRunning = phase.kind === "open" || phase.kind === "closed"
  const isOpen = phase.kind === "open" || phase.kind === "unrestricted"
  const activeColor = isOpen ? COLORS.blueRibbon : COLORS.blackRock
  const countdown =
    phase.remaining !== undefined
      ? formatCompactDuration(phase.remaining)
      : undefined
  const angle = isRunning
    ? (isOpen ? -Math.PI / 2 : Math.PI / 2) + phase.progress * Math.PI
    : 0
  const openLabel = t("marketDetails.shared.withdrawalCycle.open")
  const closedLabel = t("marketDetails.shared.withdrawalCycle.closed")
  let description: string
  if (isRunning) {
    description = t("marketDetails.shared.withdrawalCycle.accessible", {
      phase: isOpen ? openLabel : closedLabel,
      remaining: countdown,
      open: formatCompactDuration(config.withdrawalWindowDuration),
      closed: formatCompactDuration(
        config.periodDuration - config.withdrawalWindowDuration,
      ),
    })
  } else if (phase.kind === "upcoming") {
    description = t("marketDetails.shared.withdrawalCycle.startsIn", {
      remaining: countdown,
    })
  } else {
    description = t(
      phase.kind === "ended"
        ? "marketDetails.shared.withdrawalCycle.ended"
        : "marketDetails.shared.withdrawalCycle.unrestricted",
    )
  }

  return (
    <Box
      component="figure"
      role="img"
      aria-label={description}
      sx={{
        position: "relative",
        width: "100%",
        maxWidth: "340px",
        containerType: "inline-size",
        aspectRatio: "320 / 280",
        margin: 0,
        "@keyframes withdrawal-flow": {
          to: { strokeDashoffset: -10 },
        },
        "@media (prefers-reduced-motion: reduce)": {
          "& *": {
            animation: "none !important",
            transition: "none !important",
          },
        },
      }}
    >
      <Box
        component="svg"
        viewBox="0 0 320 280"
        aria-hidden
        sx={{ width: "100%", height: "100%", display: "block" }}
      >
        {(["open", "closed"] as const).map((kind) => (
          <Box
            component="path"
            key={kind}
            d={arcs[kind]}
            pathLength={100}
            fill="none"
            stroke={COLORS.iron}
            strokeWidth={2.5}
            strokeDasharray="1 4"
            strokeLinecap="round"
            sx={{
              animation:
                isRunning && phase.kind === kind
                  ? "withdrawal-flow 3s linear infinite"
                  : "none",
            }}
          />
        ))}
        {isRunning && (
          <>
            <path
              d={arcs[phase.kind]}
              pathLength={100}
              fill="none"
              stroke={activeColor}
              strokeWidth={3.5}
              strokeDasharray={`${phase.progress * 100} 100`}
              strokeLinecap="round"
            />
            <circle
              cx={160 + 85 * Math.cos(angle)}
              cy={140 + 85 * Math.sin(angle)}
              r={6}
              fill={COLORS.white}
              stroke={activeColor}
              strokeWidth={3}
            />
          </>
        )}
        <text
          x={63}
          y={144}
          textAnchor="end"
          fill={COLORS.matteSilver}
          fontSize={11}
        >
          {formatCompactDuration(
            config.periodDuration - config.withdrawalWindowDuration,
          )}
        </text>
        <text x={257} y={144} fill={COLORS.matteSilver} fontSize={11}>
          {formatCompactDuration(config.withdrawalWindowDuration)}
        </text>
      </Box>

      {(["open", "closed"] as const).map((kind) => {
        const active =
          phase.kind === kind ||
          (kind === "open" && phase.kind === "unrestricted")
        const color = kind === "open" ? COLORS.blueRibbon : COLORS.blackRock
        return (
          <Box
            key={kind}
            aria-hidden
            sx={{
              position: "absolute",
              top: `${((kind === "open" ? 55 : 225) / 280) * 100}%`,
              left: "50%",
              transform: "translate(-50%, -50%)",
              display: "flex",
              alignItems: "center",
              padding: "6px 10px",
              borderRadius: "40px",
              border: `1px solid ${active ? color : COLORS.whiteLilac}`,
              backgroundColor: active ? color : COLORS.white,
              color: active ? COLORS.white : COLORS.matteSilver,
              whiteSpace: "nowrap",
              transition: "background-color 240ms, border-color 240ms",
            }}
          >
            <SvgIcon
              sx={{ fontSize: "15px", marginRight: "6px" }}
              viewBox="0 0 24 24"
            >
              {kind === "open" ? (
                <path
                  d="M12 19V5m-6 6 6-6 6 6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ) : (
                <path
                  d="M7 10V7a5 5 0 0 1 10 0v3M6 10h12a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.7}
                />
              )}
            </SvgIcon>
            <Typography variant="text3" color="inherit">
              {kind === "open" ? openLabel : closedLabel}
            </Typography>
            <Box
              sx={{
                maxWidth: active && countdown ? "130px" : 0,
                overflow: "hidden",
                transition: "max-width 240ms ease",
              }}
            >
              <Typography
                variant="text4"
                component="div"
                color="inherit"
                sx={{
                  backgroundColor: COLORS.white02,
                  borderRadius: "24px",
                  marginLeft: "8px",
                  padding: "3px 7px",
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {countdown &&
                  t("marketDetails.shared.withdrawalCycle.remaining", {
                    remaining: countdown,
                  })}
              </Typography>
            </Box>
          </Box>
        )
      })}

      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "45%",
          textAlign: "center",
        }}
      >
        {isRunning ? (
          <>
            <Typography
              variant="text4"
              component="div"
              color={COLORS.santasGrey}
            >
              {t("marketDetails.shared.withdrawalCycle.elapsed")}
            </Typography>
            <Typography
              component="div"
              sx={{
                fontSize: "clamp(18px, 8cqi, 26px)",
                lineHeight: "36px",
                fontWeight: 500,
                fontVariantNumeric: "tabular-nums",
                color: activeColor,
              }}
            >
              {formatCompactDuration(phase.elapsed)}
            </Typography>
            <Typography
              variant="text4"
              component="div"
              color={COLORS.santasGrey}
            >
              {t(
                isOpen
                  ? "marketDetails.shared.withdrawalCycle.ofOpen"
                  : "marketDetails.shared.withdrawalCycle.ofClosed",
                { duration: formatCompactDuration(phase.duration) },
              )}
            </Typography>
          </>
        ) : (
          <Typography
            variant="text3"
            component="div"
            color={COLORS.matteSilver}
          >
            {description}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
