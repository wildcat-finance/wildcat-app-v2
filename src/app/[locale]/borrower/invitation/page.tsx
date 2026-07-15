"use client"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useLogin } from "@/hooks/useApiAuth"

import { AcceptInvitationForm } from "./components/AcceptInvitationForm"
import { PageContainer } from "../create-market/style"
import { useGetBorrowerInvitation } from "../hooks/useBorrowerInvitation"

const BorrowerInvitationPage = () => {
  const { t } = useTranslation()
  const { address } = useAccount()
  const login = useLogin()
  const {
    inviteExists,
    mustLogin,
    invitation,
    isLoading: isLoadingInvite,
  } = useGetBorrowerInvitation(address)

  if (!address) {
    return <Box sx={PageContainer}>{t("common.states.noWalletConnected")}</Box>
  }
  if (isLoadingInvite) {
    return <Box sx={PageContainer}>{t("common.states.loading")}</Box>
  }
  if (!inviteExists) {
    return (
      <Box sx={PageContainer}>{t("borrower.invitation.empty.notFound")}</Box>
    )
  }
  if (mustLogin || !invitation) {
    return (
      <Box
        sx={{
          ...PageContainer,
          display: "flex",
          flexDirection: "row",
          justifyContent: "center",
          alignItems: "center",
          gap: 2,
          textAlign: "center",
        }}
      >
        <Typography variant="h6">
          {t("borrower.invitation.empty.signInPrompt")}
        </Typography>
        <Button onClick={() => login.mutate(address)}>
          {t("borrower.invitation.signIn")}
        </Button>
      </Box>
    )
  }

  return <AcceptInvitationForm invitation={invitation} address={address} />
}

export default BorrowerInvitationPage
