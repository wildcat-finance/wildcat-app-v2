import * as React from "react"

import {
  Box,
  Button,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import humanizeDuration from "humanize-duration"
import { useTranslation } from "react-i18next"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { MarketHeaderProps } from "./interface"
import {
  MarketHeaderStatusContainer,
  MarketHeaderTitleContainer,
  MarketHeaderUpperContainer,
} from "./style"

export const MarketHeader = ({ marketAccount }: MarketHeaderProps) => {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

  const [remainingTime, setRemainingTime] = React.useState<string | undefined>(
    "",
  )
  const { t } = useTranslation()

  const { market } = marketAccount

  const { data } = useGetWithdrawals(market)

  const cycleStart = data.activeWithdrawal?.requests[0]?.blockTimestamp

  React.useEffect(() => {
    const cycleEnd =
      cycleStart !== undefined ? cycleStart + market.withdrawalBatchDuration : 0

    if (cycleStart) {
      const updateRemainingTime = () => {
        const now = Math.floor(Date.now() / 1000)
        const timeLeft = cycleEnd - now
        if (timeLeft > 0) {
          setRemainingTime(
            humanizeDuration(timeLeft * 1000, {
              round: true,
              largest: 1,
              units: ["h", "m", "s"],
            }),
          )
        } else {
          setRemainingTime(undefined)
        }
      }

      updateRemainingTime()

      const intervalId = setInterval(updateRemainingTime, 1000)

      return () => clearInterval(intervalId)
    }

    return undefined
  }, [data, market.withdrawalBatchDuration, cycleStart])

  const marketStatus = getMarketStatusChip(market)

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <Box sx={MarketHeaderStatusContainer(theme)}>
          <MarketStatusChip status={marketStatus} variant="filled" />
          {remainingTime && (
            <MarketCycleChip
              status={marketStatus.status}
              time={remainingTime}
            />
          )}
        </Box>

        <Box sx={MarketHeaderTitleContainer} marginBottom="20px">
          <Typography
            variant="title2"
            sx={{
              maxWidth: remainingTime ? "430px" : "550px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {market.name}
          </Typography>
          <Typography variant="text4">
            {market.underlyingToken.symbol}
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            width: "100%",
            overflowX: "auto",
            whiteSpace: "nowrap",
            gap: "4px",
          }}
        >
          <Button
            variant="text"
            size="small"
            sx={{ padding: "6px 8px", flexShrink: 0 }}
          >
            Deposit and Withdraw
          </Button>

          <Button
            variant="text"
            size="small"
            sx={{ padding: "6px 8px", flexShrink: 0 }}
          >
            Status
          </Button>

          <Button
            variant="text"
            size="small"
            sx={{ padding: "6px 8px", flexShrink: 0 }}
          >
            Withdrawal Requests
          </Button>

          <Button
            variant="text"
            size="small"
            sx={{ padding: "6px 8px", flexShrink: 0 }}
          >
            MLA
          </Button>
        </Box>
      </Box>
    )

  return (
    <Box sx={MarketHeaderUpperContainer}>
      {market.name.length > 32 ? (
        <Tooltip title={market.name} placement="right">
          <Box sx={MarketHeaderTitleContainer}>
            <Typography
              variant="title1"
              sx={{
                maxWidth: remainingTime ? "430px" : "550px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {market.name}
            </Typography>
            <Typography variant="text4">
              {market.underlyingToken.symbol}
            </Typography>
          </Box>
        </Tooltip>
      ) : (
        <Box sx={MarketHeaderTitleContainer}>
          <Typography
            variant="title1"
            sx={{
              maxWidth: remainingTime ? "430px" : "550px",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              overflow: "hidden",
            }}
          >
            {market.name}
          </Typography>
          <Typography variant="text4">
            {market.underlyingToken.symbol}
          </Typography>
        </Box>
      )}
      <Box sx={MarketHeaderStatusContainer(theme)}>
        <MarketStatusChip status={marketStatus} variant="filled" />
        {remainingTime && (
          <MarketCycleChip status={marketStatus.status} time={remainingTime} />
        )}
      </Box>
    </Box>
  )
}
