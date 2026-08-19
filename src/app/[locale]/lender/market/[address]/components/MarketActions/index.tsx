import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { DepositStatus, MarketAccount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LenderMlaModal } from "@/app/[locale]/lender/market/[address]/components/MarketActions/LenderMlaModal"
import { TransactionsContainer } from "@/app/[locale]/lender/market/[address]/components/MarketActions/styles"
import { ClaimModal } from "@/app/[locale]/lender/market/[address]/components/Modals/ClaimModal"
import { DepositModal } from "@/app/[locale]/lender/market/[address]/components/Modals/DepositModal"
import { WithdrawModal } from "@/app/[locale]/lender/market/[address]/components/Modals/WithdrawModal"
import { useAddToken } from "@/app/[locale]/lender/market/[address]/hooks/useAddToken"
import TelegramIcon from "@/assets/icons/telegram_icon.svg"
import { PeriodicWithdrawalWindowNotice } from "@/components/PeriodicWithdrawalWindowNotice"
import { toastError } from "@/components/Toasts"
import { TransactionBlock } from "@/components/TransactionBlock"
import { EXTERNAL_LINKS } from "@/constants/external-links"
import { WITHDRAWAL_UNAVAILABLE_KEY } from "@/constants/i18nKeys"
import { useDepositAgreementGate } from "@/hooks/useDepositAgreementGate"
import { useEthersProvider } from "@/hooks/useEthersSigner"
import { useLivePeriodicNowSeconds } from "@/hooks/useLiveNowSeconds"
import { useMarketMla } from "@/hooks/useMarketMla"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { useWrapperAccountState } from "@/hooks/wrapper/useWrapperAccountState"
import { useAppDispatch } from "@/store/hooks"
import {
  LenderMarketSections,
  setSection,
} from "@/store/slices/lenderMarketRoutingSlice/lenderMarketRoutingSlice"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"
import { isPeriodicWithdrawalWindowClosed } from "@/utils/periodicWithdrawalWindow"

