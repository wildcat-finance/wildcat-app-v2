import { ChangeEvent, useEffect, useState } from "react"

import { Box, Button, Dialog, Divider, Typography } from "@mui/material"
import { useQuery } from "@tanstack/react-query"
import {
  getCollateralFactoryContract,
  MarketCollateralV1,
} from "@wildcatfi/wildcat-sdk"
import { Trans, useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { NumberTextField } from "@/components/NumberTextfield"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useGetBebopPMMQuote } from "@/hooks/bebop/useGetBebopPMMQuote"
import { useGetTokenPrices } from "@/hooks/useGetTokenPrices"
import { COLORS } from "@/theme/colors"
import { formatTokenAmount } from "@/utils/formatters"

import { LiquidateModalProps } from "./interface"
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

export const LiquidateCollateralModal = ({
  collateral,
}: LiquidateModalProps) => {
  const { t } = useTranslation()
  const { data: isLiquidator, isLoading: isLoadingLiquidator } =
    useIsLiquidator(collateral)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [liquidateAmount, setLiquidateAmount] = useState("")
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

  const handleAmountChange = (evt: ChangeEvent<HTMLInputElement>) => {
    const { value } = evt.target
    setLiquidateAmount(value)
  }

  const handleClickConfirm = () => {
    if (quote && quote.buyTokenAmount.lte(collateral.maxRepayment)) {
      liquidateCollateral(quote)
    }
  }
  const handleOpenModal = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
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

  return (
    <>
      <Button
        onClick={handleOpenModal}
        variant="contained"
        size="small"
        sx={{ height: "fit-content", width: "90px" }}
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
            ...TxModalDialog["& .MuiDialog-paper"],
            ...(quote ? { height: "600px" } : {}),
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

        {showForm && (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              paddingLeft: "16px",
              paddingRight: "16px",
            }}
          >
            <Typography variant="title2" marginBottom="4px">
              {t("collateral.liquidate.amount")}
            </Typography>

            <Box
              sx={{
                display: "flex",
                gap: "10px",
                width: "100%",
                flexDirection: "column",
                height: "100%",
              }}
            >
              <Box
                sx={{
                  width: "300px",
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
                    marginBottom: "14px",
                  }}
                />

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
                {isLoadingTokenPrices && (
                  <Typography variant="text1" marginBottom="4px">
                    {t("collateral.liquidate.price.loading")}
                  </Typography>
                )}
                {tokenPrices &&
                  liquidateAmount &&
                  liquidateAmount !== "" &&
                  liquidateAmount !== "0" &&
                  (tokenPrices[collateral.collateralAsset.address] ? (
                    <>
                      <Typography variant="text1" marginBottom="4px">
                        {t("collateral.liquidate.price.inputValue")}
                        {": "}
                        {`$${+(
                          tokenPrices[collateral.collateralAsset.address]
                            .usdPrice * +liquidateAmount
                        ).toFixed(0)}`}
                      </Typography>
                      <Typography variant="text2" marginBottom="4px">
                        {t("collateral.liquidate.price.source")}
                        {": "}
                        {tokenPrices[collateral.collateralAsset.address].source}
                      </Typography>
                    </>
                  ) : (
                    <Typography variant="text1" marginBottom="4px">
                      {t("collateral.liquidate.price.failedCollateral")}
                    </Typography>
                  ))}
              </Box>

              {(quote || isLoadingQuote) && (
                <Divider sx={{ margin: "16px 0" }} />
              )}
              {/* Display the quote */}
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                  flexDirection: "column",
                }}
              >
                {isLoadingQuote && (
                  <Typography variant="text1" marginBottom="4px">
                    {t("collateral.liquidate.bebopQuote.fetching")}
                  </Typography>
                )}
                {quote && (
                  <>
                    <Typography variant="title2" marginBottom="4px">
                      {t("collateral.liquidate.bebopQuote.title")}
                    </Typography>
                    <Typography variant="text1" marginBottom="4px">
                      {t("collateral.liquidate.bebopQuote.output")}:{" "}
                      {quote.buyTokenAmount.format(18, true)}
                    </Typography>
                    {isLoadingTokenPrices && (
                      <Typography variant="text1" marginBottom="4px">
                        {t("collateral.liquidate.price.loading")}
                      </Typography>
                    )}
                    {tokenPrices &&
                      (tokenPrices[quote.buyTokenAmount.token.address] ? (
                        <>
                          <Typography variant="text1" marginBottom="4px">
                            {t("collateral.liquidate.price.value")}:{" "}
                            {`$${+(
                              tokenPrices[quote.buyTokenAmount.token.address]
                                .usdPrice * +quote.buyTokenAmount.format()
                            ).toFixed(0)}`}
                          </Typography>
                          <Typography variant="text2" marginBottom="4px">
                            {t("collateral.liquidate.price.source")}:{" "}
                            {
                              tokenPrices[quote.buyTokenAmount.token.address]
                                .source
                            }
                          </Typography>
                        </>
                      ) : (
                        <Typography variant="text1" marginBottom="4px">
                          {t("collateral.liquidate.price.failedOutput")}
                        </Typography>
                      ))}
                  </>
                )}
                {quote && quote.buyTokenAmount.gt(collateral.maxRepayment) && (
                  <Typography
                    variant="title3"
                    marginBottom="4px"
                    color={COLORS.dullRed}
                  >
                    {t("collateral.liquidate.maxRepayment")}{" "}
                    {collateral.maxRepayment.format(
                      collateral.maxRepayment.token.decimals,
                      true,
                    )}
                  </Typography>
                )}
              </Box>

              {quote && (
                <>
                  <Divider sx={{ margin: "16px 0" }} />

                  {isLoadingLiquidator && (
                    <Typography variant="text1" marginBottom="4px">
                      {t("collateral.liquidate.checkingLiquidator")}
                    </Typography>
                  )}
                  {/* Only allow liquidation if the user is a liquidator */}
                  {!isLoadingLiquidator && !isLiquidator && (
                    <Typography variant="text1" marginBottom="4px">
                      <Trans i18nKey="collateral.liquidate.notLiquidator" />
                    </Typography>
                  )}
                  {isLiquidator && (
                    <Button
                      variant="contained"
                      size="large"
                      sx={{ width: "140px" }}
                      disabled={
                        !quote ||
                        quote.buyTokenAmount.gt(collateral.maxRepayment)
                      }
                      onClick={handleClickConfirm}
                    >
                      {t("collateral.liquidate.liquidate")}
                    </Button>
                  )}
                </>
              )}
            </Box>
          </Box>
        )}
      </Dialog>
    </>
  )
}
