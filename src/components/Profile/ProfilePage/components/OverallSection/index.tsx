import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { ParametersItem } from "@/components/ParametersItem"
import ELFsByCountry from "@/config/elfs-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { trimAddress } from "@/utils/formatters"

import { OverallSectionProps, ProfileItem } from "./interface"
import {
  InfoColumn,
  InfoContainer,
  InfoDivider,
  MobileInfoContainer,
  MobileInfoDivider,
  MobileInfoGrid,
} from "./style"

const makeInformationItem = (
  title: string,
  value: string | number | undefined,
  opts?: {
    tooltipText?: string
    link?: string
    copy?: string
  },
): ProfileItem => ({
  title,
  value,
  tooltipText: opts?.tooltipText,
  link: opts?.link,
  copy: opts?.copy,
})

export const OverallSection = ({
  address,
  name,
  alias,
  founded,
  jurisdiction,
  entityKind,
  additionalUrls,
  marketsAmount,
  defaults,
  isPage,
}: OverallSectionProps) => {
  const { t } = useTranslation()
  const { getAddressUrl } = useBlockExplorer()
  const isMobile = useMobileResolution()

  const jurisdictionObj =
    jurisdiction !== undefined
      ? Jurisdictions[jurisdiction as keyof typeof Jurisdictions]
      : undefined
  const jurisdictionText = jurisdictionObj?.countryName

  const entityKindText =
    entityKind !== undefined && jurisdictionObj
      ? ELFsByCountry[
          jurisdictionObj.countryCode as keyof typeof ELFsByCountry
        ].find((elf) => elf.elfCode === entityKind)?.name
      : undefined

  const normalizedMarkets =
    marketsAmount !== undefined ? String(marketsAmount) : "0"

  const normalizedDefaults = defaults !== undefined ? String(defaults) : "0"

  const profileInfo: ProfileItem[] = [
    makeInformationItem(t("borrowerProfile.profile.overallInfo.name"), name),
    makeInformationItem(t("borrowerProfile.profile.overallInfo.alias"), alias),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.address"),
      address ? trimAddress(address) : undefined,
      {
        link: address ? getAddressUrl(address) : undefined,
        copy: address,
      },
    ),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.headquarters"),
      jurisdictionText,
    ),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.entityKind"),
      entityKindText,
    ),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.founded"),
      founded,
    ),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.markets"),
      normalizedMarkets,
    ),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.borrowed"),
      "[Coming Soon]",
    ),
    makeInformationItem(
      t("borrowerProfile.profile.overallInfo.defaults.title"),
      normalizedDefaults,
      {
        tooltipText: t("borrowerProfile.profile.overallInfo.defaults.tooltip"),
      },
    ),
    ...(additionalUrls ?? []).map((url) =>
      makeInformationItem(url.label, url.url, {
        link: url.url,
      }),
    ),
  ]

  const existingData = profileInfo.filter(
    (item) => item.value !== undefined && item.value !== "",
  )
  const midpoint = Math.ceil(existingData.length / 2)
  const leftColumn = existingData.slice(0, midpoint)
  const rightColumn = existingData.slice(midpoint)

  if (isMobile)
    return (
      <Box sx={MobileInfoContainer}>
        <Typography variant="mobH3" marginTop="12px">
          {t("borrowerProfile.profile.overallInfo.title")}
        </Typography>
        <Box sx={MobileInfoGrid}>
          {existingData.map((item, index) => (
            <Box key={`mobile-${item.title}`}>
              <ParametersItem
                title={item.title}
                value={item.value || ""}
                tooltipText={item.tooltipText}
                link={item.link}
                copy={item.copy}
              />

              {index < existingData.length - 1 && (
                <Divider sx={MobileInfoDivider} />
              )}
            </Box>
          ))}
        </Box>
      </Box>
    )

  return (
    <Box>
      <Typography variant={isPage ? "title3" : "text2Highlighted"}>
        {t("borrowerProfile.profile.overallInfo.title")}
      </Typography>

      <Box sx={{ ...InfoContainer, marginTop: isPage ? "24px" : "16px" }}>
        <Box sx={InfoColumn}>
          {leftColumn.map((item) => (
            <Box key={`left-${item.title}`}>
              <ParametersItem
                title={item.title}
                value={item.value || ""}
                tooltipText={item.tooltipText}
                link={item.link}
                copy={item.copy}
              />
              <Divider sx={InfoDivider} />
            </Box>
          ))}
        </Box>

        <Box sx={InfoColumn}>
          {rightColumn.map((item) => (
            <Box key={`right-${item.title}`}>
              <ParametersItem
                title={item.title}
                value={item.value || ""}
                tooltipText={item.tooltipText}
                link={item.link}
                copy={item.copy}
              />
              <Divider sx={InfoDivider} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
