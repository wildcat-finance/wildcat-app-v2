import { ChangeEvent, useEffect, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  getCollateralFactoryContract,
  MarketCollateralV1,
  TokenAmount,
} from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { Trans, useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import Alert from "@/assets/icons/circledAlert_icon.svg"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import {
  fetchBebopPMMQuote,
  useGetBebopPMMQuote,
} from "@/hooks/bebop/useGetBebopPMMQuote"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useGetTokenPrices } from "@/hooks/useGetTokenPrices"
import { convertTokenAmount, toMainnetToken } from "@/lib/token-conversion"
import { COLORS } from "@/theme/colors"
import { formatTokenAmount } from "@/utils/formatters"

import { LiquidateModalProps } from "./interface"
import { ModalAlertItem } from "../../../ModalAlertItem"
import { useLiquidateCollateral } from "../../hooks/useLiquidateCollateral"

const useIsLiquidator = (collateral: MarketCollateralV1) => {
  const { address } = useAccount()
  return useQuery({
    queryKey: ["isLiquidator", address],
    enabled: !!address,
    queryFn: async () => {
      if (!address) return false
      const factory = getCollateralFactoryContract(
        collateral.market.chainId,
        collateral.provider,
      )
      const isLiquidator = await factory.isApprovedExecutor(
        address as `0x${string}`,
      )
      return isLiquidator
    },
  })
}

const AUTO_LIQUIDATE_DECIMALS = 5
const AUTO_LIQUIDATE_MAX_ITERATIONS = 6
const AUTO_LIQUIDATE_BUFFER_BPS = 9_990

