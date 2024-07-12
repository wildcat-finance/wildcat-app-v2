import React from "react"

import { Box, Dialog, Typography } from "@mui/material"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { TerminateFlowProps } from "./interface"
import {
  TerminateDialogBody,
  TerminateDialogContainer,
  TerminateDialogTypo,
} from "./style"
import { ErrorModal } from "../../FinalModals/ErrorModal"
import { LoadingModal } from "../../FinalModals/LoadingModal"
import { SuccessModal } from "../../FinalModals/SuccessModal"

export const TerminateFlow = ({
  terminateFunc,
  isTerminating,
  isOpen,
  onClose,
  errorPopup,
  successPopup,
  txHash,
}: TerminateFlowProps) => {
  const handleTerminateMarket = () => {
    terminateFunc().catch((err) => console.log(err))
  }

  const showForm = !(isTerminating || successPopup || errorPopup)

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={TerminateDialogContainer}
    >
      {showForm && (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={onClose}
          crossOnClick={null}
        />
      )}

      {showForm && (
        <Box sx={TerminateDialogBody}>
          <Box sx={TerminateDialogTypo}>
            <Typography variant="text1" textAlign="center" marginBottom="8px">
              Are you sure to terminate market?
            </Typography>
            <Typography
              variant="text2"
              color={COLORS.santasGrey}
              textAlign="center"
            >
              Describing of termination consequences e.g. this change is
              irreversible.
            </Typography>
          </Box>
        </Box>
      )}

      {isTerminating && <LoadingModal txHash={txHash} />}
      {successPopup && !isTerminating && (
        <SuccessModal onClose={onClose} txHash={txHash} />
      )}
      {errorPopup && !isTerminating && (
        <ErrorModal
          onTryAgain={handleTerminateMarket}
          onClose={onClose}
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
