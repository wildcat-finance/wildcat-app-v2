import { Box, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"
import { PeriodicSchedule } from "@/utils/periodicWithdrawalWindow"

import { formatDurationFromSeconds } from "../../../utils/units"

const previewStyle = {
  margin: "20px 0 0",
  padding: "20px",
  border: `1px solid ${COLORS.whiteLilac}`,
  borderRadius: "12px",
}

export const WithdrawalSchedulePreview = ({
  firstWithdrawalWindowStart,
  periodDuration,
  withdrawalWindowDuration,
  hasErrors,
}: Partial<PeriodicSchedule> & { hasErrors: boolean }) => {
  const { t } = useTranslation()

  const schedule =
    firstWithdrawalWindowStart &&
    periodDuration &&
    withdrawalWindowDuration &&
    withdrawalWindowDuration < periodDuration &&
    !hasErrors
      ? {
          start: dayjs.unix(firstWithdrawalWindowStart).utc(),
          windowEnd: dayjs
            .unix(firstWithdrawalWindowStart + withdrawalWindowDuration)
            .utc(),
          nextStart: dayjs
            .unix(firstWithdrawalWindowStart + periodDuration)
            .utc(),
          secondWindowEnd: dayjs
            .unix(
              firstWithdrawalWindowStart +
                periodDuration +
                withdrawalWindowDuration,
            )
            .utc(),
          followingStart: dayjs
            .unix(firstWithdrawalWindowStart + periodDuration * 2)
            .utc(),
          period: formatDurationFromSeconds(periodDuration),
          openFraction: withdrawalWindowDuration / periodDuration,
        }
      : null
  const showDates =
    schedule && !schedule.start.isSame(schedule.followingStart, "day")
  const timeFormat =
    schedule &&
    (schedule.start.second() ||
      schedule.windowEnd.second() ||
      schedule.nextStart.second())
      ? "HH:mm:ss"
      : "HH:mm"
  const dateTimeFormat = `D MMM YYYY, ${timeFormat} [UTC]`
  const openFraction = schedule?.openFraction ?? 0
  const phases = [
    {
      label: t("borrower.createMarket.policy.periodic.requestsOpen"),
      color: COLORS.blueRibbon,
    },
    {
      label: t("borrower.createMarket.policy.periodic.requestsClosed"),
      color: COLORS.whiteLilac,
    },
  ]

  return (
    <Box
      component="figure"
      aria-label={
        schedule
          ? t("borrower.createMarket.policy.periodic.previewAccessible", {
              start: schedule.start.format(dateTimeFormat),
              end: schedule.windowEnd.format(dateTimeFormat),
              next: schedule.nextStart.format(dateTimeFormat),
              period: schedule.period,
            })
          : t("borrower.createMarket.policy.periodic.previewIncomplete")
      }
      sx={previewStyle}
    >
      <Box
        component="figcaption"
        sx={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}
      >
        {phases.map(({ label, color }) => (
          <Box
            key={label}
            sx={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            <Box
              aria-hidden
              sx={{
                width: "8px",
                height: "8px",
                borderRadius: "2px",
                backgroundColor: color,
                flexShrink: 0,
              }}
            />
            <Typography variant="text3">{label}</Typography>
          </Box>
        ))}
      </Box>

      <Box aria-hidden sx={{ marginTop: "16px" }}>
        <Box
          sx={{
            position: "relative",
            width: "40%",
            paddingBottom: "5px",
            borderBottom: `1px solid ${COLORS.santasGrey}`,
            textAlign: "center",
            "&::before, &::after": {
              content: '""',
              position: "absolute",
              top: "100%",
              height: "5px",
              borderLeft: `1px solid ${COLORS.santasGrey}`,
            },
            "&::before": { left: 0 },
            "&::after": { right: 0 },
          }}
        >
          <Typography variant="text4" component="div">
            {schedule
              ? t("borrower.createMarket.policy.periodic.periodLabel", {
                  period: schedule.period,
                })
              : t("common.fields.withdrawalPeriod")}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            height: "20px",
            marginTop: "8px",
            borderRadius: "4px",
            overflow: "hidden",
          }}
        >
          {/* Two complete periods, then a continuation at the same time scale. */}
          {[
            { cycle: 0, width: 40 },
            { cycle: 1, width: 40 },
            { cycle: 2, width: 20 },
          ].map(({ cycle, width }) => (
            <Box
              key={cycle}
              sx={{
                width: `${width}%`,
                overflow: "hidden",
                backgroundColor: COLORS.athensGrey,
                ...(cycle === 2 && {
                  opacity: 0.45,
                  maskImage: "linear-gradient(to right, black, transparent)",
                }),
              }}
            >
              <Box
                sx={{
                  width: `${(openFraction * 40 * 100) / width}%`,
                  height: "100%",
                  backgroundColor: COLORS.blueRibbon,
                }}
              />
            </Box>
          ))}
        </Box>
        <Box sx={{ position: "relative", height: showDates ? "64px" : "44px" }}>
          {(schedule
            ? [
                { date: schedule.start, left: 0, kind: "start" },
                {
                  date: schedule.windowEnd,
                  left: openFraction * 40,
                  kind: "close",
                },
                { date: schedule.nextStart, left: 40, kind: "repeat" },
                {
                  date: schedule.secondWindowEnd,
                  left: 40 + openFraction * 40,
                  kind: "close",
                },
                { date: schedule.followingStart, left: 80, kind: "next" },
              ]
            : []
          ).map(({ date, left, kind }) => (
            <Box
              key={date.unix()}
              sx={{
                position: "absolute",
                left: `${left}%`,
                transform: kind === "start" ? undefined : "translateX(-50%)",
                textAlign: kind === "start" ? "left" : "center",
                whiteSpace: "nowrap",
                ...(kind === "close" && {
                  display: "none",
                  [`@container schedule (min-width: ${
                    showDates ? 1200 : 800
                  }px)`]: {
                    display:
                      openFraction >= 0.25 && openFraction <= 0.75
                        ? "block"
                        : "none",
                  },
                }),
              }}
            >
              <Box
                sx={{
                  height: "6px",
                  width: 0,
                  borderLeft:
                    kind === "start"
                      ? undefined
                      : `1px solid ${COLORS.santasGrey}`,
                  margin: kind === "start" ? undefined : "0 auto",
                }}
              />
              <Typography variant="text4" component="div">
                {date.format(
                  `${timeFormat}${kind === "start" ? " [UTC]" : ""}`,
                )}
              </Typography>
              {showDates && (
                <Typography
                  variant="text4"
                  component="div"
                  color={COLORS.santasGrey}
                >
                  {date.format("D MMM YYYY")}
                </Typography>
              )}
              {kind === "next" && (
                <Typography
                  variant="text4"
                  component="div"
                  color={COLORS.blueRibbon}
                >
                  {t("borrower.createMarket.policy.periodic.nextWindow")}
                </Typography>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
