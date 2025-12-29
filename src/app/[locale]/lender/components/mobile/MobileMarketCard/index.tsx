import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import {
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

import {
  AprWithdrawalChipContainer,
  AprWithdrawalContainer,
  AprWithdrawalItemContainer,
  CardContainer,
  CardFooterButtonContainer,
  CardFooterButtonsContainer,
  CardFooterContainer,
  MainInfoColumnContainer,
  MainInfoContainer,
  StatusAndTermContainer,
} from "./style"

export type LenderMobileMarketItem = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  apr: number
  withdrawalBatchDuration: number
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  capacityLeft?: TokenAmount
  borrower: string | undefined
  borrowerAddress: string | undefined
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
  showBorrower = true,
  adsComponent,
}: {
  marketItem: LenderMobileMarketItem
  buttonText?: string
  buttonIcon?: boolean
  showBorrower?: boolean
  adsComponent?: React.ReactNode
}) => {
  const getDepositLine = () => {
    if (marketItem.loan) {
      if (marketItem.loan?.raw.isZero()) {
        return "0"
      }
      if (
        Number(
          formatTokenWithCommas(marketItem.loan, {
            fractionDigits: 2,
          }),
        ) < 0.00001
      ) {
        return "< 0.00001"
      }
      return formatTokenWithCommas(marketItem.loan, {
        fractionDigits: 2,
      })
    }

    return "0"
  }

  return (
    <Box sx={CardContainer}>
      <Box sx={StatusAndTermContainer}>
        <MarketStatusChip status={marketItem.status} withPeriod={false} />

        <MarketTypeChip type="table" {...marketItem.term} isMobile />
      </Box>

      <Box sx={MainInfoContainer}>
        <Box sx={MainInfoColumnContainer}>
          <Typography variant="mobText2">{marketItem.name}</Typography>

          {showBorrower && (
            <Link
              href={`${ROUTES.lender.profile}/${marketItem.borrowerAddress}`}
              style={{
                display: "flex",
                width: "fit-content",
                textDecoration: "none",
              }}
            >
              <BorrowerProfileChip
                borrower={marketItem.borrower ?? marketItem.borrowerAddress}
              />
            </Link>
          )}
        </Box>

        <Box
          sx={{
            ...MainInfoColumnContainer,
            alignItems: "flex-end",
          }}
        >
          <Typography variant="mobText2">
            {marketItem.capacityLeft && marketItem.capacityLeft.gt(0)
              ? formatTokenWithCommas(marketItem.capacityLeft, {
                  withSymbol: false,
                  fractionDigits: 2,
                })
              : "0"}{" "}
            {marketItem.asset}
          </Typography>

          <Typography variant="mobText4" color={COLORS.manate}>
            available to lend
          </Typography>
        </Box>
      </Box>

      <Divider />

      <Box sx={AprWithdrawalContainer}>
        <Box sx={AprWithdrawalItemContainer}>
          <Typography variant="mobText4">Base APR</Typography>

          <Box sx={AprWithdrawalChipContainer}>
            <Typography variant="mobText4">{`${formatBps(
              marketItem.apr,
            )}%`}</Typography>
          </Box>
        </Box>

        <Box sx={AprWithdrawalItemContainer}>
          <Typography variant="mobText4">Withdrawal</Typography>

          <Box sx={AprWithdrawalChipContainer}>
            <Typography variant="mobText4">
              {formatSecsToHours(marketItem.withdrawalBatchDuration, true)}
            </Typography>
          </Box>
        </Box>
      </Box>

      {adsComponent && <Box sx={{ marginTop: "-4px" }}>{adsComponent}</Box>}

      <Divider />

      <Box sx={CardFooterContainer}>
        <Typography
          variant="mobText4"
          color={
            marketItem.loan && !marketItem.loan.raw.isZero()
              ? COLORS.blackRock
              : COLORS.manate
          }
        >
          {getDepositLine()} {marketItem.asset} deposited
        </Typography>

        <Box sx={CardFooterButtonsContainer}>
          <Link
            href={`${ROUTES.lender.market}/${marketItem.id}`}
            style={{ textDecoration: "none" }}
          >
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              sx={CardFooterButtonContainer}
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
                  ...CardFooterButtonContainer,
                  height: "100%",
                  display: "flex",
                  gap: "2px",
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
}
