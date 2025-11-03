import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  MarketParametersColumn,
  MarketParametersContainer,
  MarketParametersRowsDivider,
} from "@/app/[locale]/borrower/profile/style"
import { ParametersItem } from "@/components/ParametersItem"
import ELFsByCountry from "@/config/elfs-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"
import { trimAddress } from "@/utils/formatters"

import { OverallSectionProps } from "./interface"

export const OverallSection = ({
  address,
  name,
  alias,
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
  const jurisdictionText = jurisdictionObj?.countryName

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
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.name")}
                value={name}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {alias && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.alias")}
                value={alias}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {jurisdictionText && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.headquarters")}
                value={jurisdictionText}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {entityKindText && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.entityKind")}
                value={entityKindText}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {founded && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.founded")}
                value={founded ?? ""}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {!(headquarters || founded) && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.markets")}
                value={marketsAmount || 0}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}
        </Box>

        <Box sx={MarketParametersColumn}>
          {address && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.address")}
                value={trimAddress(address) ?? ""}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {(headquarters || founded) && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.markets")}
                value={marketsAmount || 0}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {totalBorrowedAmount !== undefined && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.borrowed")}
                value="[Coming Soon]"
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {defaults !== undefined && (
            <Box>
              <ParametersItem
                title={t("borrowerProfile.profile.overallInfo.defaults.title")}
                value={defaults || ""}
                tooltipText={t(
                  "borrowerProfile.profile.overallInfo.defaults.tooltip",
                )}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
