import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Avatar from "@/assets/icons/avatar_icon.svg"
import { COLORS } from "@/theme/colors"
import { pxToRem } from "@/theme/units"

import { ProfileSectionNameBlockProps } from "./interface"
import {
  ProfileNameSectionAvatarNameContainer,
  ProfileNameSectionButtonsContainer,
  ProfileNameSectionDescription,
  ProfileSectionNameContainer,
  ProfileSectionNameDivider,
} from "./style"

export const ProfileSectionNameBlock = ({
  avatar,
  name,
  alias,
  description,
  website,
  twitter,
  telegram,
  linkedin,
}: ProfileSectionNameBlockProps) => {
  const { t } = useTranslation()

  const links = [
    {
      name: t("borrowerProfile.profile.buttons.website"),
      hasLink: !!website,
      url:
        website && website.startsWith("http") ? website : `https://${website}`,
    },
    {
      name: t("borrowerProfile.profile.buttons.twitter"),
      hasLink: !!twitter,
      url: `https://x.com/${twitter}`,
    },
    {
      name: t("borrowerProfile.profile.buttons.telegram"),
      hasLink: !!telegram,
      url: `https://t.me/${telegram}`,
    },
    {
      name: t("borrowerProfile.profile.buttons.linkedin"),
      hasLink: !!linkedin,
      url: `https://www.linkedin.com/company/${linkedin}`,
    },
  ]

  const hasNoLinks = !(website || twitter || linkedin || telegram)

  return (
    <Box sx={ProfileSectionNameContainer}>
      <Divider sx={ProfileSectionNameDivider} />

      <Box
        sx={{
          ...ProfileNameSectionAvatarNameContainer,
          marginBottom: description ? "16px" : 0,
        }}
      >
        {avatar ? (
          <Image src={avatar} alt="avatar" width={44} height={44} />
        ) : (
          <SvgIcon sx={{ fontSize: pxToRem(44) }}>
            <Avatar />
          </SvgIcon>
        )}

        <Typography variant="title3">{alias || name}</Typography>
      </Box>

      {description && (
        <Typography
          variant="text1"
          color={COLORS.santasGrey}
          sx={{
            ...ProfileNameSectionDescription,
            marginBottom: hasNoLinks ? 0 : "20px",
          }}
        >
          {description}
        </Typography>
      )}

      <Box sx={ProfileNameSectionButtonsContainer}>
        {links.map((link) => (
          // eslint-disable-next-line react/jsx-no-useless-fragment
          <Box key={link.url}>
            {link.hasLink && (
              <Link href={link.url}>
                <Button size="small" variant="outlined" color="secondary">
                  {link.name}
                </Button>
              </Link>
            )}
          </Box>
        ))}
      </Box>
    </Box>
  )
}
