import { useEffect, useState } from "react"

import { Box, Button, Dialog } from "@mui/material"
import { Market, MarketCollateralV1 } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ModalDataItem } from "@/app/[locale]/borrower/market/[address]/components/Modals/components/ModalDataItem"
import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { TxModalDialog } from "@/app/[locale]/borrower/market/[address]/components/Modals/style"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { CollateralDepositor } from "@/hooks/useGetCollateralContracts"

import { useReclaimCollateral } from "../../hooks/useReclaimCollateral"

export type ReclaimModalProps = {
  market: Market
  collateralContract: MarketCollateralV1
  depositor: CollateralDepositor
}

export const ReclaimModalContract = ({
  market,
  collateralContract,
  depositor,
}: ReclaimModalProps) => {
  const { t } = useTranslation()
  const signer = useEthersSigner()
  const [txHash, setTxHash] = useState<string | undefined>("")
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const { collateralAsset } = collateralContract
  const {
    mutate: reclaimCollateral,
    isPending,
    isError,
    isSuccess,
  } = useReclaimCollateral(collateralContract, setTxHash)

  useEffect(() => {
    if (signer && collateralContract.provider !== signer) {
      collateralContract.provider = signer
    }
    if (signer && collateralAsset.provider !== signer) {
      collateralAsset.provider = signer
    }
  }, [signer, collateralContract, collateralAsset])

  const showForm = !(isPending || showSuccessPopup || showErrorPopup)

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      setShowSuccessPopup(true)
    }
  }, [isError, isSuccess])

  const handleConfirm = () => {
    setTxHash("")
    reclaimCollateral()
  }

  const handleTryAgain = () => {
    handleConfirm()
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
  }

  const handleOpenModal = () => {
    setShowSuccessPopup(false)
    setShowErrorPopup(false)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  return (
    <>
      <Button
        variant="contained"
        size="small"
        onClick={handleOpenModal}
        sx={{ height: "fit-content", width: "90px" }}
      >
        {t("collateral.reclaim.button")}
      </Button>

      <Dialog
        open={isModalOpen}
        onClose={isPending ? undefined : handleCloseModal}
        sx={{
          "& .MuiDialog-paper": {
            height: "404px",
            minWidth: "440px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        {showForm && (
          <TxModalHeader
            title={t("collateral.reclaim.title", {
              marketName: market.name,
            })}
            arrowOnClick={handleCloseModal}
            crossOnClick={null}
          />
        )}

        {showForm && (
          <Box sx={{ width: "100%", height: "100%", padding: "12px 24px" }}>
            <ModalDataItem
              title={t("collateral.reclaim.shares")}
              value={collateralAsset
                .getAmount(depositor.shares)
                .format(collateralAsset.decimals, true)}
              containerSx={{
                marginBottom: "10px",
              }}
            />
            <ModalDataItem
              title={t("collateral.reclaim.sharesValue")}
              value={depositor.sharesValue.format(
                collateralAsset.decimals,
                true,
              )}
            />
          </Box>
        )}

        {isPending && <LoadingModal txHash={txHash} />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={handleCloseModal}
            txHash={txHash}
          />
        )}
        {showSuccessPopup && (
          <SuccessModal onClose={handleCloseModal} txHash={txHash} />
        )}

        <TxModalFooter
          mainBtnText={t("collateral.reclaim.button")}
          mainBtnOnClick={handleConfirm}
          disableMainBtn={
            !market.isClosed || isPending || depositor.sharesValue.eq(0)
          }
          hideButtons={!showForm}
        />
      </Dialog>
    </>
  )
}
