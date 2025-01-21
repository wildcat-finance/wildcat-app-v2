"use client"

import { Box } from "@mui/material"

import AuthWrapper from "@/components/AuthWrapper"

import { BorrowerInvitesTable } from "./components/BorrowerInvitesTable"
import { useAllBorrowerInvitations } from "./hooks/useAllBorrowerInvitations"

const AdminPageContainer = {
  height: "calc(100vh - 43px - 43px - 52px)",
  overflow: "scroll",
  padding: "52px 20px 0 44px",
  display: "flex",
  flexDirection: "column",
}
const AdminPage = () => {
  const { data, isLoading } = useAllBorrowerInvitations()
  return (
    <AuthWrapper requiresAdmin>
      <Box sx={AdminPageContainer}>
        <BorrowerInvitesTable tableData={data || []} isLoading={isLoading} />
      </Box>
    </AuthWrapper>
  )
}

export default AdminPage
