import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { HooksKind, TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { BorrowerProfileChip } from "@/components/BorrowerProfileChip"
import { COLORS } from "@/theme/colors"
import {
  buildBorrowerProfileHref,
  buildMarketHref,
  formatBps,
  formatSecsToHours,
  formatTokenWithCommas,
} from "@/utils/formatters"
import { getMarketStatusChip, MarketStatus } from "@/utils/marketStatus"
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

export type MobileMarketItem = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  apr: number
  withdrawalBatchDuration: number
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  capacity?: TokenAmount
  capacityLeft?: TokenAmount
  borrower: string | undefined
  borrowerAddress: string | undefined
  loan?: TokenAmount | undefined
  asset: string
  isSelfOnboard?: boolean
  chainId?: number
  debt?: TokenAmount
  utilisation?: number
}

export type MobileMarketCardVariant = "lender-action" | "borrower-context"

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

const tokenToNumber = (amount?: TokenAmount): number => {
  if (!amount) return 0
  return parseFloat(amount.format(amount.decimals))
}

const formatCompact = (value: number): string => {
  if (value === 0) return "0"
  const abs = Math.abs(value)
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`
  if (abs >= 10_000) return `${(value / 1_000).toFixed(1)}K`
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`
  if (abs >= 1) return value.toFixed(2)
  if (abs < 0.0001) return "<0.0001"
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "")
}

const formatLoan = (amount?: TokenAmount) => {
  if (!amount || amount.raw.isZero()) return "0"
  const formatted = Number(formatTokenWithCommas(amount, { fractionDigits: 2 }))
  if (formatted < 0.00001) return "< 0.00001"
  return formatTokenWithCommas(amount, { fractionDigits: 2 })
}

const utilisationFill = (pct: number) => {
  if (pct <= 0) return { fill: COLORS.iron, label: COLORS.santasGrey }
  if (pct > 100) return { fill: COLORS.dullRed, label: COLORS.dullRed }
  if (pct >= 80) return { fill: COLORS.galliano, label: COLORS.butteredRum }
  return { fill: COLORS.ultramarineBlue, label: COLORS.ultramarineBlue }
}

const UtilisationBar = ({
  utilisation,
  capacity,
  asset,
}: {
  utilisation: number
  capacity?: TokenAmount
  asset: string
}) => {
  const clamped = Math.max(0, Math.min(100, utilisation))
  const colors = utilisationFill(utilisation)
  const capValue = tokenToNumber(capacity)
  const capLabel =
    capValue > 0 ? `${formatCompact(capValue)} ${asset} Cap` : "No cap set"
  const pctLabel = `${utilisation.toFixed(
    utilisation >= 10 || utilisation === 0 ? 0 : 1,
  )}% utilisation`

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      <Box
        sx={{
          width: "100%",
          height: "4px",
          borderRadius: "2px",
          backgroundColor: COLORS.athensGrey,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <Box
          sx={{
            width: `${clamped}%`,
            height: "100%",
            backgroundColor: colors.fill,
            borderRadius: "2px",
            transition: "width 0.2s ease",
          }}
        />
      </Box>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Typography variant="mobText4" color={COLORS.santasGrey}>
          {capLabel}
        </Typography>
        <Typography
          variant="mobText4"
          sx={{ color: colors.label, fontWeight: utilisation > 0 ? 600 : 400 }}
        >
          {pctLabel}
        </Typography>
      </Box>
    </Box>
  )
}

const StatusAndTermRow = ({
  marketItem,
  variant,
}: {
  marketItem: MobileMarketItem
  variant: MobileMarketCardVariant
}) => {
  const isHealthy = marketItem.status.status === MarketStatus.HEALTHY
  const isOpenTerm = marketItem.term.kind === HooksKind.OpenTerm

  if (variant === "borrower-context") {
    const showStatus = !isHealthy || marketItem.status.healthyPeriod
    const showTerm = !isOpenTerm
    if (!showStatus && !showTerm) return null
    return (
      <Box sx={StatusAndTermContainer}>
        {showStatus ? (
          <MarketStatusChip status={marketItem.status} withPeriod />
        ) : (
          <Box />
        )}
        {showTerm && (
          <MarketTypeChip type="table" {...marketItem.term} isMobile />
        )}
      </Box>
    )
  }

  return (
    <Box sx={StatusAndTermContainer}>
      <MarketStatusChip status={marketItem.status} withPeriod={false} />
      <MarketTypeChip type="table" {...marketItem.term} isMobile />
    </Box>
  )
}

export const MobileMarketCard = ({
  marketItem,
  buttonText,
  buttonIcon,
  showBorrower = true,
  adsComponent,
  variant = "lender-action",
  displayName,
}: {
  marketItem: MobileMarketItem
  buttonText?: string
  buttonIcon?: boolean
  showBorrower?: boolean
  adsComponent?: React.ReactNode
  variant?: MobileMarketCardVariant
  displayName?: string
}) => {
  const isBorrowerContext = variant === "borrower-context"
  const renderedName = displayName ?? marketItem.name
  const utilisation = marketItem.utilisation ?? 0
  const debtValue = tokenToNumber(marketItem.debt)

  const cardBody = (
    <Box sx={CardContainer}>
      <StatusAndTermRow marketItem={marketItem} variant={variant} />

      <Box sx={MainInfoContainer}>
        <Box sx={{ ...MainInfoColumnContainer, minWidth: 0 }}>
          <Typography
            variant="mobText2"
            sx={
              isBorrowerContext
                ? {
                    display: "block",
                    width: "100%",
                    overflow: "hidden",
                    whiteSpace: "nowrap",
                    textOverflow: "ellipsis",
                    fontWeight: 600,
                  }
                : undefined
            }
          >
            {renderedName}
          </Typography>

          {showBorrower && marketItem.borrowerAddress && (
            <Link
              href={buildBorrowerProfileHref(
                marketItem.borrowerAddress,
                marketItem.chainId,
              )}
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
            width: "fit-content",
            flexShrink: 0,
          }}
        >
          {isBorrowerContext ? (
            <>
              <Typography
                variant="mobText2"
                sx={{
                  fontWeight: 700,
                  color: debtValue > 0 ? COLORS.blackRock : COLORS.santasGrey,
                }}
              >
                {formatCompact(debtValue)} {marketItem.asset}
              </Typography>
              <Typography variant="mobText4" color={COLORS.santasGrey}>
                Debt
              </Typography>
            </>
          ) : (
            <>
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
                Available to lend
              </Typography>
            </>
          )}
        </Box>
      </Box>

      {isBorrowerContext && (
        <UtilisationBar
          utilisation={utilisation}
          capacity={marketItem.capacity}
          asset={marketItem.asset}
        />
      )}

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

      {!isBorrowerContext && (
        <>
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
              {formatLoan(marketItem.loan)} {marketItem.asset} deposited
            </Typography>

            <Box sx={CardFooterButtonsContainer}>
              <Link
                href={buildMarketHref(marketItem.id, marketItem.chainId)}
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
                  href={buildMarketHref(marketItem.id, marketItem.chainId)}
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
        </>
      )}
    </Box>
  )

  if (isBorrowerContext) {
    return (
      <Link
        href={buildMarketHref(marketItem.id, marketItem.chainId)}
        style={{
          textDecoration: "none",
          color: "inherit",
          display: "block",
        }}
      >
        {cardBody}
      </Link>
    )
  }

  return cardBody
}
