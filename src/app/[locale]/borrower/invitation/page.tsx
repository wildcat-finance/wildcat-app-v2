"use client"

import { Box, Button, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { useLogin } from "@/hooks/useApiAuth"

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
  if (!inviteExists) {
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
    <Box sx={ContentContainer}>
      <Typography variant="h6">Invitation exists</Typography>
      <Typography variant="body1">Name: {invitation?.name}</Typography>
    </Box>
  )
}

export default BorrowerInvitationPage
