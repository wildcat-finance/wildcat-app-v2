import { Dispatch, SetStateAction, useEffect, useMemo, useState } from "react"
import * as React from "react"

import { Box, Button } from "@mui/material"
import { useAccount } from "wagmi"

import { useSignLenderMLA } from "@/app/[locale]/lender/hooks/useSignLenderMla"
import { useGetSignedMla } from "@/app/[locale]/lender/hooks/useSignMla"
import { MasterLoanAgreementResponse } from "@/app/api/mla/interface"
import { TransactionHeader } from "@/components/Mobile/TransactionHeader"
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
  const { address, chainId } = useAccount()
  const { data: signedMla, isLoading: signedMlaLoading } = useGetSignedMla(mla)
  const [timeSigned, setTimeSigned] = useState(0)
  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])
  const { mutate: signMla, isPending } = useSignLenderMLA()
  const onSign = () => {
    if (mla && !signedMla && address) {
      signMla({ lenderAddress: address, mla, timeSigned })
    }
  }
  const disableActions = isLoading || signedMlaLoading || isPending
  const downloadPdfUrl = useMemo(() => {
    if (mla && signedMla && address) {
      const resolvedChainId = mla.chainId ?? chainId
      if (!resolvedChainId) return null
      return `/api/mla/${mla.market.toLowerCase()}/${address.toLowerCase()}/pdf?chainId=${resolvedChainId}`
    }
    return null
  }, [signedMla, address, mla, chainId])
  const downloadSignedUrl = useMemo(() => {
    if (mla && signedMla && address) {
      const resolvedChainId = mla.chainId ?? chainId
      if (!resolvedChainId) return null
      return `/api/mla/${mla.market.toLowerCase()}/${address.toLowerCase()}/signed?chainId=${resolvedChainId}`
    }
    return null
  }, [signedMla, address, mla, chainId])

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
            disabled={disableActions}
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
            disabled={disableActions}
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
            disabled={disableActions}
            fullWidth
          >
            {signedMlaLoading ? "Signing..." : "Sign MLA"}
          </Button>
        )}
      </Box>
    </Box>
  )
}
