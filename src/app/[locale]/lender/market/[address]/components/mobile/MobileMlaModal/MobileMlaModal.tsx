import { Dispatch, SetStateAction } from "react"
import * as React from "react"

import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import {
  LenderMlaInput,
  useLenderMla,
} from "@/app/[locale]/lender/hooks/useLenderMla"
import { MlaDocument } from "@/components/MlaDocument"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { COLORS } from "@/theme/colors"

export type MobileMlaModalProps = {
  isMobileOpen: boolean
  setIsMobileOpen: Dispatch<SetStateAction<boolean>>
  mla: LenderMlaInput
  isLoading: boolean
}

export const MobileMlaModal = ({
  mla: mlaInput,
  isLoading,
  isMobileOpen,
  setIsMobileOpen,
}: MobileMlaModalProps) => {
  const { t } = useTranslation()
  const {
    label,
    buttonText,
    html,
    downloads,
    signedMlaLoading,
    isSigning,
    canSign,
    sign,
  } = useLenderMla(mlaInput)
  const disableActions = isLoading || signedMlaLoading || isSigning

  const htmlContent = `
  <html>
    <head>
      <style>
        body, .c47 {
          padding: 0 !important;
          max-width: 100% !important;
          box-sizing: border-box;
          margin: 0 !important;
        }
      </style>
    </head>
    <body>
      ${html}
    </body>
  </html>
`

  if (!isMobileOpen) return null

  return (
    <Box
      sx={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        backgroundColor: COLORS.white,
        borderRadius: "14px",
      }}
    >
      <TransactionHeader
        label={label ?? buttonText}
        arrowOnClick={null}
        crossOnClick={() => setIsMobileOpen(false)}
      />

      <Box
        sx={{
          height: "100%",
          paddingX: "12px",
        }}
      >
        <MlaDocument
          html={htmlContent}
          title={label ?? buttonText}
          sx={{
            height: "100%",
            minHeight: 0,
            border: "none",
            borderRadius: 0,
          }}
        />
      </Box>

      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: "6px",
          padding: "12px",
        }}
      >
        {downloads.map(({ label: downloadLabel, url }, index) => (
          <Button
            key={url}
            sx={{ padding: "12px 20px" }}
            variant="contained"
            size="large"
            color={index === 0 ? "secondary" : "primary"}
            onClick={() => window.open(url, "_blank")}
            disabled={disableActions}
            fullWidth
          >
            {downloadLabel}
          </Button>
        ))}

        {canSign && (
          <Button
            sx={{ padding: "12px 20px" }}
            variant="contained"
            size="large"
            onClick={sign}
            disabled={disableActions}
            fullWidth
          >
            {isSigning ? t("mla.signing") : t("mla.signMla")}
          </Button>
        )}
      </Box>
    </Box>
  )
}
