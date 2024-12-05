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
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { AvatarProfileItem } from "@/app/[locale]/borrower/profile/edit/components/AvatarProfileItem"
import { EditProfileItem } from "@/app/[locale]/borrower/profile/edit/components/EditProfileItem"
import { SelectProfileItem } from "@/app/[locale]/borrower/profile/edit/components/SelectProfileItem"
import { useEditPrivateForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditPrivateForm"
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
import { mockedNaturesOptions } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export default function EditProfile() {
  const router = useRouter()
  const { t } = useTranslation()

  const publicForm = useEditPublicForm()
  const privateForm = useEditPrivateForm()

  const { address } = useAccount()
  const { data: publicData, isLoading: isPublicDataLoading } =
    useGetBorrowerProfile(address)
  const invalidateBorrowerProfile = useInvalidateBorrowerProfile(address)

  const isLoading = isPublicDataLoading

  const { mutate } = useUpdateBorrowerProfile()

  const [avatar, setAvatar] = useState<string | undefined>(undefined)

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
    legalNature: getPrivateValues().legalNature,
    companyAddress: getPrivateValues().companyAddress,
    email: getPrivateValues().email,
  }

  function excludeKeys(
    obj: BorrowerProfile | undefined,
    keysToExclude: string[],
  ) {
    if (obj) {
      return Object.fromEntries(
        Object.entries(obj).filter(([key]) => !keysToExclude.includes(key)),
      )
    }

    return true
  }

  const arePublicInfoEqual =
    JSON.stringify(publicInfo) ===
    JSON.stringify(excludeKeys(publicData, ["updatedAt"]))

  const handleNatureSelect = (event: SelectChangeEvent<string | null>) => {
    setPrivateValue("legalNature", event.target.value?.toString() || "")
  }

  const handleSendUpdate = () => {
    mutate(
      {
        ...publicData,
        ...publicInfo,
      },
      {
        onSuccess: () => {
          invalidateBorrowerProfile()
          router.push(ROUTES.borrower.profile)
        },
        onError: (error) => {
          console.error(error)
        },
      },
    )
  }

  const handleCancel = () => {
    router.push(ROUTES.borrower.profile)
  }

  useEffect(() => {
    setPublicValue("legalName", publicData?.name || "")
    setPublicValue("description", publicData?.description)
    setPublicValue("founded", publicData?.founded)
    setPublicValue("headquarters", publicData?.headquarters)
    setPublicValue("website", publicData?.website)
    setPublicValue("twitter", publicData?.twitter)
    setPublicValue("linkedin", publicData?.linkedin)

    setPrivateValue("jurisdiction", publicData?.jurisdiction)
    setPrivateValue("legalNature", publicData?.legalNature)
    setPrivateValue("companyAddress", publicData?.companyAddress)
    setPrivateValue("email", publicData?.email)
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
            helperText={publicErrors.legalName?.message}
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
          />
        </EditProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.public.headquarters.title")}
          tooltip={t("borrowerProfile.edit.public.headquarters.tooltip")}
          form={publicForm}
          field="headquarters"
          oldValue={publicData?.headquarters}
          newValue={publicWatch("headquarters")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t(
              "borrowerProfile.edit.public.headquarters.placeholder",
            )}
            fullWidth
            error={Boolean(publicErrors.headquarters)}
            helperText={publicErrors.headquarters?.message}
            {...registerPublic("headquarters")}
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
        <EditProfileItem
          title={t("borrowerProfile.edit.private.jurisdiction.title")}
          tooltip={t("borrowerProfile.edit.private.jurisdiction.tooltip")}
          form={privateForm}
          field="jurisdiction"
          oldValue={publicData?.jurisdiction}
          newValue={privateWatch("jurisdiction")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t(
              "borrowerProfile.edit.private.jurisdiction.placeholder",
            )}
            fullWidth
            error={Boolean(privateErrors.jurisdiction)}
            helperText={privateErrors.jurisdiction?.message}
            {...registerPrivate("jurisdiction")}
          />
        </EditProfileItem>

        <SelectProfileItem
          title={t("borrowerProfile.edit.private.nature.title")}
          tooltip={t("borrowerProfile.edit.private.nature.tooltip")}
          form={privateForm}
          oldValue={publicData?.legalNature}
          oldLabel={getLabelByValue(publicData?.legalNature)}
          newValue={privateWatch("legalNature")}
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
              value={privateWatch("legalNature")}
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
              {mockedNaturesOptions.map((option) => (
                <MenuItem
                  key={option.id}
                  value={option.value}
                  sx={{ width: "100%" }}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </SelectProfileItem>

        <EditProfileItem
          title={t("borrowerProfile.edit.private.address.title")}
          tooltip={t("borrowerProfile.edit.private.address.tooltip")}
          form={privateForm}
          field="companyAddress"
          oldValue={publicData?.companyAddress}
          newValue={privateWatch("companyAddress")}
          isLoading={isLoading}
        >
          <TextField
            placeholder={t("borrowerProfile.edit.private.address.placeholder")}
            fullWidth
            error={Boolean(privateErrors.companyAddress)}
            helperText={privateErrors.companyAddress?.message}
            {...registerPrivate("companyAddress")}
          />
        </EditProfileItem>

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
            helperText={privateErrors.email?.message}
            {...registerPrivate("email")}
          />
        </EditProfileItem>
      </Box>

      <Box sx={ButtonsContainer}>
        <Button variant="text" size="large" onClick={handleCancel}>
          {t("borrowerProfile.edit.buttons.cancel")}
        </Button>

        {!isLoading && (
          <Button
            variant="contained"
            size="large"
            sx={{ width: "156px" }}
            onClick={handleSendUpdate}
            disabled={arePublicInfoEqual}
          >
            {t("borrowerProfile.edit.buttons.confirm")}
          </Button>
        )}
      </Box>
    </Box>
  )
}
