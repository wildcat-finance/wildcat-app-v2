"use client"

import AuthWrapper from "@/components/AuthWrapper"

import { BorrowerInvitesTable } from "./components/BorrowerInvitesTable"
import { useAllBorrowerInvitations } from "./hooks/useAllBorrowerInvitations"

export const AdminPage = () => {
  const { data, isLoading } = useAllBorrowerInvitations()
  return (
    <AuthWrapper requiresAdmin>
      <BorrowerInvitesTable tableData={data || []} isLoading={isLoading} />
    </AuthWrapper>
  )
}

export default AdminPage
