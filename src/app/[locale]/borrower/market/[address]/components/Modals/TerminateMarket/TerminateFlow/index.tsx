import React from "react"

import { Box, Dialog, Typography } from "@mui/material"
import { context } from "@opentelemetry/api"
import { useTranslation } from "react-i18next"

import { ErrorModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { logger } from "@/lib/logging/client"
import { COLORS } from "@/theme/colors"

import { TerminateFlowProps } from "./interface"
import {
  TerminateDialogBody,
  TerminateDialogContainer,
  TerminateDialogTypo,
} from "./style"

export const TerminateFlow = ({
  terminateFunc,
  isTerminating,
  isOpen,
  onClose,
  errorPopup,
  successPopup,
  txHash,
  ensureFlowContext,
  endFlow,
}: TerminateFlowProps) => {
  const { t } = useTranslation()
  const handleTerminateMarket = () => {
    const flowContext = ensureFlowContext()
    const runTerminate = () =>
      terminateFunc().catch((err) =>
        logger.error({ err }, "Failed to terminate market"),
      )
    if (flowContext) {
      context.with(flowContext, runTerminate)
    } else {
      runTerminate()
    }
  }

  const showForm = !(isTerminating || successPopup || errorPopup)

  return (
    <Dialog
      open={isOpen}
      onClose={() => {
        endFlow("cancelled")
        onClose()
      }}
      PaperProps={TerminateDialogContainer}
    >
      {showForm && (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={() => {
            endFlow("cancelled")
            onClose()
          }}
          crossOnClick={null}
        />
      )}

      {showForm && (
        <Box sx={TerminateDialogBody}>
          <Box sx={TerminateDialogTypo}>
            <Typography variant="text1" textAlign="center" marginBottom="8px">
              {t("borrowerMarketDetails.modals.terminate.areYouSure")}
            </Typography>
            <Typography
              variant="text2"
              color={COLORS.santasGrey}
              textAlign="center"
            >
              {t("borrowerMarketDetails.modals.terminate.consequences")}
            </Typography>
          </Box>
        </Box>
      )}

      {isTerminating && <LoadingModal txHash={txHash} />}
      {successPopup && !isTerminating && (
        <SuccessModal
          onClose={() => {
            endFlow("success")
            onClose()
          }}
          txHash={txHash}
        />
      )}
      {errorPopup && !isTerminating && (
        <ErrorModal
          onTryAgain={handleTerminateMarket}
          onClose={() => {
            endFlow("error")
            onClose()
          }}
          txHash={txHash}
        />
      )}

      <TxModalFooter
        mainBtnText="Terminate Market"
        mainBtnOnClick={handleTerminateMarket}
        hideButtons={!showForm}
      />
    </Dialog>
  )
}
