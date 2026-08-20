"use client"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useLogin } from "@/hooks/useApiAuth"

import { AcceptInvitationForm } from "./components/AcceptInvitationForm"
import {
  InvitationPageContainer,
  InvitationStatePanel,
  StateDescription,
} from "./style"
import { useGetBorrowerInvitation } from "../hooks/useBorrowerInvitation"

const InvitationState = ({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: React.ReactNode
}) => (
  <Box sx={InvitationPageContainer}>
    <Box sx={InvitationStatePanel}>
      <Typography variant="title2">{title}</Typography>
      <Typography variant="text2" sx={StateDescription}>
        {description}
      </Typography>
      {action}
    </Box>
  </Box>
)

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
    return (
      <InvitationState
        title={t("common.labels.connectWallet")}
        description={t("borrower.invitation.connectInvitedWalletReviewAccept")}
      />
    )
  }
  if (isLoadingInvite) {
    return (
      <InvitationState
        title={t("borrower.invitation.loadingInvitation")}
        description={t("borrower.invitation.checkingWhetherWalletHasActive")}
      />
    )
  }
  if (!inviteExists) {
    return (
      <InvitationState
        title={t("borrower.invitation.noInvitationFound")}
        description={t("borrower.invitation.walletDoesNotCurrentlyHave")}
      />
    )
  }
  if (mustLogin || !invitation) {
    return (
      <InvitationState
        title={t("borrower.invitation.signRequired")}
        description={t("borrower.invitation.signInvitedWalletViewAccept")}
        action={
          <Button
            variant="contained"
            size="large"
            onClick={() => login.mutate(address)}
            disabled={login.isPending}
          >
            {login.isPending ? "Signing in..." : "Sign in"}
          </Button>
        }
      />
    )
  }

  return <AcceptInvitationForm invitation={invitation} address={address} />
}

export default BorrowerInvitationPage
