import React, { useEffect, useState } from "react"

import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { useTranslation } from "react-i18next"

import { TerminateMarketProps } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/interface"
import { TerminateFlow } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/TerminateFlow"
import { useTerminateMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useTerminateMarket"
import Cross from "@/assets/icons/cross_icon.svg"
import {
  routeTermination,
  TerminateModalFlow,
} from "@/utils/terminationBlockReason"

import { BlockedFlow } from "./BlockedFlow"
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

  const [transactionFlow, setTransactionFlow] =
    useState<Exclude<TerminateModalFlow, "blocked">>()
  const routing = routeTermination({
    status: marketAccount.previewCloseMarket().status,
    outstandingDebtIsZero: market.outstandingDebt.eq(0),
    hooksConfig: market.hooksConfig,
  })
  const flow = transactionFlow ?? routing.flow
  const blockDetails = routing.block

  const terminateFlow = flow === "terminate"
  const repayAndTerminateFlow = flow === "repayAndTerminate"
  const blockedFlow = flow === "blocked"

  const {
    mutateAsync: terminate,
    isPending: isTerminating,
    isSuccess: isTerminated,
    isError: isTerminatedError,
  } = useTerminateMarket(marketAccount, setTerminateTxHash)

  const handleOpenModal = () => {
    setShowSuccessTerminationPopup(false)
    setShowErrorTerminationPopup(false)
    setTransactionFlow(undefined)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  // Keep blocked reasons current until the borrower can proceed. Once a
  // transaction flow opens, preserve its step state and hashes through data
  // refreshes, including a repayment bringing outstanding debt to zero.
  useEffect(() => {
    if (
      isModalOpen &&
      transactionFlow === undefined &&
      routing.flow !== "blocked"
    ) {
      setTransactionFlow(routing.flow)
    }
  }, [isModalOpen, transactionFlow, routing.flow])

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
          {t("borrowerMarketDetails.modals.terminate.terminateMarket")}
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

      {blockedFlow && blockDetails && (
        <BlockedFlow
          block={blockDetails}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
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
