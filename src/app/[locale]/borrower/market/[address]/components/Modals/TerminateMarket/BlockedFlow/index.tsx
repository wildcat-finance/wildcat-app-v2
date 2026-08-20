import React from "react"

import { Box, Dialog, Typography } from "@mui/material"
import { CloseMarketStatus } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { formatDate } from "@/lib/mla"
import { COLORS } from "@/theme/colors"
import { TerminationBlockDetails } from "@/utils/terminationBlockReason"

import {
  TerminateDialogBody,
  TerminateDialogContainer,
  TerminateDialogTypo,
} from "../TerminateFlow/style"

/// Shown when termination is unavailable and repaying would not help
/// (product#538): the market is inside its fixed term with early closure
/// off, or the connected wallet is not the borrower. States the real
/// reason instead of the repay flow's debt table.
export const BlockedFlow = ({
  block,
  isOpen,
  onClose,
}: {
  block: TerminationBlockDetails
  isOpen: boolean
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const isNotBorrower = block.status === CloseMarketStatus.NotBorrower
  const maturity = formatDate(block.fixedTermEndTime)

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      PaperProps={TerminateDialogContainer}
    >
      <TxModalHeader
        title={t("borrowerMarketDetails.modals.terminate.terminateMarket")}
        arrowOnClick={onClose}
        crossOnClick={null}
      />
      <Box sx={TerminateDialogBody}>
        <Box sx={TerminateDialogTypo}>
          <Typography variant="text1" textAlign="center" marginBottom="8px">
            {t("borrowerMarketDetails.modals.terminate.earlyClosure.title")}
          </Typography>
          <Typography
            variant="text2"
            color={COLORS.santasGrey}
            textAlign="center"
          >
            {isNotBorrower
              ? t(
                  "borrowerMarketDetails.modals.terminate.earlyClosure.notBorrower",
                )
              : t(
                  "borrowerMarketDetails.modals.terminate.earlyClosure.message",
                )}
          </Typography>
          {!isNotBorrower && maturity && (
            <Typography
              variant="text2"
              textAlign="center"
              marginTop="12px"
              color={COLORS.santasGrey}
            >
              {t(
                "borrowerMarketDetails.modals.terminate.earlyClosure.maturity",
                { date: maturity },
              )}
            </Typography>
          )}
          {!isNotBorrower && block.allowTermReduction && (
            <Typography
              variant="text2"
              textAlign="center"
              marginTop="12px"
              color={COLORS.santasGrey}
            >
              {t(
                "borrowerMarketDetails.modals.terminate.earlyClosure.termReduction",
              )}
            </Typography>
          )}
        </Box>
      </Box>
      <TxModalFooter
        mainBtnText={t(
          "borrowerMarketDetails.modals.terminate.earlyClosure.close",
        )}
        mainBtnOnClick={onClose}
      />
    </Dialog>
  )
}
