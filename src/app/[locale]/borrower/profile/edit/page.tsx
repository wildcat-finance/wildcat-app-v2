"use client"

import * as React from "react"
import { useEffect, useRef, useState } from "react"

import {
  Box,
  Button,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { AvatarProfileItem } from "@/app/[locale]/borrower/profile/edit/components/AvatarProfileItem"
import { EditProfileItem } from "@/app/[locale]/borrower/profile/edit/components/EditProfileItem"
import { SelectProfileItem } from "@/app/[locale]/borrower/profile/edit/components/SelectProfileItem"
import {
  entityCategoryOptions,
  EntityCategory,
  useEditPrivateForm,
} from "@/app/[locale]/borrower/profile/edit/hooks/useEditPrivateForm"
import { useEditPublicForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditPublicForm"
import { useUpdateBorrowerProfile } from "@/app/[locale]/borrower/profile/edit/hooks/useUpdateBorrowerProfile"
import {
  ButtonsContainer,
  DescriptionField,
  EditPageContainer,
  FieldsContainer,
  SelectStyles,
  TitleContainer,
} from "@/app/[locale]/borrower/profile/edit/style"
import {
  useGetBorrowerProfile,
  useInvalidateBorrowerProfile,
} from "@/app/[locale]/borrower/profile/hooks/useGetBorrowerProfile"
import {
  BorrowerProfile,
  BorrowerProfileInput,
} from "@/app/api/profiles/interface"
import CountriesList from "@/config/countries.json"
import ELFsByCountry from "@/config/elfs-by-country.json"
import JurisdictionsByCountry from "@/config/jurisdictions-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"
import { TargetChainId } from "@/config/network"
import { useAuthToken, useLogin } from "@/hooks/useApiAuth"
import { mockedNaturesOptions } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { CountrySelector } from "./components/CountrySelector"
import EditProfileForm from "./components/EditProfileForm"
import { EntityKindSelector } from "./components/EntityKindSelector"
import { JurisdictionSelector } from "./components/JurisdictionSelector"

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
