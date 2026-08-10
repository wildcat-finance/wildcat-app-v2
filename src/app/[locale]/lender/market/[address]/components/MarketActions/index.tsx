import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import {
  DepositStatus,
  MarketAccount,
  QueueWithdrawalStatus,
} from "@wildcatfi/wildcat-sdk"
import humanizeDuration from "humanize-duration"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { LenderMlaModal } from "@/app/[locale]/lender/market/[address]/components/MarketActions/LenderMlaModal"
import { TransactionsContainer } from "@/app/[locale]/lender/market/[address]/components/MarketActions/styles"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { toastError } from "@/components/Toasts"
import { TransactionBlock } from "@/components/TransactionBlock"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useWrapperLimits } from "@/hooks/wrapper/useWrapperLimits"
import { useAppDispatch } from "@/store/hooks"
import {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketActionsProps } from "./interface"
import { useFaucet } from "../../hooks/useFaucet"

// Compact status content for the deposit block's action slot. The
// TransactionBlock is a fixed-width row whose right slot is sized for a
// ~150px button - oversized status text warps the whole panel.
const DepositStatusContainer = {
  maxWidth: "200px",
  display: "flex",
  flexDirection: "column",
  justifyContent: "center",
  gap: "6px",
}

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
  showBorrowerPenaltyWarning,
  wrapper,
  hasWrapper,
}: MarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { isTestnet } = useSelectedNetwork()
  const { address } = useAccount()

  // Authoritative wrapped ceiling — the same source the withdraw routing uses.
  const { data: wrapperLimits } = useWrapperLimits(
    market.chainId,
    wrapper,
    address,
  )
  const wrappedCap =
    hasWrapper && wrapper ? wrapperLimits?.maxWithdraw : undefined

  // Only count the wrapped position when it is actually withdrawable: dust
  // shares render as "0" and must not produce an "≈ 0 wrapped" breakdown.
  const hasWrappedPosition =
    !!wrappedCap &&
    wrappedCap.gte(market.underlyingToken.parseAmount("0.00001"))

  const wrappedAvailable = hasWrappedPosition ? wrappedCap : undefined

  /** Everything the lender can request, across both positions. */
  const combinedAvailable = wrappedAvailable
    ? marketAccount.marketBalance.add(wrappedAvailable)
    : marketAccount.marketBalance

  const {
    data: mla,
    isLoading: mlaLoading,
    isError: isMlaError,
    refetch: refetchMla,
  } = useMarketMla(market.address, market.chainId)

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const {
    data: signedMla,
    isLoading: signedMlaLoading,
    isError: isSignedMlaError,
    refetch: refetchSignedMla,
  } = useGetSignedMla(mlaResponse)
  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  const hideDeposit =
    market.isClosed ||
    marketAccount.maximumDeposit.raw.isZero() ||
    marketAccount.depositAvailability !== DepositStatus.Ready

  const showFaucet =
    hideDeposit &&
    isTestnet &&
    market.underlyingToken.isMock &&
    marketAccount.underlyingBalance.raw.isZero()

  const ongoingCount = (
    withdrawals.activeWithdrawal ? [withdrawals.activeWithdrawal] : []
  ).flatMap((b) => b.requests).length

  const isClaimableZero = withdrawals.totalClaimableAmount.raw.isZero()

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
    !marketAccount.marketBalance.raw.isZero()

  const humanizeDays = (seconds: number) =>
    humanizeDuration(seconds * 1000, { largest: 1, round: true })

  const depositRows = [
    {
      label: t("lenderMarketDetails.transactions.deposit.rows.walletBalance"),
      value: `${formatTokenWithCommas(marketAccount.underlyingBalance)} ${
        market.underlyingToken.symbol
      }`,
    },
    ...(market.hooksConfig?.minimumDeposit
      ? [
          {
            label: t(
              "lenderMarketDetails.transactions.deposit.rows.minimumDeposit",
            ),
            value: `${formatTokenWithCommas(
              market.hooksConfig.minimumDeposit,
            )} ${market.underlyingToken.symbol}`,
          },
        ]
      : []),
  ]

  const withdrawRows = [
    {
      label: t("lenderMarketDetails.transactions.withdraw.rows.cycle"),
      value: humanizeDays(market.withdrawalBatchDuration),
    },
    {
      label: t("lenderMarketDetails.transactions.withdraw.rows.gracePeriod"),
      value: humanizeDays(market.delinquencyGracePeriod),
    },
  ]

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
        <Box sx={TransactionsContainer}>
          <TransactionBlock
            title={t("lenderMarketDetails.transactions.deposit.title")}
            tooltip={t("lenderMarketDetails.transactions.deposit.tooltip")}
            amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
            asset={market.underlyingToken.symbol}
            subtitle={
              // the breakdown line drives both cards: when there is no wrapped
              // position neither card shows a sub-line, so their dividers align
              hasWrappedPosition
                ? t("lenderMarketDetails.transactions.deposit.subtitle")
                : undefined
            }
            rows={depositRows}
          >
            {(() => {
              if (mlaLoading || signedMlaLoading) {
                return (
                  <Box sx={DepositStatusContainer}>
                    <Typography variant="text3" color={COLORS.santasGrey}>
                      Loading MLA Data...
                    </Typography>
                  </Box>
                )
              }

              if (isMlaError || isSignedMlaError) {
                return (
                  <Box sx={DepositStatusContainer}>
                    <Typography variant="text3" color={COLORS.santasGrey}>
                      Couldn&apos;t load agreement data
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      sx={{ alignSelf: "flex-start" }}
                      onClick={() => {
                        toastError("Couldn't load agreement data — retrying")
                        Promise.all([
                          refetchMla(),
                          ...(mlaResponse ? [refetchSignedMla()] : []),
                        ]).catch(() => undefined)
                      }}
                    >
                      Retry agreement data
                    </Button>
                  </Box>
                )
              }

              if (mlaRequiredAndUnsigned) {
                return (
                  <Box sx={DepositStatusContainer}>
                    <Typography variant="text3" sx={{ fontWeight: 600 }}>
                      Loan Agreement Signature Required
                    </Typography>
                    <Typography variant="text4" color={COLORS.santasGrey}>
                      You need to sign the MLA before you can deposit into this
                      market.
                    </Typography>
                  </Box>
                )
              }

              return (
                <>
                  {!showFaucet && !hideDeposit && (
                    <DepositModal
                      marketAccount={marketAccount}
                      showBorrowerPenaltyWarning={showBorrowerPenaltyWarning}
                    />
                  )}
                  {showFaucet && <FaucetButton marketAccount={marketAccount} />}
                </>
              )
            })()}
          </TransactionBlock>

          <TransactionBlock
            title={t("lenderMarketDetails.transactions.withdraw.title")}
            tooltip={t("lenderMarketDetails.transactions.withdraw.tooltip")}
            amount={
              isTooSmallMarketBalance && !hasWrappedPosition
                ? `< 0.00001`
                : formatTokenWithCommas(combinedAvailable)
            }
            asset={market.underlyingToken.symbol}
            subtitle={
              hasWrappedPosition && wrappedAvailable
                ? t("lenderMarketDetails.transactions.withdraw.split", {
                    direct: formatTokenWithCommas(marketAccount.marketBalance),
                    wrapped: formatTokenWithCommas(wrappedAvailable),
                  })
                : undefined
            }
            rows={withdrawRows}
          >
            {!combinedAvailable.raw.isZero() &&
              marketAccount.withdrawalAvailability ===
                QueueWithdrawalStatus.Ready && (
                <WithdrawModal
                  marketAccount={marketAccount}
                  wrapper={wrapper}
                  hasWrapper={hasWrapper}
                />
              )}
          </TransactionBlock>
        </Box>
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
