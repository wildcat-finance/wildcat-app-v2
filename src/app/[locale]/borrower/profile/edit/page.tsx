"use client"

import * as React from "react"

import { useRouter } from "next/navigation"
import { useAccount } from "wagmi"

import { EditPageContainer } from "@/app/[locale]/borrower/profile/edit/style"
import { ROUTES } from "@/routes"

import EditProfileForm from "./components/EditProfileForm"

/*
type Jurisdiction = {
  id: string
  name: string
  label: string
}
const ProfileKeys = [
  "name",
  "avatar",
  "description",
  "founded",
  "headquarters",
  "website",
  "twitter",
  "linkedin",
  "jurisdiction",
  "entityKind",
  "physicalAddress",
  "email",
] as (keyof BorrowerProfileInput)[]
*/

export default function EditProfile() {
  const router = useRouter()
  const { address } = useAccount()
  const afterSubmit = () => {
    router.push(ROUTES.borrower.profile)
  }

  const handleCancel = () => {
    router.push(ROUTES.borrower.profile)
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
