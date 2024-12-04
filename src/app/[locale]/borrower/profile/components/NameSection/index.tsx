import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import {
  ComponentContainer,
  DescriptionContainer,
  LinksContainer,
} from "@/app/[locale]/borrower/profile/components/NameSection/style"
import { ProfileHeaderButton } from "@/app/[locale]/borrower/profile/style"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

import { NameSectionProps } from "./interface"
import { EmptyAlert } from "../EmptyAlert"

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
      ...ComponentContainer,
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
        sx={DescriptionContainer}
      >
        {description}
      </Typography>
    )}

    {(website || twitter || linkedin) && (
      <Box
        sx={{
          ...LinksContainer,
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
