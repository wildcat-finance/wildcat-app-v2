import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { pxToRem } from "@/theme/units"

import { ProfileNamePageBlockProps } from "./interface"
import {
  ProfileNamePageBlockButtonsContainer,
  ProfileNamePageBlockContainer,
  ProfileNamePageBlockDescription,
  ProfileNamePageBlockLinksContainer,
  ProfileNamePageBlockHeaderButton,
} from "./style"
import { EmptyAlert } from "../../../components/EmptyAlert"

export const ProfileNamePageBlock = ({
  avatar,
  name,
  alias,
  description,
  website,
  twitter,
  telegram,
  linkedin,
  marketsAmount,
  isExternal,
  isMobile,
}: ProfileNamePageBlockProps) => {
  const { t } = useTranslation()

  const hasNoMarkets = marketsAmount === 0
  const hasNoLinks = !(website || twitter || linkedin || telegram)
  const hasNoInformation = !description && hasNoLinks
  const showEmptyAlert =
    (hasNoMarkets && isExternal) || (hasNoInformation && !isExternal)

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

  const existingLinks = links.filter((link) => link.hasLink)

  if (isMobile)
    return (
      <Box sx={{ ...ProfileNamePageBlockContainer, alignItems: "center" }}>
        {avatar ? (
          <Image src={avatar} alt="avatar" width={42} height={42} />
        ) : (
          <SvgIcon sx={{ fontSize: pxToRem(42), marginBottom: "12px" }}>
            <Avatar />
          </SvgIcon>
        )}

        <Typography
          variant="mobH2"
          marginBottom={hasNoInformation ? "0px" : "12px"}
        >
          {alias || name}
        </Typography>

        {!hasNoLinks && (
          <Box
            sx={{
              ...ProfileNamePageBlockLinksContainer,
              marginBottom: description ? "16px" : "0px",
            }}
          >
            {existingLinks.map((link) => (
              // eslint-disable-next-line react/jsx-no-useless-fragment
              <Box key={link.url}>
                {link.hasLink && (
                  <Link href={link.url}>
                    <Button
                      size="small"
                      variant="outlined"
                      color="secondary"
                      sx={ProfileNamePageBlockHeaderButton}
                    >
                      {link.name}
                    </Button>
                  </Link>
                )}
              </Box>
            ))}
          </Box>
        )}

        {description && (
          <Typography
            variant="mobText2"
            textAlign="left"
            color={COLORS.santasGrey}
          >
            {description}
          </Typography>
        )}

        <EmptyAlert showAlert={hasNoMarkets} isExternal />
      </Box>
    )

  return (
    <Box
      sx={ProfileNamePageBlockContainer}
      alignItems={isExternal ? "center" : "flex-start"}
    >
      {avatar ? (
        <Image src={avatar} alt="avatar" width={48} height={48} />
      ) : (
        <SvgIcon sx={{ fontSize: pxToRem(48) }}>
          <Avatar />
        </SvgIcon>
      )}

      <Typography
        variant={isExternal ? "title2" : "title1"}
        marginTop={isExternal ? "20px" : "24px"}
      >
        {alias || name}
      </Typography>

      {description && (
        <Typography
          variant="text1"
          color={COLORS.santasGrey}
          textAlign={isExternal ? "center" : "start"}
          sx={ProfileNamePageBlockDescription}
        >
          {description}
        </Typography>
      )}

      <Box
        sx={ProfileNamePageBlockButtonsContainer}
        justifyContent={isExternal ? "center" : "space-between"}
        marginTop={hasNoLinks ? "0px" : "22px"}
      >
        <Box sx={ProfileNamePageBlockLinksContainer}>
          {existingLinks.map((link) => (
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

        {!isExternal && !showEmptyAlert && (
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
              {t("borrowerProfile.profile.buttons.edit")}
            </Button>
          </Link>
        )}
      </Box>

      <EmptyAlert showAlert={showEmptyAlert} isExternal={isExternal} />
    </Box>
  )
}
