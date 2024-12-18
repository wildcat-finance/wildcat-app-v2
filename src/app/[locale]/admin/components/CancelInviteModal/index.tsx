import * as React from "react"

import { Box, Dialog, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { ErrorModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useCancelInvite } from "../../hooks/useCancelInvite"

interface CancelInviteModalProps {
  address: string
  borrowerName: string
  isOpen: boolean
  onClose: () => void
}

export const CancelInviteModal = ({
  address,
  borrowerName,
  isOpen,
  onClose,
}: CancelInviteModalProps) => {
  const { t } = useTranslation()
  const { mutate, isPending, isSuccess, isError } = useCancelInvite()

  const handleConfirm = () => {
    mutate(address)
  }

  const handleTryAgain = () => {
    handleConfirm()
  }

  const showConfirmation = !(isPending || isSuccess || isError)

  return (
    <Dialog
      open={isOpen}
      onClose={isPending ? undefined : onClose}
      sx={{
        "& .MuiDialog-paper": {
          width: "500px",
          borderRadius: "20px",
          padding: "24px 0",
        },
      }}
    >
      {showConfirmation && (
        <>
          <TxModalHeader
            title={t("admin.cancelInvite.title")}
            crossOnClick={onClose}
            arrowOnClick={onClose}
          >
            <Box sx={{ padding: "0 24px" }}>
              <Typography variant="text3" color={COLORS.santasGrey}>
                {t("admin.cancelInvite.description", {
                  name: borrowerName,
                  address,
                })}
              </Typography>
            </Box>
          </TxModalHeader>

          <TxModalFooter
            mainBtnText={t("admin.cancelInvite.confirm")}
            mainBtnOnClick={handleConfirm}
          />
        </>
      )}

      {isPending && <LoadingModal />}
      {isError && <ErrorModal onTryAgain={handleTryAgain} onClose={onClose} />}
      {isSuccess && <SuccessModal onClose={onClose} />}
    </Dialog>
  )
}
