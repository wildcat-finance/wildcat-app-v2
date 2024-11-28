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
import { useEditPrivateForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditPrivateForm"
import { useEditPublicForm } from "@/app/[locale]/borrower/profile/edit/hooks/useEditPublicForm"
import { useUpdateBorrowerProfile } from "@/app/[locale]/borrower/profile/edit/hooks/useUpdateBorrowerProfile"
import { mockedNaturesOptions } from "@/mocks/mocks"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

const mockPublicInfo = {
  legalName: undefined,
  description: undefined,
  founded: undefined,
  headquarters: undefined,
  website: undefined,
  twitter: undefined,
  linkedin: undefined,
}

const mockPrivateInfo = {
  jurisdiction: undefined,
  legalNature: undefined,
  address: undefined,
  email: undefined,
}

export default function EditProfile() {
  const publicForm = useEditPublicForm()
  const privateForm = useEditPrivateForm()

  const publicData = mockPublicInfo
  const privateData = mockPrivateInfo

  const router = useRouter()

  const { address } = useAccount()

  const { mutate } = useUpdateBorrowerProfile()

  const {
    getValues: getPublicValues,
    setValue: setPublicValue,
    register: registerPublic,
    formState: { errors: publicErrors },
    watch: publicWatch,
    reset: publicReset,
  } = publicForm

  const {
    getValues: getPrivateValues,
    setValue: setPrivateValue,
    register: registerPrivate,
    formState: { errors: privateErrors },
    watch: privateWatch,
    reset: privateReset,
  } = privateForm

  const publicInfo = {
    address: address as string,
    name: getPublicValues().legalName,
    description: getPublicValues().description,
    founded: getPublicValues().founded,
    headquarters: getPublicValues().headquarters,
    website: getPublicValues().website,
    twitter: getPublicValues().twitter,
    linkedin: getPublicValues().linkedin,
  }

  const [avatar, setAvatar] = useState<string | null>(null)

  const handleNatureSelect = (event: SelectChangeEvent<string | null>) => {
    setPrivateValue("legalNature", event.target.value?.toString() || "")
  }

  const handleSendUpdate = () => {
    mutate(publicInfo)
    router.push(ROUTES.borrower.profile)
    publicReset()
  }

  const handleCancel = () => {
    router.push(ROUTES.borrower.profile)
    publicReset()
    privateReset()
  }

  useEffect(() => {
    setPublicValue("legalName", publicData.legalName)
    setPublicValue("description", publicData.description)
    setPublicValue("founded", publicData.founded)
    setPublicValue("headquarters", publicData.headquarters)
    setPublicValue("website", publicData.website)
    setPublicValue("twitter", publicData.twitter)
    setPublicValue("linkedin", publicData.linkedin)

    // setValue("jurisdiction", profileData.jurisdiction)
    // setValue("legalNature", profileData.legalNature)
    // setValue("address", profileData.address)
    // setValue("email", profileData.email)
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
          form={publicForm}
          field="legalName"
          oldValue={publicData.legalName}
          newValue={publicWatch("legalName")}
        >
          <TextField
            fullWidth
            placeholder="Legal Name"
            error={Boolean(publicErrors.legalName)}
            helperText={publicErrors.legalName?.message}
            {...registerPublic("legalName")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Description"
          tooltip="TBD"
          form={publicForm}
          field="description"
          oldValue={publicData.description}
          newValue={publicWatch("description")}
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
            error={Boolean(publicErrors.description)}
            helperText={publicErrors.description?.message}
            {...registerPublic("description")}
            fullWidth
            multiline
          />
        </EditProfileItem>

        <EditProfileItem
          title="Founded"
          tooltip="TBD"
          form={publicForm}
          field="founded"
          oldValue={publicData.founded}
          newValue={publicWatch("founded")}
        >
          <TextField
            placeholder="Founded"
            fullWidth
            error={Boolean(publicErrors.founded)}
            helperText={publicErrors.founded?.message}
            {...registerPublic("founded")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Headquarters"
          tooltip="TBD"
          form={publicForm}
          field="headquarters"
          oldValue={publicData.headquarters}
          newValue={publicWatch("headquarters")}
        >
          <TextField
            placeholder="Headquarters"
            fullWidth
            error={Boolean(publicErrors.headquarters)}
            helperText={publicErrors.headquarters?.message}
            {...registerPublic("headquarters")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Website"
          tooltip="TBD"
          form={publicForm}
          field="website"
          oldValue={publicData.website}
          newValue={publicWatch("website")}
        >
          <TextField
            placeholder="Website"
            fullWidth
            error={Boolean(publicErrors.website)}
            helperText={publicErrors.website?.message}
            {...registerPublic("website")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Twitter"
          tooltip="TBD"
          form={publicForm}
          field="twitter"
          oldValue={publicData.twitter}
          newValue={publicWatch("twitter")}
        >
          <TextField
            placeholder="Twitter"
            fullWidth
            error={Boolean(publicErrors.twitter)}
            helperText={publicErrors.twitter?.message}
            {...registerPublic("twitter")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Linkedin"
          tooltip="TBD"
          form={publicForm}
          field="linkedin"
          oldValue={publicData.linkedin}
          newValue={publicWatch("linkedin")}
        >
          <TextField
            placeholder="Linkedin"
            fullWidth
            error={Boolean(publicErrors.linkedin)}
            helperText={publicErrors.linkedin?.message}
            {...registerPublic("linkedin")}
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
          form={privateForm}
          field="jurisdiction"
          oldValue={privateData.jurisdiction}
          newValue={privateWatch("jurisdiction")}
        >
          <TextField
            placeholder="Jurisdiction"
            fullWidth
            error={Boolean(privateErrors.jurisdiction)}
            helperText={privateErrors.jurisdiction?.message}
            {...registerPrivate("jurisdiction")}
          />
        </EditProfileItem>

        <SelectProfileItem
          title="Legal Nature"
          tooltip="TBD"
          form={privateForm}
          oldValue={privateData.legalNature}
          oldLabel={getLabelByValue(privateData.legalNature)}
          newValue={privateWatch("legalNature")}
          newLabel={getLabelByValue(privateWatch("legalNature"))}
        >
          <FormControl fullWidth>
            <InputLabel className="test">Legal Nature</InputLabel>
            <Select
              ref={selectRef}
              onOpen={onOpen}
              onClose={onClose}
              onChange={handleNatureSelect}
              value={getPrivateValues().legalNature}
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
          form={privateForm}
          field="address"
          oldValue={privateData.address}
          newValue={privateWatch("address")}
        >
          <TextField
            placeholder="Address"
            fullWidth
            error={Boolean(privateErrors.address)}
            helperText={privateErrors.address?.message}
            {...registerPrivate("address")}
          />
        </EditProfileItem>

        <EditProfileItem
          title="Email"
          tooltip="TBD"
          form={privateForm}
          field="email"
          oldValue={privateData.email}
          newValue={privateWatch("email")}
        >
          <TextField
            placeholder="Email"
            fullWidth
            error={Boolean(privateErrors.email)}
            helperText={privateErrors.email?.message}
            {...registerPrivate("email")}
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