export const LiquidateCollateralModal = ({
  collateral,
}: LiquidateModalProps) => {
  const { t } = useTranslation()
  const { isTestnet } = useCurrentNetwork()
  const { data: isLiquidator, isLoading: isLoadingLiquidator } =
    useIsLiquidator(collateral)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [liquidateAmount, setLiquidateAmount] = useState("")
  const [isAutoCalculating, setIsAutoCalculating] = useState(false)
  const { data: quote, isLoading: isLoadingQuote } = useGetBebopPMMQuote({
    buyToken: collateral.market.underlyingToken,
    sellTokenAmount:
      liquidateAmount && liquidateAmount !== ""
        ? collateral.collateralAsset.parseAmount(liquidateAmount)
        : undefined,
    takerAddress: collateral.contract.address,
  })
  const { data: tokenPrices, isLoading: isLoadingTokenPrices } =
    useGetTokenPrices([
      collateral.market.underlyingToken,
      collateral.collateralAsset,
    ])
  const {
    mutateAsync: liquidateCollateral,
    isPending,
    isSuccess,
    isError,
  } = useLiquidateCollateral(collateral, setTxHash)

  const getQuoteForAmount = async (sellAmount: TokenAmount) => {
    const usableInput = isTestnet ? toMainnetToken(sellAmount) : sellAmount
    const usableOutput = isTestnet
      ? toMainnetToken(collateral.market.underlyingToken)
      : collateral.market.underlyingToken

    const baseQuote = await fetchBebopPMMQuote({
      buyToken: usableOutput,
      sellTokenAmount: usableInput,
      takerAddress: collateral.contract.address,
    })

    if (!isTestnet) {
      return baseQuote
    }

    return {
      ...baseQuote,
      buyTokenAmount: convertTokenAmount(
        baseQuote.buyTokenAmount,
        collateral.market.underlyingToken,
      ),
      sellTokenAmount: convertTokenAmount(
        baseQuote.sellTokenAmount,
        collateral.collateralAsset,
      ),
    }
  }

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setLiquidateAmount(value)
  }

  const handleClickConfirm = () => {
    if (quote && quote.buyTokenAmount.lte(collateral.maxRepayment)) {
      liquidateCollateral(quote)
    }
  }

  const setLiquidationValue = () => {
    if (!isLiquidator) {
      setLiquidateAmount(
        formatTokenAmount(
          collateral.availableCollateral.raw.toBigInt(),
          collateral.collateralAsset.decimals,
        ),
      )
    } else {
      setLiquidateAmount("")
    }
  }

  const handleOpenModal = () => {
    setLiquidationValue()
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleAutoMaxRepay = async () => {
    if (!isLiquidator || isAutoCalculating) return
    if (
      !collateral.availableCollateral.gt(0) ||
      !collateral.maxRepayment.gt(0)
    ) {
      return
    }

    setIsAutoCalculating(true)
    try {
      const maxCollateral = collateral.availableCollateral
      const maxRepayment = collateral.maxRepayment
      let low = BigNumber.from(0)
      let high = maxCollateral.raw
      let best = BigNumber.from(0)

      const maxQuote = await getQuoteForAmount(maxCollateral)
      if (maxQuote.buyTokenAmount.lte(maxRepayment)) {
        best = maxCollateral.raw
      } else {
        // Binary search for the largest sell amount that stays within max repayment.
        for (let i = 0; i < AUTO_LIQUIDATE_MAX_ITERATIONS; i++) {
          if (high.sub(low).lte(1)) break

          const mid = low.add(high).div(2)
          if (mid.isZero()) break

          const midAmount = collateral.collateralAsset.getAmount(mid)
          const midQuote = await getQuoteForAmount(midAmount)

          if (midQuote.buyTokenAmount.lte(maxRepayment)) {
            best = mid
            low = mid
          } else {
            high = mid
          }
        }
      }

      if (best.isZero()) return

      let finalRaw = best
      if (best.lt(maxCollateral.raw)) {
        finalRaw = best.mul(AUTO_LIQUIDATE_BUFFER_BPS).div(10_000)
        if (finalRaw.isZero()) {
          finalRaw = best
        }
      }

      const finalAmount = collateral.collateralAsset.getAmount(finalRaw)
      setLiquidateAmount(finalAmount.toFixed(AUTO_LIQUIDATE_DECIMALS))
    } catch (error) {
      console.warn("Auto-calc liquidation amount failed", error)
    } finally {
      setIsAutoCalculating(false)
    }
  }

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  const notEmptyOrZeroAmount =
    liquidateAmount && liquidateAmount !== "" && liquidateAmount !== "0"

  const failedInputString = t("collateral.liquidate.price.failedCollateral")

  const isNotSupportedToken = !quote && notEmptyOrZeroAmount && !isLoadingQuote

  const getInputValueString = () => {
    if (tokenPrices && notEmptyOrZeroAmount) {
      if (tokenPrices[collateral.collateralAsset.address]) {
        return `$${+(
          tokenPrices[collateral.collateralAsset.address].usdPrice *
          +liquidateAmount
        ).toFixed(0)}`
      }
      return failedInputString
    }

    return "$0"
  }

  const getBebopValueString = () => {
    if (tokenPrices && quote) {
      if (tokenPrices[quote.buyTokenAmount.token.address]) {
        return `$${+(
          tokenPrices[quote.buyTokenAmount.token.address].usdPrice *
          +quote.buyTokenAmount.format()
        ).toFixed(0)}`
      }
      return t("collateral.liquidate.price.failedOutput")
    }

    return "-"
  }

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="contained"
        size="small"
        sx={{ height: "fit-content", minWidth: "90px" }}
      >
        {!isLoadingLiquidator && !isLiquidator
          ? t("collateral.liquidate.previewButton")
          : t("collateral.liquidate.liquidate")}
      </Button>

      <Dialog
        open={isModalOpen}
        onClose={isPending ? undefined : handleCloseModal}
        sx={{
          "& .MuiDialog-paper": {
            height: "560px",
            width: "500px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        {showForm && (
          <TxModalHeader
            title={t("collateral.liquidate.title")}
            arrowOnClick={handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="12px 24px">
            <Typography variant="text2">
              {t("collateral.liquidate.amount")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: "10px",
                width: "100%",
                flexDirection: "column",
                height: "100%",
                marginTop: "10px",
              }}
            >
              <Box
                sx={{
                  flexDirection: "column",
                  display: "flex",
                }}
              >
                <ModalDataItem
                  title={t("collateral.liquidate.availableCollateral")}
                  value={`${formatTokenAmount(
                    collateral.availableCollateral.raw.toBigInt(),
                    collateral.collateralAsset.decimals,
                  )} ${collateral.collateralAsset.symbol}`}
                  containerSx={{
                    marginBottom: "10px",
                  }}
                />

                <ModalDataItem
                  title={t("collateral.liquidate.price.inputValue")}
                  valueColor={
                    getInputValueString() === failedInputString
                      ? COLORS.dullRed
                      : COLORS.bunker
                  }
                  value={getInputValueString()}
                  isLoading={isLoadingTokenPrices}
                  containerSx={{
                    marginBottom: "14px",
                  }}
                />

                {isLiquidator && (
                  <>
                    <NumberTextField
                      label="0.0"
                      size="medium"
                      style={{ width: "100%" }}
                      max={
                        +collateral.availableCollateral.format(
                          collateral.collateralAsset.decimals,
                        ) || 0
                      }
                      value={liquidateAmount}
                      onChange={handleAmountChange}
                      endAdornment={
                        <TextfieldChip
                          text={collateral.collateralAsset.symbol}
                          size="small"
                        />
                      }
                    />
                    <Box display="flex" justifyContent="flex-end" mt="8px">
                      <Button
                        variant="text"
                        size="small"
                        onClick={handleAutoMaxRepay}
                        disabled={
                          isAutoCalculating ||
                          !collateral.availableCollateral.gt(0)
                        }
                        sx={{ minWidth: "auto", padding: 0 }}
                      >
                        {isAutoCalculating
                          ? t("collateral.liquidate.autoMaxRepayLoading")
                          : t("collateral.liquidate.autoMaxRepay")}
                      </Button>
                    </Box>
                  </>
                )}

                <Typography
                  variant="text3"
                  color={COLORS.santasGrey}
                  align="right"
                  marginTop="22px"
                >
                  {t("collateral.liquidate.price.source")}:{" "}
                  {quote && tokenPrices
                    ? `${
                        tokenPrices[collateral.collateralAsset.address].source
                      }`
                    : "-"}
                </Typography>

                <Divider sx={{ mt: "12px" }} />

                {isNotSupportedToken ? (
                  <Box width="100%" marginTop="12px">
                    <ModalAlertItem
                      bgcolor={COLORS.remy}
                      text={
                        <Typography variant="text3" color={COLORS.dullRed}>
                          This token is not supported.
                        </Typography>
                      }
                      icon={
                        <SvgIcon
                          sx={{
                            fontSize: "16px",
                            "& path": { fill: COLORS.white },
                            "& circle": { fill: COLORS.dullRed },
                            mt: "1px",
                          }}
                        >
                          <Alert />
                        </SvgIcon>
                      }
                    />
                  </Box>
                ) : (
                  <>
                    <Typography
                      variant="text2"
                      marginTop="24px"
                      marginBottom="10px"
                    >
                      {t("collateral.liquidate.bebopQuote.title")}
                    </Typography>

                    <ModalDataItem
                      title={t("collateral.liquidate.bebopQuote.output")}
                      value={
                        quote ? quote.buyTokenAmount.format(18, true) : `-`
                      }
                      isLoading={isLoadingQuote}
                      containerSx={{
                        mb: "10px",
                      }}
                    />

                    <ModalDataItem
                      title={t("collateral.liquidate.price.value")}
                      value={getBebopValueString()}
                      isLoading={isLoadingTokenPrices || isLoadingQuote}
                    />

                    {quote &&
                      quote.buyTokenAmount.gt(collateral.maxRepayment) && (
                        <ModalDataItem
                          title={t("collateral.liquidate.maxRepayment")}
                          value={collateral.maxRepayment.format(
                            collateral.maxRepayment.token.decimals,
                            true,
                          )}
                          isLoading={isLoadingQuote}
                          valueColor={COLORS.dullRed}
                          containerSx={{
                            mt: "10px",
                          }}
                        />
                      )}

                    <Typography
                      variant="text3"
                      color={COLORS.santasGrey}
                      align="right"
                      marginTop="22px"
                    >
                      {t("collateral.liquidate.price.source")}:{" "}
                      {quote && tokenPrices
                        ? `${
                            tokenPrices[collateral.collateralAsset.address]
                              .source
                          }`
                        : "-"}
                    </Typography>
                  </>
                )}

                {!isLiquidator && (
                  <Box
                    width="100%"
                    marginTop={isNotSupportedToken ? "12px" : "24px"}
                  >
                    <ModalAlertItem
                      text={
                        <Typography variant="text3" color={COLORS.santasGrey}>
                          This in not your market to liquidate
                        </Typography>
                      }
                      icon={
                        <SvgIcon
                          sx={{
                            fontSize: "16px",
                            "& path": { fill: COLORS.white },
                            "& circle": { fill: "#FFBB00" },
                            mt: "1px",
                          }}
                        >
                          <Alert />
                        </SvgIcon>
                      }
                    />
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        )}

        {isPending && <LoadingModal txHash={txHash} />}
        {showSuccessPopup && !isPending && (
          <SuccessModal onClose={handleCloseModal} txHash={txHash} />
        )}
        {showErrorPopup && !isPending && (
          <ErrorModal
            onTryAgain={handleClickConfirm}
            onClose={handleCloseModal}
            txHash={txHash}
          />
        )}

        <TxModalFooter
          hideButtons={!showForm || !isLiquidator}
          mainBtnText={t("collateral.liquidate.liquidate")}
          mainBtnOnClick={handleClickConfirm}
          disableMainBtn={
            !isLiquidator ||
            !quote ||
            quote.buyTokenAmount.gt(collateral.maxRepayment) ||
            isAutoCalculating
          }
        />
      </Dialog>
    </>
  )
}
