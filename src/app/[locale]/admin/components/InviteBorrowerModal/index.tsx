import * as React from "react"
import { useEffect, useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import EditProfileForm from "@/app/[locale]/borrower/profile/edit/components/EditProfileForm"
import { BorrowerProfileInput } from "@/app/api/profiles/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"

import { ErrorModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/ErrorModal"
import { LoadingModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/LoadingModal"
import { SuccessModal } from "../../../borrower/market/[address]/components/Modals/FinalModals/SuccessModal"
import { useBorrowerOrganisations } from "../../hooks/useBorrowerOrganisations"
import { useInviteBorrower } from "../../hooks/useInviteBorrower"

const NEW_BORROWER = "new"

const isAddress = (value: string) => /^0x[0-9a-fA-F]{40}$/.test(value)

export const InviteBorrowerModal = () => {
  const { t } = useTranslation()
  const { chainId, name: networkName } = useSelectedNetwork()
  const [isOpen, setIsOpen] = useState(false)
  const [address, setAddress] = useState("")
  const [addressError, setAddressError] = useState("")
  const [borrowerId, setBorrowerId] = useState(NEW_BORROWER)
  const [borrowerTouched, setBorrowerTouched] = useState(false)

  const { mutate, isPending, isSuccess, isError } = useInviteBorrower(address)
  const { data: organisations } = useBorrowerOrganisations()

  const selectedOrganisation = organisations?.find(
    ({ id }) => id === borrowerId,
  )

  // An address the borrower already uses on another network of this class
  // most likely belongs to the same organisation: offer it as the default.
  const organisationOfAddress = useMemo(() => {
    if (!isAddress(address)) return undefined
    const lowered = address.toLowerCase()
    return organisations?.find(({ registrations }) =>
      registrations.some((registration) => registration.address === lowered),
    )
  }, [address, organisations])

  useEffect(() => {
    if (borrowerTouched) return
    setBorrowerId(organisationOfAddress?.id ?? NEW_BORROWER)
  }, [organisationOfAddress, borrowerTouched])

  const handleClose = () => {
    setIsOpen(false)
    setAddress("")
    setAddressError("")
    setBorrowerId(NEW_BORROWER)
    setBorrowerTouched(false)
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

  const handleSubmitExisting = () => {
    if (!selectedOrganisation) return
    if (!isAddress(address)) {
      setAddressError(t("admin.inviteBorrower.invalidAddress"))
      return
    }
    mutate({
      chainId,
      address,
      borrowerId: selectedOrganisation.id,
      name: selectedOrganisation.name,
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
            <Box
              width="100%"
              padding="24px"
              display="flex"
              flexDirection="column"
              gap="16px"
            >
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

              <TextField
                select
                label={t("admin.inviteBorrower.borrowerLabel")}
                value={borrowerId}
                onChange={(e) => {
                  setBorrowerId(e.target.value)
                  setBorrowerTouched(true)
                }}
                helperText={t("admin.inviteBorrower.borrowerHelp")}
                fullWidth
                // The theme's fixed field height would put the help text
                // over the next field.
                sx={{ height: "auto" }}
              >
                <MenuItem value={NEW_BORROWER}>
                  {t("admin.inviteBorrower.newBorrower")}
                </MenuItem>
                {organisations?.map((organisation) => (
                  <MenuItem key={organisation.id} value={organisation.id}>
                    {organisation.alias
                      ? `${organisation.name} (${organisation.alias})`
                      : organisation.name}
                    {` · ${t("admin.inviteBorrower.addressCount", {
                      count: organisation.registrations.length,
                    })}`}
                  </MenuItem>
                ))}
              </TextField>

              {selectedOrganisation ? (
                <>
                  <Typography variant="text3" color={COLORS.santasGrey}>
                    {t("admin.inviteBorrower.existingBorrower", {
                      name: selectedOrganisation.name,
                      network: networkName,
                      interpolation: { escapeValue: false },
                    })}
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    disabled={!address}
                    onClick={handleSubmitExisting}
                  >
                    {t("admin.inviteBorrower.submit")}
                  </Button>
                </>
              ) : (
                address && (
                  <EditProfileForm
                    key={address}
                    address={address as `0x${string}`}
                    hideAvatar
                    hideExternalLinks
                    hideHeaders
                    isAdmin
                    onSubmit={handleSubmit}
                  />
                )
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
