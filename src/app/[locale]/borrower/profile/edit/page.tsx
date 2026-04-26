"use client"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { EditPageContainer } from "@/app/[locale]/borrower/profile/edit/style"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { ROUTES } from "@/routes"
import { buildBorrowerProfileHref } from "@/utils/formatters"

import EditProfileForm from "./components/EditProfileForm"

export default function EditProfile() {
  const router = useRouter()
  const { address } = useAccount()
  const { chainId } = useSelectedNetwork()
  const profileHref = address
    ? buildBorrowerProfileHref(address, chainId)
    : ROUTES.borrower.profile

  const afterSubmit = () => {
    router.push(profileHref)
  }

  const handleCancel = () => {
    router.push(profileHref)
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
