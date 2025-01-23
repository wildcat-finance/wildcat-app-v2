"use client"

import { Box, Button, Typography } from "@mui/material"
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

  if (!address) {
    return <Box sx={PageContainer}>No Wallet Connected</Box>
  }
  if (isLoadingInvite) {
    return <Box sx={PageContainer}>Loading...</Box>
  }
  if (!inviteExists) {
    return <Box sx={PageContainer}>No invitation found</Box>
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
          Sign In with wallet to view invitation
        </Typography>
        <Button onClick={() => login.mutate(address)}>Sign In</Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        height: "calc(100vh - 43px - 43px - 52px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        width: "100vw",
      }}
    >
      <AcceptInvitationForm invitation={invitation} address={address} />
    </Box>
  )
}

export default BorrowerInvitationPage
