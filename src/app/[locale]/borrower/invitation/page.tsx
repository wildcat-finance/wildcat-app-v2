"use client"

import { Box, Button, Typography } from "@mui/material"
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
        title="Connect wallet"
        description="Connect the invited wallet to review and accept your borrower invitation."
      />
    )
  }
  if (isLoadingInvite) {
    return (
      <InvitationState
        title="Loading invitation"
        description="Checking whether this wallet has an active borrower invitation."
      />
    )
  }
  if (!inviteExists) {
    return (
      <InvitationState
        title="No invitation found"
        description="This wallet does not currently have a borrower invitation."
      />
    )
  }
  if (mustLogin || !invitation) {
    return (
      <InvitationState
        title="Sign in required"
        description="Sign in with the invited wallet to view and accept your borrower invitation."
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
