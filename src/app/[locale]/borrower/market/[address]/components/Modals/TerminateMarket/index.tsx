import React, { useEffect, useState } from "react"

import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useTranslation } from "react-i18next"

import { TerminateMarketProps } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/interface"
import { TerminateFlow } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/TerminateFlow"
import { useTerminateMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useTerminateMarket"
import Cross from "@/assets/icons/cross_icon.svg"

import { RepayAndTerminateFlow } from "./RepayAndTerminateFlow"

export const TerminateMarket = ({ marketAccount }: TerminateMarketProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount

  const [terminateTxHash, setTerminateTxHash] = useState<string | undefined>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSuccessTerminationPopup, setShowSuccessTerminationPopup] =
    useState(false)
  const [showErrorTerminationPopup, setShowErrorTerminationPopup] =
    useState(false)

  const [flow, setFlow] = useState<
    "terminate" | "repayAndTerminate" | "terminateWithRepay"
  >()

  const terminateFlow = flow === "terminate"
  const repayAndTerminateFlow = flow === "repayAndTerminate"
  // const terminateWithRepay = flow === "terminateWithRepay"

  const {
    mutateAsync: terminate,
    isPending: isTerminating,
    isSuccess: isTerminated,
    isError: isTerminatedError,
  } = useTerminateMarket(marketAccount, setTerminateTxHash)

  const handleOpenModal = () => {
    setShowSuccessTerminationPopup(false)
    setShowErrorTerminationPopup(false)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const isReadyForTermination =
    marketAccount.checkCloseMarketStep().status === "Ready"

  useEffect(() => {
    if (isReadyForTermination) {
      setFlow("terminate")
    } else {
      setFlow("repayAndTerminate")
    }
  }, [isModalOpen])

  useEffect(() => {
    if (isTerminatedError) {
      setShowErrorTerminationPopup(true)
    }
    if (isTerminated) {
      setShowSuccessTerminationPopup(true)
    }
  }, [isTerminatedError, isTerminated])

  return (
    <>
      {!market.isClosed && (
        <Button
          variant="outlined"
          color="secondary"
          sx={{ fontWeight: 500, marginTop: "24px", width: "100%" }}
          onClick={handleOpenModal}
        >
          <SvgIcon fontSize="small" sx={{ marginRight: "4px" }}>
            <Cross />
          </SvgIcon>
          {t("borrowMarketDetails.modals.terminate.terminateMarket")}
        </Button>
      )}

      {terminateFlow && (
        <TerminateFlow
          terminateFunc={terminate}
          isTerminating={isTerminating}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          successPopup={showSuccessTerminationPopup}
          errorPopup={showErrorTerminationPopup}
          txHash={terminateTxHash}
        />
      )}

      {repayAndTerminateFlow && (
        <RepayAndTerminateFlow
          marketAccount={marketAccount}
          terminateFunc={terminate}
          isTerminating={isTerminating}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          successPopup={showSuccessTerminationPopup}
          errorPopup={showErrorTerminationPopup}
          terminateTxHash={terminateTxHash}
        />
      )}
    </>
  )
}
