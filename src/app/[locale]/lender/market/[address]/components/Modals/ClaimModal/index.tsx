import { useEffect, useState } from "react"
import * as React from "react"

import { Button, Dialog } from "@mui/material"
import { Market } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useClaim } from "@/app/[locale]/lender/market/[address]/hooks/useClaim"
import { LenderWithdrawalsForMarketResult } from "@/app/[locale]/lender/market/[address]/hooks/useGetLenderWithdrawals"
import { useEthersSigner } from "@/hooks/useEthersSigner"

export type ClaimModalProps = {
  market: Market
  withdrawals: LenderWithdrawalsForMarketResult
}

export const ClaimModal = ({ market, withdrawals }: ClaimModalProps) => {
  const { t } = useTranslation()

  const [isOpen, setIsOpen] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const signer = useEthersSigner()

  const {
    mutate: claim,
    isPending: isLoading,
    isSuccess,
    isError,
  } = useClaim(market, withdrawals.expiredPendingWithdrawals, setTxHash)

  const handleToggleModal = () => {
    setIsOpen(!isOpen)
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
    setTxHash(undefined)
  }

  const handleClaim = () => {
    claim()
    handleToggleModal()
  }

  const handleTryAgain = () => {
    claim()
    setShowErrorPopup(false)
  }

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
        variant="contained"
        size="small"
        sx={{ width: "fit-content" }}
        onClick={handleClaim}
        disabled={!signer}
      >
        {t("lenderMarketDetails.transactions.claim.button")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleToggleModal}
        sx={{
          "& .MuiDialog-paper": {
            height: "404px",
            width: "440px",
            border: "none",
            borderRadius: "20px",
            margin: 0,
            padding: "24px 0",
          },
        }}
      >
        {isLoading && <LoadingModal txHash={txHash} />}
        {showErrorPopup && (
          <ErrorModal
            onTryAgain={handleTryAgain}
            onClose={handleToggleModal}
            txHash={txHash}
          />
        )}
        {showSuccessPopup && (
          <SuccessModal onClose={handleToggleModal} txHash={txHash} />
        )}
      </Dialog>
    </>
  )
}
