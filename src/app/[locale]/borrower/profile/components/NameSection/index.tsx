import * as React from "react"
import { ReactNode } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"

import { EmptyAlert } from "@/app/[locale]/borrower/profile/components/UserEmptyAlert"
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
  headquarters?: string
  founded?: string
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
  headquarters,
  founded,
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

    {type === "external" &&
      !(
        description ||
        website ||
        twitter ||
        linkedin ||
        headquarters ||
        founded
      ) && (
        <EmptyAlert
          type="external"
          marginTop="32px"
          alertText={
            marketsAmount !== 0
              ? "This Borrower doesn’t have any info yet."
              : "This Borrower doesn’t have any markets or info yet."
          }
        />
      )}

    {type === "external" &&
      !(marketsAmount !== 0) &&
      (description ||
        website ||
        twitter ||
        linkedin ||
        headquarters ||
        founded) && (
        <EmptyAlert
          type="external"
          marginTop="32px"
          alertText="This Borrower doesn’t have any markets yet."
        />
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
  </Box>
)
