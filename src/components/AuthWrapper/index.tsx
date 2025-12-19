"use client"

import { useEffect, useState } from "react"

import { Button, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { useAuthToken, useLogin } from "@/hooks/useApiAuth"

export default function AuthWrapper({
  buttonText = "Login",
  children,
  requiresAdmin,
}: {
  buttonText?: string
  children: React.ReactNode | React.ReactNode[]
  requiresAdmin?: boolean
}) {
  const { address } = useAccount()
  const token = useAuthToken()
  const { mutate: login } = useLogin()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // If no address, tell user to connect wallet
  if (!isMounted || !address) {
    return <Typography variant="h6">Connect your wallet to continue</Typography>
  }
  // If no token, give user button to login
  if (!token) {
    return (
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        onClick={() => login(address)}
      >
        {buttonText}
      </Button>
    )
  }
  // If token, but not admin and requiresAdmin, give user error
  if (requiresAdmin && !token.isAdmin) {
    return <Typography variant="h6">You are not an admin</Typography>
  }
  // If token, and is admin or doesn't require admin, render children
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}
