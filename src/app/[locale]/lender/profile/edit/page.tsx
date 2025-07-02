"use client"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import EditProfileForm from "@/app/[locale]/borrower/profile/edit/components/EditProfileForm"
import { EditPageContainer } from "@/app/[locale]/borrower/profile/edit/style"
import { ROUTES } from "@/routes"

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
