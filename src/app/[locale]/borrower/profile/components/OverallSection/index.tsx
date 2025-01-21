import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  MarketParametersColumn,
  MarketParametersContainer,
  MarketParametersRowsDivider,
} from "@/app/[locale]/borrower/profile/style"
import { MarketParametersItem } from "@/components/MarketParameters/components/MarketParametersItem"
import ELFsByCountry from "@/config/elfs-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"

import { OverallSectionProps } from "./interface"

export const OverallSection = ({
  name,
  headquarters,
  founded,
  marketsAmount,
  totalBorrowedAmount,
  jurisdiction,
  defaults,
  entityKind,
}: OverallSectionProps) => {
  const { t } = useTranslation()

  const jurisdictionObj =
    jurisdiction !== undefined
      ? Jurisdictions[jurisdiction as keyof typeof Jurisdictions]
      : undefined
  const jurisdictionText =
    jurisdictionObj?.subDivisionName || jurisdictionObj?.countryName

  const entityKindText =
    entityKind !== undefined && jurisdictionObj
      ? ELFsByCountry[
          jurisdictionObj.countryCode as keyof typeof ELFsByCountry
        ].find((elf) => elf.elfCode === entityKind)?.name
      : undefined

  return (
    <Box>
      <Box sx={MarketParametersContainer}>
        <Box sx={MarketParametersColumn}>
          {name && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.name")}
                value={name ?? ""}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {jurisdictionText && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.headquarters")}
                value={jurisdictionText}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {entityKindText && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.entityKind")}
                value={entityKindText}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {founded && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.founded")}
                value={founded ?? ""}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {!(headquarters || founded) && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.markets")}
                value={marketsAmount || 0}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}
        </Box>

        <Box sx={MarketParametersColumn}>
          {(headquarters || founded) && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.markets")}
                value={marketsAmount || 0}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          <Box>
            <MarketParametersItem
              title={t("borrowerProfile.profile.overallInfo.borrowed")}
              value={totalBorrowedAmount || ""}
            />
            <Divider sx={MarketParametersRowsDivider} />
          </Box>

          <Box>
            <MarketParametersItem
              title={t("borrowerProfile.profile.overallInfo.defaults.title")}
              value={defaults || ""}
              tooltipText={t(
                "borrowerProfile.profile.overallInfo.defaults.tooltip",
              )}
            />
            <Divider sx={MarketParametersRowsDivider} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
