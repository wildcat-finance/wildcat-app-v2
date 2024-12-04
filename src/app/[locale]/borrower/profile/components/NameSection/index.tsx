import * as React from "react"
import { ReactNode } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import { ProfileHeaderButton } from "@/app/[locale]/borrower/profile/style"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { EmptyAlert } from "../EmptyAlert"

export type NameSectionProps = {
  avatar?: ReactNode
  name?: string
  description?: string
  website?: string
  twitter?: string
  linkedin?: string
  marketsAmount?: number

  type: "user" | "external"
}

export const NameSection = ({
  avatar,
  name,
  description,
  website,
  twitter,
  linkedin,
  marketsAmount,
  type,
}: NameSectionProps) => (
  <Box
    sx={{
      height: "fit-content",
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

    <Typography variant="title1">{name}</Typography>

    {type === "user" && !(description || website || twitter || linkedin) && (
      <EmptyAlert type="user" marginTop="32px" />
    )}

    {description && (
      <Typography
        variant="text2"
        textAlign={type === "user" ? "left" : "center"}
        color={COLORS.santasGrey}
        sx={{
          display: "inline-block",
          maxWidth: "586px",
          marginTop: "12px",
        }}
      >
        {description}
      </Typography>
    )}

    {(website || twitter || linkedin) && (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: type === "user" ? "space-between" : "center",
          marginTop: "22px",
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
            <Link href={`https://x.com/${twitter}`} target="_blank">
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

        {type === "user" && (description || website || twitter || linkedin) && (
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
    )}

    {type === "external" && marketsAmount === 0 && (
      <EmptyAlert
        type="external"
        alertText="This Borrower doesn’t have any markets."
        marginTop="32px"
      />
    )}
  </Box>
)
