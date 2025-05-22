"use client"

import { Box, Button, Typography } from "@mui/material"
import { match, P } from "ts-pattern"
import { useAccount } from "wagmi"

import { useLogin } from "@/hooks/useApiAuth"

import { AcceptInvitationForm } from "./components/AcceptInvitationForm"
import { PageContainer } from "../create-market/style"
import { useGetBorrowerInvitation } from "../hooks/useBorrowerInvitation"

const BorrowerInvitationPage = () => {
  const { address } = useAccount()
  const login = useLogin()
  const {
    inviteExists,
    mustLogin,
    invitation,
    isLoading: isLoadingInvite,
  } = useGetBorrowerInvitation(address)

  return match({
    address,
    isLoadingInvite,
    inviteExists,
    mustLogin,
    invitation,
  })
    .with({ address: P.nullish }, () => (
      <Box sx={PageContainer}>No Wallet Connected</Box>
    ))
    .with({ isLoadingInvite: true }, () => (
      <Box sx={PageContainer}>Loading...</Box>
    ))
    .with({ inviteExists: false }, () => (
      <Box sx={PageContainer}>No invitation found</Box>
    ))
    .with({ mustLogin: true, invitation: P.nullish }, () => (
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
          Sign In with wallet to view invitation
        </Typography>
        <Button onClick={() => login.mutate(address as string)}>Sign In</Button>
      </Box>
    ))
    .with(
      {
        address: P.string,
        invitation: P.not(P.nullish),
      },
      (data) => (
        <AcceptInvitationForm
          invitation={data.invitation}
          address={data.address}
        />
      ),
    )
    .otherwise(() => null)
}

export default BorrowerInvitationPage
