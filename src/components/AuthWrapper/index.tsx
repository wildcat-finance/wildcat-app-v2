"use client"

import { useEffect, useState } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useAuthToken, useLogin } from "@/hooks/useApiAuth"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { COLORS } from "@/theme/colors"

// Centered panel used when `title` is set (e.g. the admin page). Callers without
// a title keep the compact inline fallback below.
const PanelFallback = ({
  title,
  message,
  action,
}: {
  title: string
  message: string
  action?: React.ReactNode
}) => (
  <Box
    sx={{
      width: "100%",
      minHeight: "60vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: "12px",
      padding: "48px 20px",
      textAlign: "center",
    }}
  >
    <Typography variant="title2">{title}</Typography>
    <Typography
      variant="text2"
      sx={{ color: COLORS.santasGrey, maxWidth: "420px" }}
    >
      {message}
    </Typography>
    {action && <Box sx={{ marginTop: "8px" }}>{action}</Box>}
  </Box>
)

export default function AuthWrapper({
  buttonText = "Login",
  title,
  children,
  requiresAdmin,
}: {
  buttonText?: string
  title?: string
  children: React.ReactNode | React.ReactNode[]
  requiresAdmin?: boolean
}) {
  const { t } = useTranslation()

  const { address } = useAccount()
  const { chainId } = useSelectedNetwork()
  const token = useAuthToken()
  const { mutate: login } = useLogin()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // If no address, tell user to connect wallet
  if (!isMounted || !address) {
    if (title) {
      return <PanelFallback title={title} message={t("auth.walletRequired")} />
    }
    return (
      <Typography variant="h6">{t("auth.connectWalletContinue")}</Typography>
    )
  }
  // If no token, give user button to login
  if (!token) {
    if (title) {
      return (
        <PanelFallback
          title={title}
          message={t("auth.adminLoginRequired")}
          action={
            <Button
              variant="contained"
              size="large"
              onClick={() => login(address)}
            >
              {buttonText}
            </Button>
          }
        />
      )
    }
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
  if (requiresAdmin && (!token.isAdmin || token.chainId !== chainId)) {
    if (title) {
      return (
        <PanelFallback title={title} message={t("auth.adminAccessDenied")} />
      )
    }
    return <Typography variant="h6">{t("auth.notAdmin")}</Typography>
  }
  // If token, and is admin or doesn't require admin, render children
  // eslint-disable-next-line react/jsx-no-useless-fragment
  return <>{children}</>
}
