import { useEffect, useRef, useState } from "react"

import { Button, Dialog } from "@mui/material"
import { context } from "@opentelemetry/api"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useClaim } from "@/app/[locale]/lender/market/[address]/hooks/useClaim"
import { useEthersSigner } from "@/hooks/useEthersSigner"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { createClientFlowSession } from "@/lib/telemetry/clientFlow"

import { ClaimModalProps } from "./interface"

export const ClaimModal = ({ market, withdrawals }: ClaimModalProps) => {
  const { t } = useTranslation()

  const isMobile = useMobileResolution()

  const [isOpen, setIsOpen] = useState(false)
  const [showSuccessPopup, setShowSuccessPopup] = useState(false)
  const [showErrorPopup, setShowErrorPopup] = useState(false)
  const [txHash, setTxHash] = useState<string | undefined>()
  const flowSessionRef = useRef(createClientFlowSession())
  const signer = useEthersSigner()

  const {
    mutate: claim,
    isPending: isLoading,
    isSuccess,
    isError,
  } = useClaim(market, withdrawals.expiredPendingWithdrawals, setTxHash, () =>
    flowSessionRef.current.getParentContext(),
  )

  const resetModalState = () => {
    setShowErrorPopup(false)
    setShowSuccessPopup(false)
    setTxHash(undefined)
  }

  const closeModal = (
    outcome: "cancelled" | "error" | "success" = "cancelled",
  ) => {
    flowSessionRef.current.endFlowSpan(outcome, {
      "flow.outcome": outcome,
    })
    setIsOpen(false)
    resetModalState()
  }

  const handleClaim = () => {
    const flowContext = flowSessionRef.current.startFlowSpan("claim.flow", {
      "market.address": market.address,
      "market.chain_id": market.chainId,
      "withdrawals.count": withdrawals.expiredPendingWithdrawals.length,
    })
    const runClaim = () => claim()
    if (flowContext) {
      context.with(flowContext, runClaim)
    } else {
      runClaim()
    }
    setIsOpen(true)
    resetModalState()
  }

  const handleTryAgain = () => {
    const flowContext = flowSessionRef.current.getParentContext()
    if (flowContext) {
      context.with(flowContext, () => claim())
    } else {
      claim()
    }
    setShowErrorPopup(false)
  }

  useEffect(() => {
    if (isError) {
      setShowErrorPopup(true)
    }
    if (isSuccess) {
      flowSessionRef.current.endFlowSpan("success", {
        "flow.outcome": "success",
      })
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
          onClose={() => closeModal("cancelled")}
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
              onClose={() => closeModal("error")}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal
              onClose={() => closeModal("success")}
              txHash={txHash}
            />
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
          onClose={() => closeModal("cancelled")}
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
              onClose={() => closeModal("error")}
              txHash={txHash}
            />
          )}
          {showSuccessPopup && (
            <SuccessModal
              onClose={() => closeModal("success")}
              txHash={txHash}
            />
          )}
        </Dialog>
      </>
    )

  return null
}
