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
  const { t } = useTranslation()

  const token = useAuthToken()
  const { mutate: login } = useLogin()

  const publicForm = useEditPublicForm()
  const privateForm = useEditPrivateForm()

  const { address } = useAccount()
  const { data: publicData, isLoading: isPublicDataLoading } =
    useGetBorrowerProfile(address)
  const invalidateBorrowerProfile = useInvalidateBorrowerProfile(address)

  const isLoading = isPublicDataLoading

  const { mutate } = useUpdateBorrowerProfile()

  const [avatar, setAvatar] = useState<string | undefined>(undefined)

  const [subdivisions, setSubdivisions] = useState<Jurisdiction[]>([])

  const {
    getValues: getPublicValues,
    setValue: setPublicValue,
    register: registerPublic,
    formState: { errors: publicErrors },
    watch: publicWatch,
  } = publicForm
  const {
    getValues: getPrivateValues,
    setValue: setPrivateValue,
    register: registerPrivate,
    formState: { errors: privateErrors },
    watch: privateWatch,
  } = privateForm

  const publicInfo: BorrowerProfileInput = {
    address: address as string,
    avatar,
    name: getPublicValues().legalName,
    description: getPublicValues().description,
    founded: getPublicValues().founded,
    headquarters: getPublicValues().headquarters,
    website: getPublicValues().website,
    twitter: getPublicValues().twitter,
    linkedin: getPublicValues().linkedin,
    jurisdiction: getPrivateValues().jurisdiction,
    entityKind: getPrivateValues().entityKind,
    physicalAddress: getPrivateValues().physicalAddress,
    email: getPrivateValues().email,
  }

  const compare = () =>
    ProfileKeys.every((key) => {
      const oldValue = publicInfo[key] || ""
      const newValue = publicData?.[key] || ""
      return oldValue === newValue
    })

  const arePublicInfoEqual = compare()

  const handleNatureSelect = (
    event: SelectChangeEvent<EntityCategory | null>,
  ) => {
    const value = event.target.value || undefined
    setPrivateValue("entityCategory", value as EntityCategory)
    if (value === "Registered Legal Entity") {
      setPrivateValue("entityKind", "", { shouldValidate: true })
    } else {
      setPrivateValue("entityKind", value || "", { shouldValidate: true })
      if (value === "Decentralised Autonomous Organisation") {
        setPrivateValue("country", "", { shouldValidate: true })
        setPrivateValue("jurisdiction", "")
        setPrivateValue("physicalAddress", "")
      }
    }
  }

  const handleSendUpdate = () => {
    const changedValues: BorrowerProfileInput = {
      address: address as string,
    }
    ProfileKeys.forEach((key) => {
      const oldValue = publicData?.[key] || ""
      const newValue = publicInfo[key] || ""
      if (oldValue !== newValue) {
        changedValues[key] = newValue
      }
    })
    mutate(changedValues, {
      onSuccess: () => {
        invalidateBorrowerProfile()
        router.push(ROUTES.borrower.profile)
      },
      onError: (error) => {
        console.error(error)
      },
    })
  }

  const handleCancel = () => {
    router.push(ROUTES.borrower.profile)
  }

  const [oldCountry, setOldCountry] = useState<string | undefined>(undefined)
  const [oldElfName, setOldElfName] = useState<string | undefined>(undefined)

  useEffect(() => {
    setPublicValue("legalName", publicData?.name || "", {
      shouldValidate: true,
    })
    setPublicValue("description", publicData?.description, {
      shouldValidate: true,
    })
    setPublicValue("founded", publicData?.founded, { shouldValidate: true })
    setPublicValue("headquarters", publicData?.headquarters, {
      shouldValidate: true,
    })
    setPublicValue("website", publicData?.website, { shouldValidate: true })
    setPublicValue("twitter", publicData?.twitter, { shouldValidate: true })
    setPublicValue("linkedin", publicData?.linkedin, { shouldValidate: true })

    console.log(publicData)
    if (publicData?.jurisdiction) {
      setPrivateValue("entityCategory", "Registered Legal Entity")
      const jurisdiction =
        Jurisdictions[publicData.jurisdiction as keyof typeof Jurisdictions]
      setOldCountry(jurisdiction?.countryCode)
      setPrivateValue("country", jurisdiction?.countryCode || "", {
        shouldValidate: true,
      })
      console.log(`Setting country to ${jurisdiction?.countryCode}`)
      if (publicData?.entityKind) {
        const elfs =
          ELFsByCountry[
            jurisdiction.countryCode as keyof typeof ELFsByCountry
          ] || []
        setOldElfName(
          elfs.find((e) => e.elfCode === publicData.entityKind)?.name,
        )
      }
    }
    setPrivateValue("jurisdiction", publicData?.jurisdiction || "", {
      shouldValidate: true,
    })
    console.log(`Setting entity kind to ${publicData?.entityKind}`)
    console.log(`Setting jurisdiction to ${publicData?.jurisdiction}`)
    setPrivateValue("entityKind", publicData?.entityKind || "", {
      shouldValidate: true,
    })
    setPrivateValue("physicalAddress", publicData?.physicalAddress || "", {
      shouldValidate: true,
    })
    setPrivateValue("email", publicData?.email, { shouldValidate: true })
  }, [publicData])

  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  const getLabelByValue = (value: string | undefined) => {
    const option = mockedNaturesOptions.find((o) => o.value === value)
    return option ? option.label : undefined
  }

  const entityCategory = privateWatch("entityCategory")
  const countryWatch = privateWatch("country")
  const jurisdictionWatch = privateWatch("jurisdiction")

  useEffect(() => {
    const subdivisionOptions =
      JurisdictionsByCountry[
        countryWatch as keyof typeof JurisdictionsByCountry
      ] || []
    setSubdivisions(subdivisionOptions)
    if (countryWatch) {
      if (subdivisionOptions.length === 0) {
        setPrivateValue("jurisdiction", "", { shouldValidate: true })
      } else if (subdivisionOptions.length === 1) {
        setPrivateValue("jurisdiction", subdivisionOptions[0].id, {
          shouldValidate: true,
        })
        setPrivateValue("entityKind", "", { shouldValidate: true })
      } else if (
        jurisdictionWatch &&
        !subdivisionOptions.some((sub) => sub.id === jurisdictionWatch)
      ) {
        setPrivateValue("jurisdiction", "", { shouldValidate: true })
        setPrivateValue("entityKind", "", { shouldValidate: true })
      }
    }
  }, [countryWatch, setPrivateValue])

  return (
    <Box sx={EditPageContainer}>
      <Box sx={TitleContainer}>
        <Typography variant="title1">
          {t("borrowerProfile.edit.public.title")}
        </Typography>
        <Typography variant="text2" color={COLORS.santasGrey}>
          {t("borrowerProfile.edit.public.subtitle")}
        </Typography>
      </Box>

      <AvatarProfileItem
        avatar={avatar}
        setAvatar={setAvatar}
        isLoading={isLoading}
      />

      <Box sx={{ ...FieldsContainer, marginTop: "32px" }}>
        <EditProfileItem
          title={t("borrowerProfile.edit.public.name.title")}
          tooltip={t("borrowerProfile.edit.public.name.tooltip")}
          form={publicForm}
          field="legalName"
          oldValue={publicData?.name}
          newValue={publicWatch("legalName")}
          isLoading={isLoading}
        >
          <TextField
            fullWidth
            placeholder={t("borrowerProfile.edit.public.name.placeholder")}
            error={Boolean(publicErrors.legalName)}
            disabled={TargetChainId === SupportedChainId.Mainnet}
            helperText={
              publicErrors.legalName?.message ??
              (TargetChainId === SupportedChainId.Mainnet
                ? t("borrowerProfile.edit.public.name.helperText")
                : undefined)
            }
            {...registerPublic("legalName")}
          />
        </EditProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.public.description.title")}
          tooltip={t("borrowerProfile.edit.public.description.tooltip")}
          form={publicForm}
          field="description"
          oldValue={publicData?.description}
          newValue={publicWatch("description")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t(
              "borrowerProfile.edit.public.description.placeholder",
            )}
            sx={DescriptionField}
            error={Boolean(publicErrors.description)}
            helperText={publicErrors.description?.message}
            {...registerPublic("description")}
            fullWidth
            multiline
            maxRows={4}
            minRows={2}
          />
        </EditProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.public.founded.title")}
          tooltip={t("borrowerProfile.edit.public.founded.tooltip")}
          form={publicForm}
          field="founded"
          oldValue={publicData?.founded}
          newValue={publicWatch("founded")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t("borrowerProfile.edit.public.founded.placeholder")}
            fullWidth
            error={Boolean(publicErrors.founded)}
            helperText={publicErrors.founded?.message}
            {...registerPublic("founded")}
            value={publicWatch("founded")}
            onChange={(e) => {
              // Don't update if the value is not a number
              if (!Number.isNaN(Number(e.target.value))) {
                setPublicValue("founded", e.target.value)
              }
            }}
            onBlur={(e) => {
              if (!Number.isNaN(Number(e.target.value))) {
                setPublicValue("founded", e.target.value)
              }
            }}
          />
        </EditProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.public.website.title")}
          tooltip={t("borrowerProfile.edit.public.website.tooltip")}
          form={publicForm}
          field="website"
          oldValue={publicData?.website}
          newValue={publicWatch("website")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t("borrowerProfile.edit.public.website.placeholder")}
            fullWidth
            error={Boolean(publicErrors.website)}
            helperText={publicErrors.website?.message}
            {...registerPublic("website")}
          />
        </EditProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.public.twitter.title")}
          tooltip={t("borrowerProfile.edit.public.twitter.tooltip")}
          form={publicForm}
          field="twitter"
          oldValue={publicData?.twitter}
          newValue={publicWatch("twitter")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t("borrowerProfile.edit.public.twitter.placeholder")}
            fullWidth
            error={Boolean(publicErrors.twitter)}
            helperText={publicErrors.twitter?.message}
            {...registerPublic("twitter")}
          />
        </EditProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.public.linkedin.title")}
          tooltip={t("borrowerProfile.edit.public.linkedin.tooltip")}
          form={publicForm}
          field="linkedin"
          oldValue={publicData?.linkedin}
          newValue={publicWatch("linkedin")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t("borrowerProfile.edit.public.linkedin.placeholder")}
            fullWidth
            error={Boolean(publicErrors.linkedin)}
            helperText={publicErrors.linkedin?.message}
            {...registerPublic("linkedin")}
          />
        </EditProfileItem>
      </Box>

      <Divider sx={{ width: "60.8%", margin: "40px 0" }} />

      <Box sx={TitleContainer}>
        <Typography variant="title1">
          {t("borrowerProfile.edit.private.title")}
        </Typography>
        <Typography variant="text2" color={COLORS.santasGrey}>
          {t("borrowerProfile.edit.private.subtitle")}
        </Typography>
      </Box>

      <Box sx={FieldsContainer}>
        {/* Temporarily disabling anything but registered legal entities */}
        {/*  <SelectProfileItem
          title={t("borrowerProfile.edit.private.nature.title")}
          tooltip={t("borrowerProfile.edit.private.nature.tooltip")}
          form={privateForm}
          field="entityCategory"
          isLoading={isLoading}
        >
          <FormControl fullWidth>
            <InputLabel className="test">
              {t("borrowerProfile.edit.private.nature.placeholder")}
            </InputLabel>
            <Select
              ref={selectRef}
              onOpen={onOpen}
              onClose={onClose}
              onChange={handleNatureSelect}
              value={privateWatch("entityCategory") || ""}
              MenuProps={{
                sx: SelectStyles,
                anchorOrigin: {
                  vertical: "bottom",
                  horizontal: "left",
                },
                transformOrigin: {
                  vertical: "top",
                  horizontal: "left",
                },
              }}
            >
              {entityCategoryOptions.map((option) => (
                <MenuItem
                  key={option.id}
                  value={option.value}
                  disabled={option.value !== "Registered Legal Entity"}
                  sx={{ width: "100%" }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </SelectProfileItem> */}
        {entityCategory !== "Decentralised Autonomous Organisation" && (
          <>
            <EditProfileItem
              title="Country"
              tooltip="Country"
              oldLabel={CountriesList.find((c) => c.id === oldCountry)?.name}
              oldValue={oldCountry}
              form={privateForm}
              field="country"
              newValue={countryWatch}
              isLoading={isLoading}
            >
              <CountrySelector
                value={countryWatch || null}
                handleSelect={(country) => {
                  setPrivateValue("country", country?.id || "", {
                    shouldValidate: true,
                  })
                }}
                error={Boolean(privateErrors.country)}
                helperText={privateErrors.country?.message}
              />
            </EditProfileItem>

            {subdivisions.length > 1 && (
              <EditProfileItem
                title="Jurisdiction"
                tooltip="Sub-division of country"
                oldValue={
                  oldCountry === countryWatch
                    ? publicData?.jurisdiction
                    : undefined
                }
                oldLabel={
                  oldCountry === countryWatch && publicData?.jurisdiction
                    ? subdivisions.find(
                        (s) => s.id === publicData?.jurisdiction,
                      )?.name
                    : undefined
                }
                form={privateForm}
                field="jurisdiction"
                newValue={jurisdictionWatch}
                isLoading={isLoading}
              >
                <JurisdictionSelector
                  options={subdivisions}
                  error={Boolean(privateErrors.jurisdiction)}
                  helperText={privateErrors.jurisdiction?.message}
                  handleSelect={(jurisdiction) => {
                    setPrivateValue("jurisdiction", jurisdiction?.id || "", {
                      shouldValidate: true,
                    })
                    if (jurisdiction?.id !== jurisdictionWatch) {
                      setPrivateValue("entityKind", "", {
                        shouldValidate: true,
                      })
                    }
                  }}
                  value={jurisdictionWatch || null}
                />
              </EditProfileItem>
            )}

            {entityCategory === "Registered Legal Entity" && countryWatch && (
              <EditProfileItem
                title={t("borrowerProfile.edit.public.entityKind.title")}
                tooltip={t("borrowerProfile.edit.public.entityKind.tooltip")}
                form={privateForm}
                field="entityKind"
                oldValue={
                  publicData?.jurisdiction === jurisdictionWatch
                    ? publicData?.entityKind
                    : undefined
                }
                oldLabel={oldElfName}
                newValue={privateWatch("entityKind")}
                isLoading={isLoading}
              >
                <EntityKindSelector
                  value={privateWatch("entityKind") || null}
                  error={Boolean(privateErrors.entityKind)}
                  helperText={privateErrors.entityKind?.message}
                  handleSelect={(entityKind) => {
                    setPrivateValue("entityKind", entityKind?.elfCode || "", {
                      shouldValidate: true,
                    })
                    if (!jurisdictionWatch) {
                      setPrivateValue(
                        "jurisdiction",
                        entityKind?.jurisdictionCode || "",
                        {
                          shouldValidate: true,
                        },
                      )
                    }
                  }}
                  countryCode={countryWatch}
                  jurisdictionCode={jurisdictionWatch}
                />
              </EditProfileItem>
            )}

            <EditProfileItem
              title={t("borrowerProfile.edit.private.address.title")}
              tooltip={t("borrowerProfile.edit.private.address.tooltip")}
              form={privateForm}
              field="physicalAddress"
              oldValue={publicData?.physicalAddress}
              newValue={privateWatch("physicalAddress")}
              isLoading={isLoading}
            >
              <TextField
                placeholder={t(
                  "borrowerProfile.edit.private.address.placeholder",
                )}
                fullWidth
                error={Boolean(privateErrors.physicalAddress)}
                helperText={
                  privateErrors.physicalAddress?.message ??
                  t("borrowerProfile.edit.private.address.helperText")
                }
                {...registerPrivate("physicalAddress")}
              />
            </EditProfileItem>
          </>
        )}

        <EditProfileItem
          title={t("borrowerProfile.edit.private.email.title")}
          tooltip={t("borrowerProfile.edit.private.email.tooltip")}
          form={privateForm}
          field="email"
          oldValue={publicData?.email}
          newValue={privateWatch("email")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t("borrowerProfile.edit.private.email.placeholder")}
            fullWidth
            error={Boolean(privateErrors.email)}
            helperText={
              privateErrors.email?.message ??
              t("borrowerProfile.edit.private.email.helperText")
            }
            {...registerPrivate("email")}
          />
        </EditProfileItem>
      </Box>

      <Box sx={ButtonsContainer}>
        <Button variant="text" size="large" onClick={handleCancel}>
          {t("borrowerProfile.edit.buttons.cancel")}
        </Button>

        {!token && (
          <Button
            variant="contained"
            size="large"
            onClick={() => login(address as string)}
          >
            {t("borrowerProfile.edit.buttons.login")}
          </Button>
        )}

        {!isLoading && (
          <Button
            variant="contained"
            size="large"
            sx={{ width: "156px" }}
            onClick={handleSendUpdate}
            disabled={
              arePublicInfoEqual ||
              !token ||
              !privateForm.formState.isValid ||
              !publicForm.formState.isValid
            }
          >
            {t("borrowerProfile.edit.buttons.confirm")}
          </Button>
        )}
      </Box>
    </Box>
  )
}
