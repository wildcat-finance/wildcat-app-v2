"use client"

import { Box, Button, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { useLogin } from "@/hooks/useApiAuth"

import { AcceptInvitationForm } from "./components/AcceptInvitationForm"
import { useGetBorrowerInvitation } from "../hooks/useBorrowerInvitation"
import { ContentContainer } from "../new-market/style"

export const BorrowerInvitationPage = () => {
  const { address } = useAccount()
  const login = useLogin()
  const {
    inviteExists,
    mustLogin,
    invitation,
    isLoading: isLoadingInvite,
  } = useGetBorrowerInvitation(address)

  if (!address) {
    return <Box sx={ContentContainer}>No Wallet Connected</Box>
  }
  if (isLoadingInvite) {
    return <Box sx={ContentContainer}>Loading...</Box>
  }
  if (!inviteExists || !invitation) {
    return <Box sx={ContentContainer}>No invitation found</Box>
  }
  if (mustLogin) {
    return (
      <Box sx={ContentContainer}>
        <Typography variant="h6">Login to view invitation</Typography>
        <Button onClick={() => login.mutate(address)}>Login</Button>
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
