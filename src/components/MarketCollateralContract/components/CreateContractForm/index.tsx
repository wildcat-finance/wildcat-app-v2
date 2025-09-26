import { useEffect, useMemo, useRef, useState } from "react"

import { Box, Button, Dialog, Typography, Link as MuiLink } from "@mui/material"
import { Market, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import { UnderlyingAssetSelect } from "@/app/[locale]/borrower/create-market/components/UnderlyingAssetSelect"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { TokenInfo } from "@/app/api/tokens-list/interface"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { COLORS } from "@/theme/colors"

import { useBebopTokensList } from "./hooks/useBebopTokensList"
import { useCreateCollateralContract } from "../../hooks/useCreateCollateralContract"

export type CreateContractFormType = {
  market: Market
  existingCollateralContracts: MarketCollateralV1[]
}

export const CreateContractForm = ({
  market,
  existingCollateralContracts,
}: CreateContractFormType) => {
  const { t } = useTranslation()
  const { isTestnet } = useCurrentNetwork()
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const [collateralAsset, setCollateralAsset] = useState<string>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { handleChange, handleSelect, query, setQuery, isLoading, tokens } =
    useBebopTokensList()
  const {
    mutateAsync: deployCollateralContract,
    isPending,
    isSuccess,
    isError,
  } = useCreateCollateralContract(market, setTxHash)

  const handleTokenSelect = (asset: TokenInfo | null) => {
    setCollateralAsset((asset ? asset.address : "0x") as `0x${string}`)
  }
  const selectedToken = useMemo(
    () =>
      tokens.find(
        (token) =>
          token.address.toLowerCase() === collateralAsset.toLowerCase(),
      ),
    [tokens, collateralAsset],
  )

  const handleClickConfirm = () => {
    if (!selectedToken) return
    deployCollateralContract(selectedToken)
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

  const excludedTokens = [
    ...existingCollateralContracts.map((c) => c.collateralAsset),
    market.underlyingToken,
  ]

  const excludeTokenSymbols = new Set(
    isTestnet ? excludedTokens.map((token) => token.symbol.toLowerCase()) : [],
  )

  const excludeTokenAddresses = new Set(
    excludedTokens.map((token) => token.address.toLowerCase()),
  )

  const tokenSelectorFormProps = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setCollateralAsset("")
    setQuery("")
  }, [isModalOpen])

  if (existingCollateralContracts.length === 0)
    return (
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Box sx={{ display: "flex", gap: "12px" }}>
          <Box sx={{ width: "300px" }}>
            <UnderlyingAssetSelect
              size="medium"
              handleTokenSelect={handleTokenSelect}
              ref={tokenSelectorFormProps}
              tokens={tokens.filter(
                (token) =>
                  // Exclude tokens that already have collateral contracts or are the market's underlying token
                  !(
                    excludeTokenAddresses.has(token.address.toLowerCase()) ||
                    excludeTokenSymbols.has(token.symbol.toLowerCase())
                  ),
              )}
              isLoading={isLoading}
              setQuery={setQuery}
              query={query}
              handleSelect={handleSelect}
              value={collateralAsset}
              handleChange={handleChange}
            />
          </Box>

          <Button
            variant="contained"
            size="large"
            sx={{ width: "140px" }}
            disabled={!selectedToken || isPending}
            onClick={handleClickConfirm}
          >
            {t("collateral.create.addFirst")}
          </Button>
        </Box>
      </Box>
    )

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        size="small"
        sx={{ paddingY: "8px !important" }}
        onClick={handleOpenModal}
      >
        {t("collateral.create.addNew")}
      </Button>

      <Dialog
        open={isModalOpen}
        onClose={isPending ? undefined : handleCloseModal}
        sx={TxModalDialog}
      >
        {showForm && (
          <TxModalHeader
            title={t("collateral.create.title")}
            divider={false}
            arrowOnClick={handleCloseModal}
            crossOnClick={null}
          >
            <Typography variant="text3" color={COLORS.santasGrey}>
              {t("collateral.create.selectAsset")}
            </Typography>
          </TxModalHeader>
        )}

        {showForm && (
          <Box width="100%" height="100%" padding="0 24px">
            <Box>
              <UnderlyingAssetSelect
                size="medium"
                handleTokenSelect={handleTokenSelect}
                ref={tokenSelectorFormProps}
                tokens={tokens.filter(
                  (token) =>
                    // Exclude tokens that already have collateral contracts or are the market's underlying token
                    !(
                      excludeTokenAddresses.has(token.address.toLowerCase()) ||
                      excludeTokenSymbols.has(token.symbol.toLowerCase())
                    ),
                )}
                isLoading={isLoading}
                setQuery={setQuery}
                query={query}
                handleSelect={handleSelect}
                value={collateralAsset}
                handleChange={handleChange}
              />
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

        {showForm && (
          <TxModalFooter
            mainBtnText={t("collateral.create.button")}
            mainBtnOnClick={handleClickConfirm}
            disableMainBtn={!selectedToken || isPending}
          />
        )}
      </Dialog>
    </>
  )
}
