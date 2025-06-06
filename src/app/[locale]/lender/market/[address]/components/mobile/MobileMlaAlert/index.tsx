import * as React from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import { useTranslation } from "react-i18next"

import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import Check from "@/assets/icons/check_icon.svg"
import { useMarketMla } from "@/hooks/useMarketMla"
import { COLORS } from "@/theme/colors"
import { formatDate } from "@/utils/formatters"

export type MobileMlaAlertProps = {
  marketAccount: MarketAccount
}

export const MobileMlaAlert = ({ marketAccount }: MobileMlaAlertProps) => {
  const { market } = marketAccount
  const { t } = useTranslation()

  const { data: mla, isLoading: mlaLoading } = useMarketMla(market.address)
  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const { data: signedMla, isLoading: signedMlaLoading } =
    useGetSignedMla(mlaResponse)

  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  if (!mlaRequiredAndUnsigned && !!signedMla)
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <Typography
          variant="title3"
          fontSize="20px"
          lineHeight="24px"
          textAlign="center"
          marginTop="12px"
        >
          Master Loan Agreement
        </Typography>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            gap: "4px",
            justifyContent: "center",
            alignItems: "center",
            marginTop: "8px",
          }}
        >
          <SvgIcon
            sx={{ fontSize: "12px", "& path": { fill: COLORS.santasGrey } }}
          >
            <Check />
          </SvgIcon>
          <Typography variant="text3" color={COLORS.santasGrey}>
            Signed: {formatDate(signedMla.timeSigned)}
          </Typography>
        </Box>

        <Button
          variant="contained"
          size="large"
          color="secondary"
          sx={{
            marginTop: "24px",
            padding: "8px 12px",
            borderRadius: "10px",
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: "20px",
          }}
        >
          {t("lenderMarketDetails.buttons.viewMla")}
        </Button>
      </Box>
    )

  return null
}
