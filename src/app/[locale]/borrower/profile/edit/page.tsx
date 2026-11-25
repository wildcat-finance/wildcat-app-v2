"use client"

import { useAccount } from "wagmi"

import { EditPageContainer } from "@/app/[locale]/borrower/profile/edit/style"
import { useHistoryBack } from "@/hooks/useHistoryBack"
import { ROUTES } from "@/routes"

import EditProfileForm from "./components/EditProfileForm"

export default function EditProfile() {
  const { address } = useAccount()
  const returnToProfile = useHistoryBack(ROUTES.borrower.profile)

  return (
    <EditProfileForm
      sx={EditPageContainer}
      address={address as `0x${string}`}
      onCancel={returnToProfile}
      afterSubmit={returnToProfile}
    />
  )
}
