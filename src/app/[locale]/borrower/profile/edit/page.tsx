"use client"

import * as React from "react"
import { useEffect } from "react"

import { Box, Button, SvgIcon, TextField, Typography } from "@mui/material"

import { EditProfileItem } from "@/app/[locale]/borrower/profile/edit/components/EditProfileItem"
import { useEditProfileForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditProfileForm"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

const mockProfile = {
  legalName: "Wintermute LLC",
  description:
    "– leading global algorithmic trading firm and one of the largest players in digital asset markets. With an average daily trading volume of over $5bn.",
  founded: "2017",
  headquarters: "London",
  website: "https://wintermute.com",
  twitter: "https://x.com/wintermute_t",
  linkedin: "https://uk.linkedin.com/company/wintermute-trading",
}

export default function EditProfile() {
  const form = useEditProfileForm()
  const profileData = mockProfile

  const {
    getValues,
    setValue,
    register,
    formState: { errors, isValid },
    control,
    watch,
  } = form

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

      <Box
        sx={{
          width: "60.8%",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <Typography variant="text3">Avatar</Typography>
          <TooltipButton value="TBD" />
        </Box>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Box sx={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <SvgIcon sx={{ fontSize: "64px" }}>
              <Avatar />
            </SvgIcon>

            <Typography variant="text4" color={COLORS.santasGrey}>
              Automatically Generated
            </Typography>
          </Box>

          <Button
            variant="text"
            size="small"
            sx={{
              gap: "4px",
              alignItems: "center",
              padding: 0,
              minWidth: "fit-content",
              width: "fit-content",
              "&:hover": {
                boxShadow: "none",
                backgroundColor: "transparent",
              },
            }}
          >
            <SvgIcon
              fontSize="medium"
              sx={{
                "& path": {
                  fill: `${COLORS.greySuit}`,
                  transition: "fill 0.2s",
                },
              }}
            >
              <Edit />
            </SvgIcon>
            Change Image
          </Button>
        </Box>
      </Box>

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
    </Box>
  )
}
