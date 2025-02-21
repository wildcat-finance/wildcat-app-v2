"use client"

import { useState } from "react"

import { Box } from "@mui/material"

import AuthWrapper from "@/components/AuthWrapper"

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
  const [activeSection, setActiveSection] = useState("invitations")

  return (
    <AuthWrapper requiresAdmin>
      <Box sx={AdminPageContainer}>
        <AdminSectionSwitcher
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />
        {activeSection === "invitations" && <BorrowerInvitesTable />}
        {activeSection === "borrowers" && <BorrowersTable />}
      </Box>
    </AuthWrapper>
  )
}

export default AdminPage
