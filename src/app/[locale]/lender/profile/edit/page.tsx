"use client"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { EditPageContainer } from "@/app/[locale]/borrower/profile/edit/style"
import { ROUTES } from "@/routes"

import EditProfileForm from "./components/EditProfileForm"

export default function EditProfile() {
  const router = useRouter()
  const { address } = useAccount()
  const afterSubmit = () => {
    router.push(ROUTES.lender.profile)
  }

  const handleCancel = () => {
    router.push(ROUTES.lender.profile)
  }
  return (
    <EditProfileForm
      sx={EditPageContainer}
      address={address as `0x${string}`}
      onCancel={handleCancel}
      afterSubmit={afterSubmit}
    />
  )
}
