import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Profile from "@/assets/icons/profile_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderMobileMarketItem = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  apr: number
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  capacityLeft?: TokenAmount
  borrower: string | undefined
  loan?: TokenAmount | undefined
  asset: string
  isSelfOnboard?: boolean
}

export const DepositArrow = () => (
  <SvgIcon
    sx={{
      fontSize: "11px",
      transform: "rotate(180deg)",
      "& path": { fill: COLORS.white },
    }}
  >
    <Arrow />
  </SvgIcon>
)

export const MobileMarketCard = ({
  marketItem,
  buttonText,
  buttonIcon,
}: {
  marketItem: LenderMobileMarketItem
  buttonText?: string
  buttonIcon?: boolean
}) => (
  <Box
    sx={{
      width: "100%",
      backgroundColor: COLORS.white,
      padding: "12px",
      borderRadius: "14px",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "14px",
      }}
    >
      <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
        <MarketStatusChip status={marketItem.status} withPeriod={false} />

        <Box sx={{ display: "flex", gap: "4px", alignItems: "center" }}>
          <Typography variant="mobText4">{`${formatBps(
            marketItem.apr,
          )}%`}</Typography>
          <TooltipButton value="TST" size="small" />
        </Box>
      </Box>

      <MarketTypeChip {...marketItem.term} />
    </Box>

    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "2px",
      }}
    >
      <Typography variant="mobText2">{marketItem.name}</Typography>

      <Typography variant="mobText2">
        {marketItem.capacityLeft && marketItem.capacityLeft.gt(0)
          ? formatTokenWithCommas(marketItem.capacityLeft, {
              withSymbol: false,
              fractionDigits: 2,
            })
          : "0"}{" "}
        {marketItem.asset}
      </Typography>
    </Box>

    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "14px",
      }}
    >
      <Typography variant="mobText4">{marketItem.borrower}</Typography>

      <Typography variant="mobText4" color={COLORS.santasGrey}>
        available to lend
      </Typography>
    </Box>

    <Divider />

    <Box
      sx={{
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        marginTop: "14px",
      }}
    >
      <Box sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
        {marketItem.loan && (
          <SvgIcon
            sx={{
              fontSize: "10px",
              "& path": { fill: COLORS.santasGrey },
            }}
          >
            <Profile />
          </SvgIcon>
        )}

        <Typography variant="mobText4" color={COLORS.santasGrey}>
          {marketItem.loan
            ? formatTokenWithCommas(marketItem.loan, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}{" "}
          {marketItem.asset} deposited
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: "6px" }}>
        <Link
          href={`${ROUTES.lender.market}/${marketItem.id}`}
          style={{ textDecoration: "none" }}
        >
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            sx={{
              borderRadius: "8px",
              padding: "6px 14px",
              minWidth: "fit-content !important",
            }}
          >
            More
          </Button>
        </Link>
        {buttonText && (
          <Link
            href={`${ROUTES.lender.market}/${marketItem.id}`}
            style={{ textDecoration: "none" }}
          >
            <Button
              variant="contained"
              size="small"
              sx={{
                minWidth: "fit-content !important",
                height: "100%",
                display: "flex",
                gap: "2px",
                borderRadius: "8px",
                padding: "6px 14px",
              }}
            >
              {buttonText}

              {buttonIcon && <DepositArrow />}
            </Button>
          </Link>
        )}
      </Box>
    </Box>
  </Box>
)
