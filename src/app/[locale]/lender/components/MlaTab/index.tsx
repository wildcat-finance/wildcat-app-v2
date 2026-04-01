"use client"

import { useMemo } from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useAuthToken, useLogin } from "@/hooks/useApiAuth"

export default function MlaTab() {
  const { t } = useTranslation()
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
        <Typography variant="caption">
          {t("marketDetailsLender.mlaTab.notLoggedIn")}
        </Typography>
        <Typography variant="title2">
          {address
            ? t("marketDetailsLender.mlaTab.signToView")
            : t("marketDetailsLender.mlaTab.connectWallet")}
        </Typography>
        {address && (
          <Button
            variant="contained"
            size="small"
            onClick={() => login(address)}
          >
            {t("common.actions.signMessage")}
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
