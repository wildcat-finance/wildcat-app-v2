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
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
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
  additionalUrls,
}: OverallSectionProps) => {
  const isMobile = useMobileResolution()
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

  // Split the additionalUrls into two arrays, the left column and the right column.
  // The left column should have one less of the additionalUrls than the right column, as the right
  // column has 1 less value in the default layout.
  const rightSideColumns = additionalUrls?.slice(
    0,
    Math.ceil(additionalUrls.length / 2),
  )
  const leftSideColumns = additionalUrls?.slice(
    Math.ceil(additionalUrls.length / 2),
  )

  if (isMobile)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
          marginTop: "4px",
        }}
      >
        <Typography variant="mobH3" marginTop="12px">
          Overall Info
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "20px",
          }}
        >
          {name && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.name")}
                value={name}
              />
              <Divider sx={{ marginTop: "10px" }} />
            </Box>
          )}

          {alias && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.alias")}
                value={alias}
              />
              {jurisdictionText && <Divider sx={{ marginTop: "10px" }} />}
            </Box>
          )}

          {jurisdictionText && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.headquarters")}
                value={jurisdictionText}
              />
              {entityKindText && <Divider sx={{ marginTop: "10px" }} />}
            </Box>
          )}

          {entityKindText && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.entityKind")}
                value={entityKindText}
              />
              {founded && <Divider sx={{ marginTop: "10px" }} />}
            </Box>
          )}

          {founded && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.founded")}
                value={founded ?? ""}
              />
              {marketsAmount && <Divider sx={{ marginTop: "10px" }} />}
            </Box>
          )}

          {marketsAmount && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.markets")}
                value={marketsAmount || 0}
              />
              {totalBorrowedAmount !== undefined && (
                <Divider sx={{ marginTop: "10px" }} />
              )}
            </Box>
          )}

          {totalBorrowedAmount !== undefined && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.borrowed")}
                value="[Coming Soon]"
              />
              <Divider sx={{ marginTop: "10px" }} />
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
              <Divider sx={{ marginTop: "10px" }} />
            </Box>
          )}
        </Box>
      </Box>
    )

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

          {leftSideColumns?.map((column) => (
            <Box>
              <MarketParametersItem
                title={column.label}
                value={column.url}
                link={column.url}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          ))}
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

          {rightSideColumns?.map((column) => (
            <Box>
              <MarketParametersItem
                title={column.label}
                value={column.url}
                link={column.url}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  )
}
