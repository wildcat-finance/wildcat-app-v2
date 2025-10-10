import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import Image from "next/image"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import {
  ComponentContainer,
  DescriptionContainer,
  LinksContainer,
} from "@/app/[locale]/borrower/profile/components/NameSection/style"
import { ProfileHeaderButton } from "@/app/[locale]/borrower/profile/style"
import Avatar from "@/assets/icons/avatar_icon.svg"
import Edit from "@/assets/icons/edit_icon.svg"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { ROUTES } from "@/routes"
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
  isMarketPage,
}: NameSectionProps) => {
  const { t } = useTranslation()

  const isMobile = useMobileResolution()

  if (isMobile)
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {avatar ? (
          <Image src={avatar} alt="avatar" width={42} height={42} />
        ) : (
          <SvgIcon sx={{ fontSize: "42px", marginBottom: "12px" }}>
            <Avatar />
          </SvgIcon>
        )}

        <Typography
          variant="mobH2"
          mb={
            !(description || website || twitter || linkedin || telegram)
              ? "0px"
              : "12px"
          }
        >
          {alias || name}
        </Typography>

        {(website || twitter || linkedin || telegram) && (
          <Box display="flex" gap="6px" mb={description ? "16px" : "0px"}>
            {website && (
              <Link
                href={
                  website.startsWith("http") ? website : `https://${website}`
                }
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

        {marketsAmount === 0 && (
          <EmptyAlert
            type="external"
            alertText={t(
              "borrowerProfile.profile.emptyStates.external.noMarkets",
            )}
            marginTop="12px"
          />
        )}
      </Box>
    )

  return (
    <Box
      sx={{
        ...ComponentContainer,
        alignItems: type === "user" || isMarketPage ? "flex-start" : "center",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: isMarketPage ? "row" : "column",
          alignItems: "center",
          gap: isMarketPage ? "16px" : "24px",
        }}
      >
        {avatar ? (
          <Image src={avatar} alt="avatar" width={48} height={48} />
        ) : (
          <SvgIcon sx={{ fontSize: "48px" }}>
            <Avatar />
          </SvgIcon>
        )}

        <Typography variant={isMarketPage ? "title3" : "title1"}>
          {alias || name}
        </Typography>
      </Box>

      {type === "user" &&
        !(description || website || twitter || linkedin || telegram) && (
          <EmptyAlert type="user" marginTop="32px" />
        )}

      {description && (
        <Typography
          variant="text1"
          textAlign={type === "user" || isMarketPage ? "left" : "center"}
          color={COLORS.blackRock}
          sx={DescriptionContainer}
        >
          {description}
        </Typography>
      )}

      <Box
        sx={{
          ...LinksContainer,
          marginTop: !(website || twitter || linkedin || telegram) ? 0 : "22px",
          justifyContent:
            type === "user" || isMarketPage ? "space-between" : "center",
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
              {t("borrowerProfile.profile.buttons.edit")}
            </Button>
          </Link>
        )}
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
