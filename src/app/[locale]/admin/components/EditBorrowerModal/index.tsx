import * as React from "react"
import { useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import EditProfileForm from "@/app/[locale]/borrower/profile/edit/components/EditProfileForm"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { ErrorModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/SuccessModal"

export const EditBorrowerModal = ({ address }: { address: `0x${string}` }) => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)

  const handleClose = () => {
    setIsOpen(false)
  }

  // const handleSubmit = (data: BorrowerProfileInput) => {
  //   mutate({
  //     address,
  //     name: data.name as string,
  //     description: data.description,
  //     founded: data.founded,
  //     headquarters: data.headquarters,
  //     jurisdiction: data.jurisdiction,
  //     physicalAddress: data.physicalAddress,
  //     entityKind: data.entityKind,
  //   })
  // }

  // const showForm = !(isPending || isSuccess || isError)

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsOpen(true)}
      >
        {t("admin.editBorrower.button")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={handleClose}
        sx={{
          "& .MuiDialog-paper": {
            width: "500px",
            borderRadius: "20px",
            padding: "24px 0",
          },
        }}
      >
        {isOpen && (
          <>
            <TxModalHeader
              title={t("admin.editBorrower.title")}
              crossOnClick={handleClose}
              arrowOnClick={null}
            >
              <Box sx={{ padding: "0 24px" }}>
                <Typography variant="text3" color={COLORS.santasGrey}>
                  {t("admin.editBorrower.description")}
                </Typography>
              </Box>
            </TxModalHeader>
            <Box width="100%" padding="24px">
              <EditProfileForm
                address={address as `0x${string}`}
                hideAvatar
                hideExternalLinks
                hideHeaders
                isAdmin
                // onSubmit={handleSubmit}
                afterSubmit={handleClose}
              />
            </Box>
          </>
        )}

        {/* {isPending && <LoadingModal />}
        {isError && <ErrorModal onTryAgain={() => {}} onClose={handleClose} />}
        {isSuccess && <SuccessModal onClose={handleClose} />} */}
      </Dialog>
    </>
  )
}
