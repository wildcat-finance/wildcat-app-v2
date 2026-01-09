import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  ComponentContainer,
  DescriptionContainer,
  LinksContainer,
} from "@/app/[locale]/borrower/profile/components/NameSection/style"
import { ProfileHeaderButton } from "@/app/[locale]/borrower/profile/style"
import Avatar from "@/assets/icons/avatar_icon.svg"
import { COLORS } from "@/theme/colors"

import { NameSectionProps } from "./interface"
import { EmptyAlert } from "../EmptyAlert"

export const NameSection = ({
  avatar,
  name,
  alias,
  description,
  website,
  twitter,
  linkedin,
  telegram,
  marketsAmount,
  type,
}: NameSectionProps) => {
  const { t } = useTranslation()

  return (
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

      <Typography variant="title1">{alias || name}</Typography>

      {type === "user" &&
        !(description || website || twitter || linkedin || telegram) && (
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

      <Box
        sx={{
          ...LinksContainer,
          justifyContent: type === "user" ? "space-between" : "center",
        }}
      >
        <Box display="flex" gap="6px">
          {website && (
            <Link
              href={website.startsWith("http") ? website : `https://${website}`}
              target="_blank"
            >
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={ProfileHeaderButton}
              >
                {t("borrowerProfile.profile.buttons.website")}
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
                {t("borrowerProfile.profile.buttons.twitter")}
              </Button>
            </Link>
          )}

          {telegram && (
            <Link href={`https://t.me/${telegram}`} target="_blank">
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={ProfileHeaderButton}
              >
                {t("borrowerProfile.profile.buttons.telegram")}
              </Button>
            </Link>
          )}

          {linkedin && (
            <Link
              href={`https://www.linkedin.com/company/${linkedin}`}
              target="_blank"
            >
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                sx={ProfileHeaderButton}
              >
                {t("borrowerProfile.profile.buttons.linkedin")}
              </Button>
            </Link>
          )}
        </Box>
      </Box>

      {type === "external" && marketsAmount === 0 && (
        <EmptyAlert
          type="external"
          alertText={t(
            "borrowerProfile.profile.emptyStates.external.noMarkets",
          )}
          marginTop="32px"
        />
      )}
    </Box>
  )
}
