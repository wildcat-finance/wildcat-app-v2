import * as React from "react"

import { Box, Divider, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  MarketParametersColumn,
  MarketParametersContainer,
  MarketParametersRowsDivider,
} from "@/app/[locale]/borrower/profile/style"
import { MarketParametersItem } from "@/components/MarketParameters/components/MarketParametersItem"

import { OverallSectionProps } from "./interface"

export const OverallSection = ({
  name,
  website,
  headquarters,
  founded,
  marketsAmount,
  totalBorrowedAmount,
  defaults,
}: OverallSectionProps) => {
  const { t } = useTranslation()

  return (
    <Box>
      <Typography variant="title3">
        {t("borrowerProfile.profile.overallInfo.title")}
      </Typography>

      <Box sx={MarketParametersContainer}>
        <Box sx={MarketParametersColumn}>
          {name && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.name")}
                value={name ?? ""}
                link={website}
              />
              <Divider sx={MarketParametersRowsDivider} />
            </Box>
          )}

          {headquarters && (
            <Box>
              <MarketParametersItem
                title={t("borrowerProfile.profile.overallInfo.headquarters")}
                value={headquarters ?? ""}
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
