import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { ParametersItem } from "@/components/ParametersItem"
import Jurisdictions from "@/config/jurisdictions.json"
import { useBlockExplorer } from "@/hooks/useBlockExplorer"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { trimAddress } from "@/utils/formatters"

import { OverallBlockProps, ProfileItem } from "./interface"
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
    verified?: boolean
  },
): ProfileItem => ({
  title,
  value,
  tooltipText: opts?.tooltipText,
  link: opts?.link,
  copy: opts?.copy,
  verified: opts?.verified,
})

export const OverallBlock = ({
  address,
  name,
  alias,
  founded,
  jurisdiction,
  entityKind,
  entityKindName,
  additionalUrls,
  marketsAmount,
  externalChainId,
  defaults,
  borrowed,
  extraItems,
  isPage,
}: OverallBlockProps) => {
  const { t } = useTranslation()
  const { getAddressUrl } = useBlockExplorer({ chainId: externalChainId })
  const isMobile = useMobileResolution()

  const jurisdictionObj =
    jurisdiction !== undefined
      ? Jurisdictions[jurisdiction as keyof typeof Jurisdictions]
      : undefined
  const jurisdictionText = jurisdictionObj?.countryName

  const entityKindText = entityKindName ?? entityKind

  const normalizedMarkets =
    marketsAmount !== undefined ? String(marketsAmount) : "0"

  const normalizedDefaults = defaults !== undefined ? String(defaults) : "—"

  const profileInfo: ProfileItem[] = [
    makeInformationItem(t("common.fields.legalName"), name, {
      verified: true,
    }),
    makeInformationItem(t("common.fields.alias"), alias),
    makeInformationItem(
      t("borrower.profile.view.address"),
      address ? trimAddress(address) : undefined,
      {
        link: address ? getAddressUrl(address) : undefined,
        copy: address,
        verified: true,
      },
    ),
    makeInformationItem(t("common.fields.headquarters"), jurisdictionText, {
      verified: true,
    }),
    makeInformationItem(t("common.fields.entityLegalForm"), entityKindText, {
      verified: true,
    }),
    makeInformationItem(t("common.fields.founded"), founded, {
      verified: true,
    }),
    makeInformationItem(
      t("borrower.profile.view.overallInfo.markets"),
      normalizedMarkets,
    ),
    makeInformationItem(
      t("borrower.profile.view.overallInfo.borrowed"),
      borrowed ?? "[Coming Soon]",
    ),
    makeInformationItem(
      t("borrower.profile.view.overallInfo.defaults.title"),
      normalizedDefaults,
      {
        tooltipText: t("borrower.profile.view.defaults.tooltip"),
      },
    ),
    ...(additionalUrls ?? []).map((url) =>
      makeInformationItem(url.label, url.url, {
        link: url.url,
      }),
    ),
    ...(extraItems ?? []),
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
          {t("borrower.profile.view.title")}
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
                verified={item.verified}
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
      <Typography
        variant={isPage ? "title2" : "text2Highlighted"}
        display="block"
        sx={isPage ? { marginBottom: "24px" } : undefined}
      >
        {t("borrower.profile.view.title")}
      </Typography>

      <Box sx={{ ...InfoContainer, marginTop: isPage ? "0" : "16px" }}>
        <Box sx={InfoColumn}>
          {leftColumn.map((item) => (
            <Box key={`left-${item.title}`}>
              <ParametersItem
                title={item.title}
                value={item.value || ""}
                tooltipText={item.tooltipText}
                link={item.link}
                copy={item.copy}
                verified={item.verified}
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
                verified={item.verified}
              />
              <Divider sx={InfoDivider} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
