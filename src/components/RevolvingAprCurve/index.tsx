import { useId } from "react"

import { Box, Typography } from "@mui/material"
import type { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"
import { formatBps } from "@/utils/formatters"

import { getRevolvingAprCurve } from "./model"

const plot = { left: 44, right: 302, top: 18, bottom: 138 }

export const RevolvingAprCurve = ({ market }: { market: Market }) => {
  const { t } = useTranslation()
  const gradientId = useId()
  const curve = getRevolvingAprCurve(market)
  const range = curve ? curve.maximumAprBips - curve.minimumAprBips : 0
  const y = (apr: number) =>
    curve && range > 0
      ? plot.bottom -
        ((apr - curve.minimumAprBips) / range) * (plot.bottom - plot.top)
      : (plot.top + plot.bottom) / 2
  const markerX =
    plot.left +
    ((curve?.utilizationBips ?? 0) / 10_000) * (plot.right - plot.left)
  const showCurrentTick =
    curve && curve.utilizationBips > 1500 && curve.utilizationBips < 8500

  return (
    <Box sx={{ width: "100%", maxWidth: "320px", minWidth: 0 }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <Typography variant="text3">{t("common.fields.lenderApr")}</Typography>
        <TooltipButton value={t("marketDetails.shared.aprCurve.tooltip")} />
      </Box>
      {curve ? (
        <>
          <Typography
            component="div"
            sx={{
              marginTop: "4px",
              fontSize: "32px",
              lineHeight: "40px",
              fontWeight: 500,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatBps(curve.currentAprBips)}%
          </Typography>
          <Typography variant="text3" color={COLORS.matteSilver}>
            {t("marketDetails.shared.aprCurve.atUtilization", {
              utilization: formatBps(curve.utilizationBips),
            })}
          </Typography>
          <Box
            component="figure"
            role="img"
            aria-label={t("marketDetails.shared.aprCurve.accessible", {
              current: formatBps(curve.currentAprBips),
              utilization: formatBps(curve.utilizationBips),
              minimum: formatBps(curve.minimumAprBips),
              maximum: formatBps(curve.maximumAprBips),
            })}
            sx={{ margin: "12px 0 0" }}
          >
            <Box
              component="svg"
              viewBox="0 0 320 174"
              aria-hidden
              sx={{
                display: "block",
                width: "100%",
                overflow: "visible",
                "& text": {
                  fontSize: "12px",
                  fill: COLORS.matteSilver,
                  fontVariantNumeric: "tabular-nums",
                },
              }}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="0%"
                    stopColor={COLORS.blueRibbon}
                    stopOpacity={0.14}
                  />
                  <stop
                    offset="100%"
                    stopColor={COLORS.blueRibbon}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              </defs>
              <path
                d={`M${plot.left} ${plot.bottom} L${plot.left} ${y(
                  curve.minimumAprBips,
                )} L${plot.right} ${y(curve.maximumAprBips)} L${plot.right} ${
                  plot.bottom
                } Z`}
                fill={`url(#${gradientId})`}
              />
              <path
                d={`M${plot.left} ${plot.top} V${plot.bottom} H${plot.right}`}
                fill="none"
                stroke={COLORS.iron}
              />
              <path
                d={`M${plot.left} ${y(curve.minimumAprBips)} L${plot.right} ${y(
                  curve.maximumAprBips,
                )}`}
                fill="none"
                stroke={COLORS.blueRibbon}
                strokeWidth={2}
                strokeLinecap="round"
              />
              <line
                x1={markerX}
                x2={markerX}
                y1={y(curve.currentAprBips)}
                y2={plot.bottom}
                stroke={COLORS.santasGrey}
                strokeDasharray="3 3"
              />
              <circle
                cx={markerX}
                cy={y(curve.currentAprBips)}
                r={5}
                fill={COLORS.white}
                stroke={COLORS.blueRibbon}
                strokeWidth={2}
              />
              <text
                x={plot.left - 8}
                y={y(curve.minimumAprBips) + 4}
                textAnchor="end"
              >
                {formatBps(curve.minimumAprBips)}%
              </text>
              {range > 0 && (
                <text x={plot.left - 8} y={plot.top + 4} textAnchor="end">
                  {formatBps(curve.maximumAprBips)}%
                </text>
              )}
              <text x={plot.left} y={plot.bottom + 22} textAnchor="middle">
                0%
              </text>
              {showCurrentTick && (
                <text x={markerX} y={plot.bottom + 22} textAnchor="middle">
                  {formatBps(curve.utilizationBips)}%
                </text>
              )}
              <text x={plot.right} y={plot.bottom + 22} textAnchor="middle">
                100%
              </text>
            </Box>
            <Typography
              component="figcaption"
              variant="text4"
              color={COLORS.matteSilver}
              sx={{ textAlign: "center", paddingLeft: "26px" }}
            >
              {t("marketDetails.shared.aprCurve.utilization")}
            </Typography>
          </Box>
          {curve.penaltyAprBips > 0 && (
            <Typography
              variant="text4"
              component="div"
              color={COLORS.dullRed}
              sx={{ marginTop: "12px" }}
            >
              {t("marketDetails.shared.aprCurve.penalty", {
                apr: formatBps(curve.penaltyAprBips),
              })}
            </Typography>
          )}
        </>
      ) : (
        <Typography
          variant="text3"
          component="div"
          color={COLORS.matteSilver}
          sx={{ padding: "24px 0" }}
        >
          {t(
            market.isClosed
              ? "marketDetails.shared.withdrawalCycle.ended"
              : "marketDetails.shared.aprCurve.unavailable",
          )}
        </Typography>
      )}
    </Box>
  )
}
