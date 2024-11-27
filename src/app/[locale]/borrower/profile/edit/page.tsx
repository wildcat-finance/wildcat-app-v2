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
import { useAccount } from "wagmi"

import { AvatarProfileItem } from "@/app/[locale]/borrower/profile/edit/components/AvatarProfileItem"
import { EditProfileItem } from "@/app/[locale]/borrower/profile/edit/components/EditProfileItem"
import { SelectProfileItem } from "@/app/[locale]/borrower/profile/edit/components/SelectProfileItem"
import { useEditProfileForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditProfileForm"
import { useUpdateBorrowerProfile } from "@/app/[locale]/borrower/profile/edit/hooks/useUpdateBorrowerProfile"
import { mockedNaturesOptions } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

const mockProfile = {
  legalName: undefined,
  description: undefined,
  founded: undefined,
  headquarters: undefined,
  website: undefined,
  twitter: undefined,
  linkedin: undefined,

  jurisdiction: undefined,
  legalNature: undefined,
  address: undefined,
  email: undefined,
}

export default function EditProfile() {
  const form = useEditProfileForm()
  const profileData = mockProfile
  const router = useRouter()

  const { address } = useAccount()

  const { mutate } = useUpdateBorrowerProfile()

  const {
    getValues,
    setValue,
    register,
    formState: { errors, isValid },
    watch,
    reset,
  } = form

  const profileInfo = {
    address: address as string,
    name: getValues().legalName,
    description: getValues().description,
    founded: getValues().founded,
    headquarters: getValues().headquarters,
    website: getValues().website,
    twitter: getValues().twitter,
    linkedin: getValues().linkedin,
  }

  const [avatar, setAvatar] = useState<string | null>(null)

  const handleNatureSelect = (event: SelectChangeEvent<string | null>) => {
    setValue("legalNature", event.target.value?.toString() || "")
  }

  const handleSendUpdate = () => {
    mutate(profileInfo)
    router.push(ROUTES.borrower.profile)
    reset()
  }

  const handleCancel = () => {
    router.push(ROUTES.borrower.profile)
    reset()
  }

  useEffect(() => {
    setValue("legalName", profileData.legalName)
    setValue("description", profileData.description)
    setValue("founded", profileData.founded)
    setValue("headquarters", profileData.headquarters)
    setValue("website", profileData.website)
    setValue("twitter", profileData.twitter)
    setValue("linkedin", profileData.linkedin)

    setValue("jurisdiction", profileData.jurisdiction)
    setValue("legalNature", profileData.legalNature)
    setValue("address", profileData.address)
    setValue("email", profileData.email)
  }, [])

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
    <Box
      sx={{
        height: "calc(100vh - 43px - 43px - 52px)",
        overflow: "scroll",
        padding: "52px 20px 0 44px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "32px",
        }}
      >
        <Typography variant="title1">Public Info</Typography>
        <Typography variant="text2" color={COLORS.santasGrey}>
          This info can be viewed by other users including lenders
        </Typography>
      </Box>

      <AvatarProfileItem avatar={avatar} setAvatar={setAvatar} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "36px",
          marginTop: "32px",
        }}
      >
        <EditProfileItem
          title="Legal Name"
          tooltip="TBD"
          form={form}
          field="legalName"
          oldValue={profileData.legalName}
          newValue={watch("legalName")}
        >
          <TextField
            fullWidth
            placeholder="Legal Name"
            error={Boolean(errors.legalName)}
            helperText={errors.legalName?.message}
            {...register("legalName")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Description"
          tooltip="TBD"
          form={form}
          field="description"
          oldValue={profileData.description}
          newValue={watch("description")}
        >
          <TextField
            placeholder="Description"
            sx={{
              "&.MuiFormControl-root.MuiTextField-root": {
                height: "fit-content",
              },

              "& .MuiFilledInput-root": {
                padding: "16px !important",
              },

              "& .MuiInputBase-input": {
                padding: "0 !important",
              },
            }}
            error={Boolean(errors.description)}
            helperText={errors.description?.message}
            {...register("description")}
            fullWidth
            multiline
          />
        </EditProfileItem>

        <EditProfileItem
          title="Founded"
          tooltip="TBD"
          form={form}
          field="founded"
          oldValue={profileData.founded}
          newValue={watch("founded")}
        >
          <TextField
            placeholder="Founded"
            fullWidth
            error={Boolean(errors.founded)}
            helperText={errors.founded?.message}
            {...register("founded")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Headquarters"
          tooltip="TBD"
          form={form}
          field="headquarters"
          oldValue={profileData.headquarters}
          newValue={watch("headquarters")}
        >
          <TextField
            placeholder="Headquarters"
            fullWidth
            error={Boolean(errors.headquarters)}
            helperText={errors.headquarters?.message}
            {...register("headquarters")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Website"
          tooltip="TBD"
          form={form}
          field="website"
          oldValue={profileData.website}
          newValue={watch("website")}
        >
          <TextField
            placeholder="Website"
            fullWidth
            error={Boolean(errors.website)}
            helperText={errors.website?.message}
            {...register("website")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Twitter"
          tooltip="TBD"
          form={form}
          field="twitter"
          oldValue={profileData.twitter}
          newValue={watch("twitter")}
        >
          <TextField
            placeholder="Twitter"
            fullWidth
            error={Boolean(errors.twitter)}
            helperText={errors.twitter?.message}
            {...register("twitter")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Linkedin"
          tooltip="TBD"
          form={form}
          field="linkedin"
          oldValue={profileData.linkedin}
          newValue={watch("linkedin")}
        >
          <TextField
            placeholder="Linkedin"
            fullWidth
            error={Boolean(errors.linkedin)}
            helperText={errors.linkedin?.message}
            {...register("linkedin")}
          />
        </EditProfileItem>
      </Box>

      <Divider sx={{ width: "60.8%", margin: "40px 0" }} />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "8px",
          marginBottom: "32px",
        }}
      >
        <Typography variant="title1">Private Info</Typography>
        <Typography variant="text2" color={COLORS.santasGrey}>
          In case you want join to the Market with MLA you should share your
          legal info
        </Typography>
      </Box>

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "36px",
        }}
      >
        <EditProfileItem
          title="Jurisdiction"
          tooltip="TBD"
          form={form}
          field="jurisdiction"
          oldValue={profileData.jurisdiction}
          newValue={watch("jurisdiction")}
        >
          <TextField
            placeholder="Jurisdiction"
            fullWidth
            error={Boolean(errors.jurisdiction)}
            helperText={errors.jurisdiction?.message}
            {...register("jurisdiction")}
          />
        </EditProfileItem>

        <SelectProfileItem
          title="Legal Nature"
          tooltip="TBD"
          form={form}
          oldValue={profileData.legalNature}
          oldLabel={getLabelByValue(profileData.legalNature)}
          newValue={watch("legalNature")}
          newLabel={getLabelByValue(watch("legalNature"))}
        >
          <FormControl fullWidth>
            <InputLabel className="test">Legal Nature</InputLabel>
            <Select
              ref={selectRef}
              onOpen={onOpen}
              onClose={onClose}
              onChange={handleNatureSelect}
              value={getValues().legalNature}
              MenuProps={{
                sx: {
                  "& .MuiPaper-root": {
                    width: "47.5%",
                  },
                },
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
          title="Address"
          tooltip="TBD"
          form={form}
          field="address"
          oldValue={profileData.address}
          newValue={watch("address")}
        >
          <TextField
            placeholder="Address"
            fullWidth
            error={Boolean(errors.address)}
            helperText={errors.address?.message}
            {...register("address")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Email"
          tooltip="TBD"
          form={form}
          field="email"
          oldValue={profileData.email}
          newValue={watch("email")}
        >
          <TextField
            placeholder="Email"
            fullWidth
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            {...register("email")}
          />
        </EditProfileItem>
      </Box>

      <Box
        sx={{
          marginTop: "40px",
          width: "60.8%",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <Button variant="text" size="large" onClick={handleCancel}>
          Cancel
        </Button>

        <Button
          variant="contained"
          size="large"
          sx={{ width: "156px" }}
          onClick={handleSendUpdate}
        >
          Confirm
        </Button>
      </Box>
    </Box>
  )
}
