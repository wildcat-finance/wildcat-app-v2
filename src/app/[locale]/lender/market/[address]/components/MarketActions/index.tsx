import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import {
  DepositStatus,
  MarketAccount,
  QueueWithdrawalStatus,
} from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { LenderMlaModal } from "@/app/[locale]/lender/components/LenderMlaModal"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { TransactionsContainer } from "@/app/[locale]/lender/market/[address]/components/MarketActions/styles"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { TransactionBlock } from "@/components/TransactionBlock"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useAppDispatch } from "@/store/hooks"
import {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketActionsProps } from "./interface"
import { useFaucet } from "../../hooks/useFaucet"

const FaucetButton = ({ marketAccount }: { marketAccount: MarketAccount }) => {
  const {
    mutate: faucet,
    isPending: isFauceting,
    isSuccess,
  } = useFaucet(marketAccount)

  if (isSuccess) return null

  return (
    <Button
      disabled={isFauceting}
      variant="contained"
      size="large"
      sx={{ width: "152px" }}
      onClick={() => faucet()}
    >
      {isFauceting ? "Requesting Tokens..." : "Faucet"}
    </Button>
  )
}

export const MarketActions = ({
  marketAccount,
  withdrawals,
}: MarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { isTestnet } = useSelectedNetwork()

  const { data: mla, isLoading: mlaLoading } = useMarketMla(market.address)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const { data: signedMla, isLoading: signedMlaLoading } =
    useGetSignedMla(mlaResponse)
  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  const hideDeposit =
    market.isClosed ||
    marketAccount.maximumDeposit.eq(0) ||
    marketAccount.depositAvailability !== DepositStatus.Ready

  const showFaucet =
    hideDeposit &&
    isTestnet &&
    market.underlyingToken.isMock &&
    marketAccount.underlyingBalance.eq(0)

  const hideWithdraw =
    marketAccount.marketBalance.eq(0) ||
    marketAccount.withdrawalAvailability !== QueueWithdrawalStatus.Ready

  const ongoingCount = (
    withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []
  ).flatMap((b) => b.requests).length

  const isClaimableZero = withdrawals.totalClaimableAmount.eq(0)

  const isOngoingWDsZero = ongoingCount === 0

  const outstandingCount = (
    withdrawals?.expiredPendingWithdrawals ?? []
  ).flatMap((b) =>
    b.requests.filter((wd) => wd.getNormalizedAmountOwed(b.batch).gt(0)),
  ).length

  const isOutstandingZero = outstandingCount === 0

  const dispatch = useAppDispatch()
  const handleChangeSection = () => {
    dispatch(setSection(LenderMarketSections.REQUESTS))
  }

  const getWithdrawalsStatus = () => {
    const parts: string[] = []

    if (!isOngoingWDsZero) {
      parts.push(
        t("lenderMarketDetails.transactions.withdrawalsAlert.title.ongoing", {
          count: ongoingCount,
        }),
      )
    }

    if (!isOutstandingZero) {
      parts.push(
        t(
          "lenderMarketDetails.transactions.withdrawalsAlert.title.outstanding",
          {
            count: outstandingCount,
          },
        ),
      )
    }

    if (!isClaimableZero) {
      parts.push(
        t("lenderMarketDetails.transactions.withdrawalsAlert.title.claim", {
          claimableAmount: `${formatTokenWithCommas(
            withdrawals.totalClaimableAmount,
          )} ${market.underlyingToken.symbol}`,
        }),
      )
    }

    if (parts.length === 0) {
      return t(
        "lenderMarketDetails.transactions.withdrawalsAlert.title.noClaim",
        {
          claim: "nothing",
        },
      )
    }

    return parts.join(" · ")
  }

  const smallestTokenAmountValue = market.underlyingToken.parseAmount(
    "0.00001".replace(/,/g, ""),
  )

  const isTooSmallMarketBalance: boolean =
    marketAccount.marketBalance.lt(smallestTokenAmountValue) &&
    !marketAccount.marketBalance.eq(0)

  return (
    <>
      <Box display="flex" columnGap="6px" flexWrap="wrap" rowGap="6px">
        <Button
          variant="outlined"
          color="secondary"
          size="small"
          sx={{ height: "28px" }}
          onClick={() => handleAddToken()}
          disabled={isAddingToken && canAddToken}
        >
          {t("lenderMarketDetails.buttons.addToken")}
        </Button>

        <LenderMlaModal mla={mla} isLoading={mlaLoading} />

        <Button
          component={Link}
          variant="outlined"
          color="secondary"
          size="small"
          href={EXTERNAL_LINKS.TELEGRAM_BOT}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            height: "28px",
            padding: "6px 12px 6px 6px !important",
            gap: "2px",
            border: `1px solid ${COLORS.hawkesBlue}`,
            color: COLORS.ultramarineBlue,
            textDecoration: "none",
            "&:hover": {
              bgcolor: "rgba(62,104,255,0.06)",
              border: `1px solid ${COLORS.hawkesBlue}`,
            },
          }}
        >
          <SvgIcon
            aria-hidden="true"
            sx={{
              fontSize: "20px",
              flexShrink: 0,
              "& path": { fill: COLORS.ultramarineBlue },
            }}
          >
            <TelegramIcon />
          </SvgIcon>

          {t("helpModal.items.telegram.botButton")}
        </Button>
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box width="100%" display="flex" flexDirection="column">
        {(() => {
          if (mlaLoading || signedMlaLoading) {
            return <Typography variant="title3">Loading MLA Data...</Typography>
          }

          if (mlaRequiredAndUnsigned) {
            return (
              <>
                <Typography variant="title3" sx={{ marginBottom: "8px" }}>
                  Loan Agreement Signature Required
                </Typography>
                <Typography
                  variant="text3"
                  sx={{ marginBottom: isClaimableZero ? "0" : "24px" }}
                  color={COLORS.santasGrey}
                >
                  You need to sign the MLA before you can access this market.
                </Typography>
              </>
            )
          }

          return (
            <Box sx={TransactionsContainer}>
              <TransactionBlock
                title={t("lenderMarketDetails.transactions.deposit.title")}
                tooltip={t("lenderMarketDetails.transactions.deposit.tooltip")}
                amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
                asset={market.underlyingToken.symbol}
              >
                {!showFaucet && <DepositModal marketAccount={marketAccount} />}
                {showFaucet && <FaucetButton marketAccount={marketAccount} />}
              </TransactionBlock>

              <TransactionBlock
                title={t("lenderMarketDetails.transactions.withdraw.title")}
                tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
                amount={
                  isTooSmallMarketBalance
                    ? `< 0.00001`
                    : formatTokenWithCommas(marketAccount.marketBalance)
                }
                asset={market.underlyingToken.symbol}
              >
                {!hideWithdraw && (
                  <WithdrawModal marketAccount={marketAccount} />
                )}
              </TransactionBlock>
            </Box>
          )
        })()}
      </Box>

      <Divider sx={{ margin: "32px 0 40px" }} />

      <Box width="100%" display="flex" flexDirection="column">
        <Typography variant="title3">{getWithdrawalsStatus()}</Typography>
        {isClaimableZero && (
          <Typography variant="text3" color={COLORS.santasGrey} marginTop="8px">
            {t("lenderMarketDetails.transactions.withdrawalsAlert.subtitle")}
          </Typography>
        )}

        {(!isOngoingWDsZero || !isClaimableZero) && (
          <Box
            sx={{
              height: "27.95px",
              display: "flex",
              gap: "6px",
              marginTop: "24px",
            }}
          >
            {!isOngoingWDsZero && (
              <Button
                variant="contained"
                color="secondary"
                size="small"
                sx={{ width: "fit-content" }}
                onClick={handleChangeSection}
              >
                {t(
                  "lenderMarketDetails.transactions.withdrawalsAlert.buttons.withdrawals",
                )}
              </Button>
            )}

            {!isClaimableZero && (
              <ClaimModal market={market} withdrawals={withdrawals} />
            )}
          </Box>
        )}
      </Box>

      <Divider sx={{ margin: "40px 0 32px" }} />
    </>
  )
}
