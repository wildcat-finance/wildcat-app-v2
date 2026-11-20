"use client"

import { useState } from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import AuthWrapper from "@/components/AuthWrapper"

import {
  AdminSectionSwitcher,
  type AdminSection,
} from "./components/AdminSectionSwitcher"
import { BorrowerInvitesTable } from "./components/BorrowerInvitesTable"
import { BorrowersTable } from "./components/BorrowersTable"
import { KycAdminSection } from "./components/KycAdminSection"

const AdminPageContainer = {
  height: "calc(100vh - 43px - 43px - 52px)",
  overflow: "scroll",
  padding: "52px 20px 0 44px",
  display: "flex",
  flexDirection: "column",
}
const AdminPage = () => {
  const { t } = useTranslation()

  const [activeSection, setActiveSection] =
    useState<AdminSection>("invitations")

  return (
    <AuthWrapper requiresAdmin title={t("admin.title")}>
      <Box sx={AdminPageContainer}>
        <AdminSectionSwitcher
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        {activeSection === "invitations" && <BorrowerInvitesTable />}
        {activeSection === "borrowers" && <BorrowersTable />}
        {activeSection === "kyc" && <KycAdminSection />}
      </Box>
    </AuthWrapper>
  )
}

export default AdminPage