import { MarketActionsProps } from "./interface"
import { useFaucet } from "../../hooks/useFaucet"
import { resolveLenderWithdrawalActionState } from "../../utils"

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
  accessState,
  wrapper,
  hasWrapper,
  borrowerPenaltyWarningState,
  refreshBorrowerPenaltyWarning,
}: MarketActionsProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { isTestnet } = useSelectedNetwork()
  const { address } = useAccount()
  const { publicClient } = useEthersProvider({ chainId: market.chainId })
  const { data: wrapperAccountState } = useWrapperAccountState(
    market.chainId,
    wrapper,
    address,
    publicClient,
  )

  const smallestTokenAmountValue = market.underlyingToken.parseAmount("0.00001")
  const wrappedCap =
    hasWrapper && wrapper ? wrapperAccountState?.limits?.maxWithdraw : undefined
  const hasWrappedPosition =
    !!wrappedCap && wrappedCap.gte(smallestTokenAmountValue)
  const wrappedAvailable = hasWrappedPosition ? wrappedCap : undefined
  const combinedAvailable = wrappedAvailable
    ? marketAccount.marketBalance.add(wrappedAvailable)
    : marketAccount.marketBalance

  const { data: mla, isLoading: mlaLoading } = useMarketMla(
    market.address,
    market.chainId,
  )
  const agreementGate = useDepositAgreementGate({
    marketAddress: market.address,
    chainId: market.chainId,
    generation: market.provenance?.generation,
  })

  const { canAddToken, handleAddToken, isAddingToken } = useAddToken(
    market?.marketToken,
  )

  const hideDeposit =
    market.isClosed ||
    marketAccount.maximumDeposit.eq(0) ||
    marketAccount.depositAvailability !== DepositStatus.Ready

  const showFaucet =
    hideDeposit &&
    isTestnet &&
    market.underlyingToken.isMock &&
    marketAccount.underlyingBalance.eq(0)

  // The live tick re-evaluates the recurring schedule so the action becomes
  // available at the window boundary without waiting for a data refetch.
  const nowSec = useLivePeriodicNowSeconds(market)
  const periodicWindowClosed = isPeriodicWithdrawalWindowClosed(market, nowSec)
  const withdrawalActionState = resolveLenderWithdrawalActionState({
    accessState,
    hasMarketAccount: true,
    hasMarketBalance: combinedAvailable.gt(0),
    withdrawalAvailability: marketAccount.withdrawalAvailability,
    periodicWindowClosed,
  })
  const withdrawalUnavailableText =
    withdrawalActionState === "ready"
      ? undefined
      : t(WITHDRAWAL_UNAVAILABLE_KEY[withdrawalActionState])

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
        t("marketDetails.lender.withdrawalsAlert.title.ongoing", {
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
        t("marketDetails.lender.withdrawalsAlert.title.claim", {
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

  const isTooSmallMarketBalance: boolean =
    combinedAvailable.lt(smallestTokenAmountValue) && !combinedAvailable.eq(0)

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
          {t("marketDetails.lender.buttons.addToken")}
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

          {t("modals.shared.help.telegram.botButton")}
        </Button>
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box width="100%" display="flex" flexDirection="column">
        <Box sx={TransactionsContainer}>
          {accessState === "authorized" && (
            <TransactionBlock
              title={t("marketDetails.lender.transactions.deposit.title")}
              tooltip={t("marketDetails.lender.transactions.deposit.tooltip")}
              amount={formatTokenWithCommas(marketAccount.maximumDeposit)}
              asset={market.underlyingToken.symbol}
            >
              {(() => {
                if (showFaucet) {
                  return <FaucetButton marketAccount={marketAccount} />
                }
                if (hideDeposit) return null

                if (agreementGate.state === "loading") {
                  return (
                    <Box sx={DepositStatusContainer}>
                      <Typography variant="text3" color={COLORS.santasGrey}>
                        Loading agreement data...
                      </Typography>
                    </Box>
                  )
                }

                if (agreementGate.state === "error") {
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
                          agreementGate.retry().catch(() => undefined)
                        }}
                      >
                        Retry agreement data
                      </Button>
                    </Box>
                  )
                }

                if (agreementGate.state === "requires-borrower-mla-selection") {
                  return (
                    <Box sx={DepositStatusContainer}>
                      <Typography variant="text3" sx={{ fontWeight: 600 }}>
                        Agreement Selection Required
                      </Typography>
                      <Typography variant="text4" color={COLORS.santasGrey}>
                        The borrower must complete this market&apos;s agreement
                        selection before deposits can begin.
                      </Typography>
                    </Box>
                  )
                }

                if (agreementGate.state === "requires-mla-signature") {
                  return (
                    <Box sx={DepositStatusContainer}>
                      <Typography variant="text3" sx={{ fontWeight: 600 }}>
                        Loan Agreement Signature Required
                      </Typography>
                      <Typography variant="text4" color={COLORS.santasGrey}>
                        Sign the MLA before depositing into this market.
                      </Typography>
                    </Box>
                  )
                }

                return (
                  <DepositModal
                    marketAccount={marketAccount}
                    borrowerPenaltyWarningState={borrowerPenaltyWarningState}
                    refreshBorrowerPenaltyWarning={
                      refreshBorrowerPenaltyWarning
                    }
                  />
                )
              })()}
            </TransactionBlock>
          )}

          <TransactionBlock
            title={t("marketDetails.lender.transactions.withdraw.title")}
            tooltip={t(
              market.periodicHooksConfig
                ? "lenderMarketDetails.transactions.withdraw.periodicTooltip"
                : "lenderMarketDetails.transactions.withdraw.tooltip",
            )}
            amount={
              isTooSmallMarketBalance
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
          >
            {withdrawalActionState === "ready" ? (
              <WithdrawModal
                marketAccount={marketAccount}
                wrapper={wrapper}
                hasWrapper={hasWrapper}
              />
            ) : (
              <Box sx={DepositStatusContainer}>
                <Typography variant="text4" color={COLORS.santasGrey}>
                  {withdrawalUnavailableText}
                </Typography>
              </Box>
            )}
          </TransactionBlock>
        </Box>

        {periodicWindowClosed && !combinedAvailable.raw.isZero() && (
          <PeriodicWithdrawalWindowNotice
            market={market}
            sx={{ marginTop: "12px" }}
          />
        )}
      </Box>

      <Divider sx={{ margin: "32px 0 40px" }} />

      <Box width="100%" display="flex" flexDirection="column">
        <Typography variant="title3">{getWithdrawalsStatus()}</Typography>
        {isClaimableZero && (
          <Typography variant="text3" color={COLORS.santasGrey} marginTop="8px">
            {t("marketDetails.lender.withdrawalsAlert.subtitle")}
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
