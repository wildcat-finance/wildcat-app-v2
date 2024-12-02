import * as React from "react"
import { ReactNode } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import { ProfileHeaderButton } from "@/app/[locale]/borrower/profile/style"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type NameSectionProps = {
  avatar?: ReactNode
  name?: string
  description?: string
  website?: string
  twitter?: string
  linkedin?: string

  type: "user" | "external"
}

export const NameSection = ({
  avatar,
  name,
  description,
  website,
  twitter,
  linkedin,
  type,
}: NameSectionProps) => {
  const a = ""

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: type === "user" ? "flex-start" : "center",
      }}
    >
      {avatar || (
        <SvgIcon sx={{ fontSize: "48px", marginBottom: "24px" }}>
          <Avatar />
        </SvgIcon>
      )}

      <Typography variant="title1" sx={{ marginBottom: "12px" }}>
        {name}
      </Typography>

      <Typography
        variant="text2"
        textAlign={type === "user" ? "left" : "center"}
        color={COLORS.santasGrey}
        sx={{
          display: "inline-block",
          maxWidth: "586px",
          marginBottom: "22px",
        }}
      >
        {description}
      </Typography>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: type === "user" ? "space-between" : "center",
        }}
      >
        <Box display="flex" gap="6px">
          {website && (
            <Link href={website} target="_blank">
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={ProfileHeaderButton}
              >
                Website
              </Button>
            </Link>
          )}

          {twitter && (
            <Link href={twitter} target="_blank">
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={ProfileHeaderButton}
              >
                Twitter
              </Button>
            </Link>
          )}

          {linkedin && (
            <Link href={linkedin} target="_blank">
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={ProfileHeaderButton}
              >
                Linkedin
              </Button>
            </Link>
          )}
        </Box>

        {type === "user" && (
          <Link href={ROUTES.borrower.editProfile}>
            <Button variant="text" size="small" sx={{ gap: "4px" }}>
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
              Edit Profile
            </Button>
          </Link>
        )}
      </Box>
    </Box>
  )
}
