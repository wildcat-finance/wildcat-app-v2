import * as React from "react"

import { Box, Button, Skeleton, SvgIcon, Typography } from "@mui/material"
import Image from "next/image"

import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"

export type AvatarProfileItemProps = {
  avatar: string | null
  setAvatar: React.Dispatch<React.SetStateAction<string | null>>
  isLoading: boolean
}

export const AvatarProfileItem = ({
  avatar,
  setAvatar,
  isLoading,
}: AvatarProfileItemProps) => {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        if (reader.result) {
          setAvatar(reader.result as string)
        }
      }
      reader.readAsDataURL(file)
    }
  }

  const triggerFileInput = () => {
    document.getElementById("avatar-input")?.click()
  }

  return (
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
        {isLoading && (
          <Skeleton
            height="64px"
            width="64px"
            sx={{
              bgcolor: COLORS.athensGrey,
              borderRadius: "50%",
            }}
          />
        )}
        {!isLoading && (
          <Box sx={{ display: "flex", gap: "12px", alignItems: "center" }}>
            {avatar ? (
              <Image
                src={avatar}
                alt="Avatar"
                width={64}
                height={64}
                style={{
                  borderRadius: "50%",
                }}
              />
            ) : (
              <SvgIcon sx={{ fontSize: "64px" }}>
                <Avatar />
              </SvgIcon>
            )}

            {!avatar && (
              <Typography variant="text4" color="#A0A0A0">
                Automatically Generated
              </Typography>
            )}
          </Box>
        )}

        {!isLoading && (
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
            onClick={triggerFileInput}
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
        )}

        <input
          id="avatar-input"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleFileChange}
        />
      </Box>
    </Box>
  )
}
