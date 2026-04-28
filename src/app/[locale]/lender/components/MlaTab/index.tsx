"use client"

import { Box, Button, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { useAuthToken, useLogin } from "@/hooks/useApiAuth"

export default function MlaTab() {
  const token = useAuthToken()
  const { mutate: login } = useLogin()
  const { address } = useAccount()
  if (!token || !address)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "80%",
          overflow: "auto",
          overflowY: "auto",
          padding: 2,
          gap: 1,
          alignItems: "center",
          textAlign: "center",
          paddingTop: "5%",
        }}
        height="calc(100vh - 43px - 52px - 52px - 110px)"
      >
        <Typography variant="caption">NOT LOGGED IN</Typography>
        <Typography variant="title2">
          {address
            ? "Sign a message to view your signed MLAs"
            : "Connect your wallet to continue"}
        </Typography>
        {address && (
          <Button
            variant="contained"
            size="small"
            onClick={() => login(address)}
          >
            Sign Message
          </Button>
        )}
      </Box>
    )

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "80%",
        overflow: "auto",
        overflowY: "auto",
        padding: 2,
        gap: 1,
        alignItems: "center",
        textAlign: "center",
        paddingTop: "5%",
      }}
      height="calc(100vh - 43px - 52px - 52px - 110px)"
    />
  )
}
