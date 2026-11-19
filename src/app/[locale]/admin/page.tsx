"use client"

import { useState } from "react"

import { Box, Button } from "@mui/material"
import { hasDeploymentAddress } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import AuthWrapper from "@/components/AuthWrapper"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"

import { AdminSectionSwitcher } from "./components/AdminSectionSwitcher"
import { BorrowerInvitesTable } from "./components/BorrowerInvitesTable"
import { BorrowersTable } from "./components/BorrowersTable"

const AdminPageContainer = {
  height: "calc(100vh - 43px - 43px - 52px)",
  overflow: "scroll",
  padding: "52px 20px 0 44px",
  display: "flex",
  flexDirection: "column",
}
const AdminPage = () => {
  const { t } = useTranslation()

  const { chainId } = useSelectedNetwork()
  const [activeSection, setActiveSection] = useState("invitations")

  return (
    <>
      {hasDeploymentAddress(chainId, "KYCRoleProvider") && (
        <Button
          component="a"
          href={ROUTES.kycAdmin}
          sx={{ alignSelf: "flex-start", mx: 3, mt: 2 }}
        >
          {t("admin.kyc.adminTitle")}
        </Button>
      )}
      <AuthWrapper requiresAdmin title={t("admin.title")}>
        <Box sx={AdminPageContainer}>
          <AdminSectionSwitcher
            activeSection={activeSection}
            setActiveSection={setActiveSection}
          />
          {activeSection === "invitations" && <BorrowerInvitesTable />}
          {activeSection === "borrowers" && <BorrowersTable />}
        </Box>
      </AuthWrapper>
    </>
  )
}

export default AdminPage
