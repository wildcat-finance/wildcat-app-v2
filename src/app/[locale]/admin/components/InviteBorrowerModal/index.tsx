import * as React from "react"
import { useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import EditProfileForm from "@/app/[locale]/borrower/profile/edit/components/EditProfileForm"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"

import { ErrorModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useInviteBorrower } from "../../hooks/useInviteBorrower"

export const InviteBorrowerModal = () => {
  const { t } = useTranslation()
  const { chainId } = useSelectedNetwork()
  const [isOpen, setIsOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [addressError, setAddressError] = useState("")

  const { mutate, isPending, isSuccess, isError } = useInviteBorrower(address)

  const handleClose = () => {
    setIsOpen(false)
    setAddress("")
    setAddressError("")
  }

  const handleSubmit = (data: BorrowerProfileInput) => {
    mutate({
      chainId,
      address,
      name: data.name as string,
      alias: data.alias,
      description: data.description,
      founded: data.founded,
      headquarters: data.headquarters,
      jurisdiction: data.jurisdiction,
      physicalAddress: data.physicalAddress,
      entityKind: data.entityKind,
    })
  }

  const showForm = !(isPending || isSuccess || isError)

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsOpen(true)}
      >
        {t("admin.inviteBorrower.button")}
      </Button>

      <Dialog
        open={isOpen}
        onClose={isPending ? undefined : handleClose}
        sx={{
          "& .MuiDialog-paper": {
            width: "500px",
            borderRadius: "20px",
            padding: "24px 0",
          },
        }}
      >
        {showForm && (
          <>
            <TxModalHeader
              title={t("admin.inviteBorrower.title")}
              crossOnClick={handleClose}
              arrowOnClick={null}
            >
              <Box sx={{ padding: "0 24px" }}>
                <Typography variant="text3" color={COLORS.santasGrey}>
                  {t("admin.inviteBorrower.description")}
                </Typography>
              </Box>
            </TxModalHeader>
            <Box width="100%" padding="24px">
              <TextField
                label={t("admin.inviteBorrower.addressLabel")}
                value={address}
                onChange={(e) => {
                  setAddress(e.target.value)
                  setAddressError("")
                }}
                error={!!addressError}
                helperText={addressError}
                fullWidth
              />

              {address && (
                <EditProfileForm
                  key={address}
                  address={address as `0x${string}`}
                  hideAvatar
                  hideExternalLinks
                  hideHeaders
                  isAdmin
                  onSubmit={handleSubmit}
                />
              )}
            </Box>
          </>
        )}

        {isPending && (
          <LoadingModal
            title={t("admin.inviteBorrower.loading.title")}
            subtitle={t("admin.inviteBorrower.loading.subtitle")}
          />
        )}
        {isError && (
          <ErrorModal
            onClose={handleClose}
            title={t("admin.inviteBorrower.error.title")}
            subtitle={t("admin.inviteBorrower.error.subtitle")}
          />
        )}
        {isSuccess && (
          <SuccessModal
            onClose={handleClose}
            title={t("admin.inviteBorrower.success.title")}
            subtitle={t("admin.inviteBorrower.success.subtitle")}
          />
        )}
      </Dialog>
    </>
  )
}
