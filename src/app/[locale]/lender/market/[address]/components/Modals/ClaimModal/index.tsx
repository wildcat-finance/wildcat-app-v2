import { useEffect, useState } from "react"
import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useClaim } from "@/app/[locale]/lender/market/[address]/hooks/useClaim"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useMobileResolution } from "@/hooks/useMobileResolution"

import { ClaimModalProps } from "./interface"

export const ClaimModal = ({ market, withdrawals }: ClaimModalProps) => {
  const { t } = useTranslation()

  const isMobile = useMobileResolution()

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

  if (isMobile)
    return (
      <>
        <Button
          onClick={handleClaim}
          variant="contained"
          color="secondary"
          size="large"
          fullWidth
          disabled={withdrawals.totalClaimableAmount.raw.isZero() || !signer}
          sx={{ padding: "10px 20px", width: "fit-content" }}
        >
          {t("lenderMarketDetails.transactions.withdrawalsAlert.buttons.claim")}
        </Button>

        <Dialog
          open={isLoading || showErrorPopup || showSuccessPopup}
          onClose={handleToggleModal}
          sx={{
            backdropFilter: "blur(10px)",

            "& .MuiDialog-paper": {
              height: "353px",
              width: "100%",
              border: "none",
              borderRadius: "20px",
              padding: "24px 0",
              margin: "auto 0 4px",
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

  if (!isMobile)
    return (
      <>
        <Button
          variant="contained"
          size="small"
          sx={{ width: "fit-content" }}
          onClick={handleClaim}
          disabled={!signer}
        >
          {t("lenderMarketDetails.transactions.withdrawalsAlert.buttons.claim")}
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

  return null
}
