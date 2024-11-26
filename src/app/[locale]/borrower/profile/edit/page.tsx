"use client"

import * as React from "react"
import { useEffect, useState } from "react"

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

import { DropdownOption } from "@/app/[locale]/borrower/new-market/components/LegalInfoForm/style"
import { AvatarProfileItem } from "@/app/[locale]/borrower/profile/edit/components/AvatarProfileItem"
import { EditProfileItem } from "@/app/[locale]/borrower/profile/edit/components/EditProfileItem"
import { useEditProfileForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditProfileForm"
import { mockedNaturesOptions } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

const mockProfile = {
  legalName: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com",
  twitter: undefined,
  linkedin: "https://uk.linkedin.com/company/wintermute-trading",

  jurisdiction: "",
  legalNature: "",
  address: "",
  email: "",
}

export default function EditProfile() {
  const form = useEditProfileForm()
  const profileData = mockProfile
  const router = useRouter()

  const {
    getValues,
    setValue,
    register,
    formState: { errors, isValid },
    control,
    watch,
    reset,
  } = form

  const [avatar, setAvatar] = useState<string | null>(null)

  const handleNatureSelect = (event: SelectChangeEvent<string | null>) => {
    setValue("legalNature", event.target.value?.toString() || "")
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
  }, [])

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
            fullWidth
            error={Boolean(errors.jurisdiction)}
            helperText={errors.jurisdiction?.message}
            {...register("jurisdiction")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Legal Nature"
          tooltip="TBD"
          form={form}
          field="legalNature"
          oldValue={profileData.legalNature}
          newValue={watch("legalNature")}
        >
          <FormControl fullWidth>
            <InputLabel className="test">Legal Nature</InputLabel>
            <Select onChange={handleNatureSelect}>
              {mockedNaturesOptions.map((option) => (
                <MenuItem
                  key={option.id}
                  value={option.value}
                  sx={DropdownOption}
                >
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </EditProfileItem>

        <EditProfileItem
          title="Address"
          tooltip="TBD"
          form={form}
          field="address"
          oldValue={profileData.address}
          newValue={watch("address")}
        >
          <TextField
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

        <Button variant="contained" size="large" sx={{ width: "156px" }}>
          Confirm
        </Button>
      </Box>
    </Box>
  )
}
