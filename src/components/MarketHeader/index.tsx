import * as React from "react"

import { Box, Button, Tooltip, Typography, useTheme } from "@mui/material"
import humanizeDuration from "humanize-duration"

import { useGetWithdrawals } from "@/app/[locale]/borrower/market/[address]/hooks/useGetWithdrawals"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketCycleChip } from "@/components/MarketCycleChip"
import { MobileMoreButton } from "@/components/Mobile/MobileMoreButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { getMarketStatusChip } from "@/utils/marketStatus"

import { MarketHeaderProps } from "./interface"
import {
  MarketHeaderStatusContainer,
  MarketHeaderTitleContainer,
  MarketHeaderUpperContainer,
} from "./style"

export const MarketHeader = ({ marketAccount, mla }: MarketHeaderProps) => {
  const theme = useTheme()
  const isMobile = useMobileResolution()

  const [remainingTime, setRemainingTime] = React.useState<string | undefined>(
    "",
  )

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

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
          }}
        >
          <Box sx={MarketHeaderTitleContainer}>
            <Typography
              variant="mobH2"
              sx={{
                maxWidth: "280px",
                whiteSpace: "nowrap",
                textOverflow: "ellipsis",
                overflow: "hidden",
              }}
            >
              {market.name}
            </Typography>
            <Typography variant="mobText4">
              {market.underlyingToken.symbol}
            </Typography>
          </Box>

          <MobileMoreButton marketAccount={marketAccount} />
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
            sx={{
              minWidth: "fit-content",
              padding: "6px 8px",
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              backgroundColor: COLORS.hintOfRed,
            }}
            component="a"
            href="#status"
          >
            Status
          </Button>
          <Button
            variant="text"
            size="small"
            sx={{
              minWidth: "fit-content",
              padding: "6px 8px",
              flexShrink: 0,
              fontSize: 10,
              fontWeight: 600,
              lineHeight: "16px",
              backgroundColor: COLORS.hintOfRed,
            }}
            component="a"
            href="#requests"
          >
            Withdrawal Requests
          </Button>
          {mla && !("noMLA" in mla) && (
            <Button
              variant="text"
              size="small"
              sx={{
                minWidth: "fit-content",
                padding: "6px 8px",
                flexShrink: 0,
                fontSize: 10,
                fontWeight: 600,
                lineHeight: "16px",
                backgroundColor: COLORS.hintOfRed,
              }}
              component="a"
              href="#mla"
            >
              MLA
            </Button>
          )}
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
