"use client"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import AuthWrapper from "@/components/AuthWrapper"

import { LenderKycTable } from "./components/LenderKycTable"

const OpsPageContainer = {
  height: "calc(100vh - 43px - 43px - 52px)",
  overflow: "scroll",
  padding: "52px 20px 0 44px",
  display: "flex",
  flexDirection: "column",
}

const OpsPage = () => {
  const { t } = useTranslation()

  return (
    <AuthWrapper title={t("ops.title")} loginMessage={t("ops.loginMessage")}>
      <Box data-hj-suppress sx={OpsPageContainer}>
        <LenderKycTable />
      </Box>
    </AuthWrapper>
  )
}

export default OpsPage
