import * as React from "react"
import { Dispatch, SetStateAction } from "react"

import { Box, Button, SvgIcon, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import Check from "@/assets/icons/check_icon.svg"
import { COLORS } from "@/theme/colors"
import { formatDate } from "@/utils/formatters"

export type MobileMlaAlertProps = {
  mla: MasterLoanAgreementResponse | undefined | null | { noMLA: boolean }
  isLoading: boolean
  isMLAOpen: boolean
  setIsMLAOpen: Dispatch<SetStateAction<boolean>>
}

export const MobileMlaAlert = ({
  mla,
  isLoading,
  isMLAOpen,
  setIsMLAOpen,
}: MobileMlaAlertProps) => {
  const { t } = useTranslation()

  const mlaResponse = mla && "noMLA" in mla ? null : mla
  const { data: signedMla, isLoading: signedMlaLoading } =
    useGetSignedMla(mlaResponse)

  const mlaRequiredAndUnsigned =
    signedMla === null && !!mla && !("noMLA" in mla)

  const handleClickToggleMLA = () => {
    setIsMLAOpen(!isMLAOpen)
  }

  const buttonText =
    // eslint-disable-next-line no-nested-ternary
    mla === null
      ? t("lenderMarketDetails.buttons.mlaNotSet")
      : mla && "noMLA" in mla
        ? t("lenderMarketDetails.buttons.mlaRefused")
        : t("lenderMarketDetails.buttons.viewMla")

  if (!mlaRequiredAndUnsigned && !!signedMla)
    return (
      <Box
        id="mla"
        sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          backgroundColor: COLORS.white,
          borderRadius: "14px",
          padding: "12px 16px",
        }}
      >
        <Typography variant="mobH3" textAlign="center" marginTop="12px">
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
          <Typography variant="mobText3" color={COLORS.santasGrey}>
            Signed: {formatDate(signedMla.timeSigned)}
          </Typography>
        </Box>

        <Button
          onClick={handleClickToggleMLA}
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
          {buttonText}
        </Button>
      </Box>
    )

  return null
}
