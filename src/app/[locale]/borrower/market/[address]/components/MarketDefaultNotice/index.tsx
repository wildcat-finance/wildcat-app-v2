import * as React from "react"

import { Box, Typography } from "@mui/material"
import Link from "next/link"
import { useTranslation } from "react-i18next"

import Arrow from "@/assets/icons/textChipArrow_icon.svg"
import { DefaultedGlyph } from "@/components/DefaultNotice"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { buildMarketHref } from "@/utils/formatters"

import {
  MarketLinkChip,
  NoticeContainer,
  NoticeIconRow,
  NoticeTextColumn,
  NoticeTitleRow,
} from "./style"

export type DefaultedMarketLink = {
  address: string
  name: string
  chainId: number
}

export type MarketDefaultNoticeProps =
  | { variant: "ownMarket" }
  | {
      variant: "otherMarket"
      count: number
      markets: DefaultedMarketLink[]
    }

export const MarketDefaultNotice = (props: MarketDefaultNoticeProps) => {
  const { t } = useTranslation()

  return (
    <Box sx={NoticeContainer}>
      <Box sx={NoticeIconRow}>
        <DefaultedGlyph size="24px" color={COLORS.blackRock} />
      </Box>

      <Box sx={NoticeTextColumn}>
        {props.variant === "ownMarket" ? (
          <Typography variant="text1" color={COLORS.blackRock}>
            {t("defaultedMarkets.ownMarketNotice.title")}
          </Typography>
        ) : (
          <Box sx={NoticeTitleRow}>
            <Typography
              variant="text1"
              color={COLORS.blackRock}
              sx={{ whiteSpace: "nowrap" }}
            >
              {t("defaultedMarkets.otherMarketNotice.title", {
                count: props.count,
              })}
            </Typography>

            {props.markets.map(({ address, name, chainId }) => (
              <Link
                key={address}
                href={buildMarketHref(address, chainId, ROUTES.borrower.market)}
                style={{ display: "flex", textDecoration: "none" }}
              >
                <Box sx={MarketLinkChip}>
                  <Typography
                    variant="text4"
                    color={COLORS.blackRock}
                    sx={{ whiteSpace: "nowrap" }}
                  >
                    {name}
                  </Typography>
                  <Arrow fill={COLORS.blackRock} />
                </Box>
              </Link>
            ))}
          </Box>
        )}

        {props.variant === "ownMarket" && (
          <Typography variant="text3" color={COLORS.blackRock08}>
            {t("defaultedMarkets.ownMarketNotice.description")}
          </Typography>
        )}
      </Box>
    </Box>
  )
}
