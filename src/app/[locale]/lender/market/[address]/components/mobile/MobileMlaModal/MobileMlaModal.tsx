import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react"
import * as React from "react"

import { Box, Button, SvgIcon } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { useSignLenderMLA } from "@/app/[locale]/lender/hooks/useSignLenderMla"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import Check from "@/assets/icons/check_icon.svg"
import { MiniLoader } from "@/components/Loader"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalFooterContainer } from "@/components/TxModalComponents/TxModalFooter/style"
import { COLORS } from "@/theme/colors"

export type MobileMlaModalProps = {
  isMobileOpen: boolean
  setIsMobileOpen: Dispatch<SetStateAction<boolean>>
  mla: MasterLoanAgreementResponse | undefined | null | { noMLA: boolean }
  isLoading: boolean
}

export const MobileMlaModal = ({
  mla: mlaInput,
  isLoading,
  isMobileOpen,
  setIsMobileOpen,
}: MobileMlaModalProps) => {
  const mla = mlaInput && "noMLA" in mlaInput ? undefined : mlaInput
  const { address } = useAccount()
  const { data: signedMla, isLoading: signedMlaLoading } = useGetSignedMla(mla)
  const [timeSigned, setTimeSigned] = useState(0)
  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])
  const { mutate: signMla, isPending } = useSignLenderMLA()
  const { t } = useTranslation()
  const onSign = () => {
    if (mla && !signedMla && address) {
      signMla({ lenderAddress: address, mla, timeSigned })
    }
  }
  const downloadPdfUrl = useMemo(() => {
    if (mla && signedMla && address)
      return `/api/mla/${mla.market}/${address}/pdf`
    return null
  }, [signedMla, address, mla])
  const downloadSignedUrl = useMemo(() => {
    if (mla && signedMla && address)
      return `/api/mla/${mla.market}/${address}/signed`
    return null
  }, [signedMla, address, mla])

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
      ${signedMla?.html ?? mla?.html ?? ""}
    </body>
  </html>
`

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
        label="Market Lending Agreement"
        arrowOnClick={null}
        crossOnClick={() => setIsMobileOpen(false)}
      />

      <Box
        sx={{
          height: "100%",
          paddingX: "12px",
        }}
      >
        <iframe
          srcDoc={htmlContent}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          title="Market Lending Agreement"
        />
      </Box>

      <Box sx={{ display: "flex", gap: "6px", padding: "12px" }}>
        {downloadPdfUrl && (
          <Button
            sx={{ padding: "12px 20px" }}
            variant="contained"
            size="large"
            color="secondary"
            onClick={() => window.open(downloadPdfUrl, "_blank")}
            fullWidth
          >
            Download PDF
          </Button>
        )}

        {downloadSignedUrl && (
          <Button
            sx={{ padding: "12px 20px" }}
            variant="contained"
            size="large"
            onClick={() => window.open(downloadSignedUrl, "_blank")}
            fullWidth
          >
            Download Signed MLA
          </Button>
        )}

        {signedMla === null && (
          <Button
            sx={{ padding: "12px 20px" }}
            variant="contained"
            size="large"
            onClick={onSign}
            disabled={isPending}
            fullWidth
          >
            {signedMlaLoading ? "Signing..." : "Sign MLA"}
          </Button>
        )}
      </Box>
    </Box>
  )
}
