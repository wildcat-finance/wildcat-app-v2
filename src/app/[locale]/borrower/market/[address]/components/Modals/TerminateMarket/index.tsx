import React, { useEffect, useRef, useState } from "react"

import { Button } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import { context, type Context } from "@opentelemetry/api"
import { useSafeAppsSDK } from "@safe-global/safe-apps-react-sdk"
import { useTranslation } from "react-i18next"

import { TerminateMarketProps } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/interface"
import { TerminateFlow } from "@/app/[locale]/borrower/market/[address]/components/Modals/TerminateMarket/TerminateFlow"
import { useTerminateMarket } from "@/app/[locale]/borrower/market/[address]/hooks/useTerminateMarket"
import Cross from "@/assets/icons/cross_icon.svg"
import { createClientFlowSession } from "@/lib/telemetry/clientFlow"
import {
  routeTermination,
  TerminateModalFlow,
  TerminationBlockDetails,
} from "@/utils/terminationBlockReason"

import { BlockedFlow } from "./BlockedFlow"
import { RepayAndTerminateFlow } from "./RepayAndTerminateFlow"

export const TerminateMarket = ({ marketAccount }: TerminateMarketProps) => {
  const { t } = useTranslation()
  const { market } = marketAccount
  const { connected: isConnectedToSafe } = useSafeAppsSDK()

  const [terminateTxHash, setTerminateTxHash] = useState<string | undefined>("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [showSuccessTerminationPopup, setShowSuccessTerminationPopup] =
    useState(false)
  const [showErrorTerminationPopup, setShowErrorTerminationPopup] =
    useState(false)
  const flowSessionRef = useRef(createClientFlowSession())

  const [flow, setFlow] = useState<TerminateModalFlow>()
  const [blockDetails, setBlockDetails] = useState<TerminationBlockDetails>()

  const terminateFlow = flow === "terminate"
  const repayAndTerminateFlow = flow === "repayAndTerminate"
  const blockedFlow = flow === "blocked"

  const {
    mutateAsync: terminate,
    isPending: isTerminating,
    isSuccess: isTerminated,
    isError: isTerminatedError,
  } = useTerminateMarket(marketAccount, setTerminateTxHash, () =>
    flowSessionRef.current.getParentContext(),
  )

  const ensureFlowContext = () =>
    flowSessionRef.current.startFlowSpan("terminate_market.flow", {
      "market.address": market.address,
      "market.chain_id": market.chainId,
      "safe.connected": isConnectedToSafe,
    })

  const getParentContext = (): Context | null =>
    flowSessionRef.current.getParentContext()

  const endFlow = (outcome: "cancelled" | "error" | "success") => {
    flowSessionRef.current.endFlowSpan(outcome, {
      "flow.outcome": outcome,
    })
  }

  const runTerminate = () => {
    const flowContext = ensureFlowContext()
    if (flowContext) {
      return context.with(flowContext, () => terminate())
    }
    return terminate()
  }

  const handleOpenModal = () => {
    setShowSuccessTerminationPopup(false)
    setShowErrorTerminationPopup(false)
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    endFlow("cancelled")
  }

  // Decided when the modal opens, from the values current at that moment, and
  // then held. Recomputing on every data refresh unmounts
  // RepayAndTerminateFlow as soon as a repay brings outstandingDebt to zero,
  // destroying its step state and both tx hashes mid-flow. (product#538)
  useEffect(() => {
    if (!isModalOpen) return
    const routing = routeTermination({
      status: marketAccount.previewCloseMarket().status,
      outstandingDebtIsZero: market.outstandingDebt.eq(0),
      hooksConfig: market.hooksConfig,
    })
    setFlow(routing.flow)
    setBlockDetails(routing.block)
  }, [isModalOpen])

  useEffect(() => {
    if (isTerminatedError) {
      setShowErrorTerminationPopup(true)
      endFlow("error")
    }
    if (isTerminated) {
      setShowSuccessTerminationPopup(true)
      endFlow("success")
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
          terminateFunc={runTerminate}
          isTerminating={isTerminating}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          successPopup={showSuccessTerminationPopup}
          errorPopup={showErrorTerminationPopup}
          txHash={terminateTxHash}
          ensureFlowContext={ensureFlowContext}
          endFlow={endFlow}
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
          terminateFunc={runTerminate}
          isTerminating={isTerminating}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          successPopup={showSuccessTerminationPopup}
          errorPopup={showErrorTerminationPopup}
          terminateTxHash={terminateTxHash}
          ensureFlowContext={ensureFlowContext}
          getParentContext={getParentContext}
          endFlow={endFlow}
        />
      )}
    </>
  )
}
