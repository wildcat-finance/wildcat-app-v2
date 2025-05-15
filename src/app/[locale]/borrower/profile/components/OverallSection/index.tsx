import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useCopyToClipboard } from "react-use"

import {
  MarketParametersColumn,
  MarketParametersContainer,
  MarketParametersRowsDivider,
} from "@/app/[locale]/borrower/profile/style"
import { MarketParametersItem } from "@/components/MarketParameters/components/MarketParametersItem"
import ELFsByCountry from "@/config/elfs-by-country.json"
import Jurisdictions from "@/config/jurisdictions.json"
import { EtherscanBaseUrl } from "@/config/network"
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
  const [state, copyToClipboard] = useCopyToClipboard()

  const handleCopy = (text: string) => {
    copyToClipboard(text)
  }

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

  const additionalInfo1 = "Additional Info #1"
  const additionalInfo2 = "Additional Info #2"
  const additionalInfo3 = "Additional Info #3"

  return (
    <Box>
      <Box sx={MarketParametersContainer}>
        <Box sx={MarketParametersColumn}>
          {name && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.name")}
                value={name}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {alias && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.alias")}
                value={alias}
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

          {additionalInfo1 && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.additionalInfo1")}
                value={additionalInfo1}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}
        </Box>

        <Box sx={MarketParametersColumn}>
          {address && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.address")}
                value={trimAddress(address) ?? ""}
                copy={address}
                link={`${EtherscanBaseUrl}/address/${address}`}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {(headquarters || founded) && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.markets")}
                value={marketsAmount || 0}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {totalBorrowedAmount !== undefined && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.borrowed")}
                value="[Coming Soon]"
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {defaults !== undefined && (
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
          )}

          {additionalInfo2 && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.additionalInfo2")}
                value={additionalInfo2}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {additionalInfo3 && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.additionalInfo3")}
                value={additionalInfo3}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}
        </Box>
      </Box>
    </Box>
  )
}
