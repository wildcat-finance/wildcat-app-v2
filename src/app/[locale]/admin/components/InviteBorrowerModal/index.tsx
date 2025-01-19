import * as React from "react"
import { useState } from "react"

import { Box, Button, Dialog, TextField, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { ErrorModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useInviteBorrower } from "../../hooks/useInviteBorrower"

export const InviteBorrowerModal = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [name, setName] = useState("")
  const [address, setAddress] = useState("")
  const [description, setDescription] = useState("")
  const [founded, setFounded] = useState("")
  const [headquarters, setHeadquarters] = useState("")
  const [jurisdiction, setJurisdiction] = useState("")
  const [physicalAddress, setPhysicalAddress] = useState("")
  const [entityKind, setEntityKind] = useState("")
  const [nameError, setNameError] = useState("")
  const [addressError, setAddressError] = useState("")

  const { mutate, isPending, isSuccess, isError } = useInviteBorrower()

  const handleClose = () => {
    setIsOpen(false)
    setName("")
    setAddress("")
    setNameError("")
    setAddressError("")
  }

  const validateInputs = () => {
    let isValid = true
    if (!name) {
      setNameError("Name is required")
      isValid = false
    }
    if (!address) {
      setAddressError("Address is required")
      isValid = false
    } else if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      setAddressError("Invalid Ethereum address")
      isValid = false
    }
    return isValid
  }

  const handleSubmit = () => {
    if (validateInputs()) {
      mutate({
        name,
        address,
        description,
        founded,
        headquarters,
        jurisdiction,
        physicalAddress,
        entityKind,
      })
      // Reset the form
      setName("")
      setAddress("")
      setDescription("")
      setFounded("")
      setHeadquarters("")
      setJurisdiction("")
      setPhysicalAddress("")
      setEntityKind("")
      setNameError("")
      setAddressError("")
    }
  }

  const handleTryAgain = () => {
    handleSubmit()
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
                label={t("admin.inviteBorrower.nameLabel")}
                value={name}
                onChange={(e) => {
                  setName(e.target.value)
                  setNameError("")
                }}
                error={!!nameError}
                helperText={nameError}
                fullWidth
                sx={{ marginBottom: 2 }}
              />

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
            </Box>

            <Box
              width="100%"
              padding="24px"
              display="flex"
              flexDirection="row"
              gap={2}
            >
              <TextField
                label={t("admin.inviteBorrower.descriptionLabel")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
              />

              <TextField
                label={t("admin.inviteBorrower.foundedLabel")}
                value={founded}
                onChange={(e) => setFounded(e.target.value)}
                fullWidth
              />
            </Box>

            <Box
              width="100%"
              padding="24px"
              display="flex"
              flexDirection="row"
              gap={2}
            >
              <TextField
                label={t("admin.inviteBorrower.entityKindLabel")}
                value={entityKind}
                onChange={(e) => setEntityKind(e.target.value)}
                fullWidth
              />
              <TextField
                label={t("admin.inviteBorrower.jurisdictionLabel")}
                value={jurisdiction}
                onChange={(e) => setJurisdiction(e.target.value)}
                fullWidth
              />
            </Box>

            <Box
              width="100%"
              padding="24px"
              display="flex"
              flexDirection="row"
              gap={2}
            >
              <TextField
                label={t("admin.inviteBorrower.physicalAddressLabel")}
                value={physicalAddress}
                onChange={(e) => setPhysicalAddress(e.target.value)}
                fullWidth
              />
            </Box>
          </>
        )}

        {isPending && <LoadingModal />}
        {isError && (
          <ErrorModal onTryAgain={handleTryAgain} onClose={handleClose} />
        )}
        {isSuccess && <SuccessModal onClose={handleClose} />}

        {showForm && (
          <TxModalFooter
            mainBtnText={t("admin.inviteBorrower.submit")}
            mainBtnOnClick={handleSubmit}
            disableMainBtn={!name || !address}
            // hideSecondBtn
          />
        )}
      </Dialog>
    </>
  )
}
