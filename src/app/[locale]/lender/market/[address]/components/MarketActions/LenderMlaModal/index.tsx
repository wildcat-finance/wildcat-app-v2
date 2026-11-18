"use client"

import { useEffect, useMemo, useState } from "react"

import { Box, Button, Modal } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { getMlaTemplateLabel } from "@/utils/mlaTemplateLabel"

import { LenderMlaModalProps } from "./interface"
import { useSignLenderMLA } from "../../../../../hooks/useSignLenderMla"
import { useGetSignedMla } from "../../../../../hooks/useSignMla"

export const LenderMlaModal = ({
  mla: mlaInput,
  isLoading,
}: LenderMlaModalProps) => {
  const mla = mlaInput && "noMLA" in mlaInput ? undefined : mlaInput
  const { address, chainId } = useAccount()
  const { data: signedMla, isLoading: signedMlaLoading } = useGetSignedMla(mla)
  const [timeSigned, setTimeSigned] = useState(0)
  useEffect(() => {
    setTimeSigned(Date.now())
  }, [])
  const { mutate: signMla, isPending } = useSignLenderMLA()
  const [isMlaOpen, setIsMlaOpen] = useState(false) // Add new state
  const { t } = useTranslation()
  const onSign = () => {
    if (mla && !signedMla && address) {
      signMla({ lenderAddress: address, mla, timeSigned })
    }
  }
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

  // Names the agreement that governs the market: the market MLA or the
  // borrower's custom MLA.
  const getButtonText = () => {
    if (mla === null) return t("lenderMarketDetails.buttons.mlaNotSet")
    if (mlaInput && "noMLA" in mlaInput) {
      return t("lenderMarketDetails.buttons.mlaRefused")
    }
    if (!mla) return t("lenderMarketDetails.buttons.viewMla")
    return t("mla.viewNamed", {
      name: getMlaTemplateLabel(t, {
        name: mla.templateName,
        version: mla.templateVersion,
        isCustom: mla.isCustomTemplate,
      }),
      interpolation: { escapeValue: false },
    })
  }
  const buttonText = getButtonText()

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        disabled={isLoading || !mla || signedMlaLoading || isPending}
        onClick={() => mla && setIsMlaOpen(true)}
        title={buttonText}
        sx={{ height: "28px", maxWidth: "320px" }}
      >
        <Box
          component="span"
          sx={{
            display: "block",
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {(isLoading && "Loading MLA...") || buttonText}
        </Box>
      </Button>
      <Modal
        open={isMlaOpen}
        onClose={() => setIsMlaOpen(false)}
        aria-labelledby="mla-modal"
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "900px",
            height: "80%",
            bgcolor: "background.paper",
            boxShadow: 24,
            p: 4,
          }}
        >
          <Box
            sx={{
              height: "calc(100% - 48px)", // Leave space for buttons
              paddingX: "50px",
              marginBottom: 2,
            }}
          >
            <iframe
              srcDoc={signedMla?.html ?? mla?.html}
              style={{
                width: "800px",
                height: "100%",
                border: "none",
              }}
              title="Market Lending Agreement"
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
            }}
          >
            {signedMlaLoading ? (
              <Button variant="outlined" onClick={onSign}>
                Signing...
              </Button>
            ) : (
              signedMla === null && (
                <Button variant="outlined" onClick={onSign}>
                  Sign MLA
                </Button>
              )
            )}
            {downloadPdfUrl && (
              <Button
                variant="outlined"
                onClick={() => window.open(downloadPdfUrl, "_blank")}
              >
                Download PDF
              </Button>
            )}
            {downloadSignedUrl && (
              <Button
                variant="outlined"
                onClick={() => window.open(downloadSignedUrl, "_blank")}
              >
                Download Signed MLA
              </Button>
            )}
          </Box>
        </Box>
      </Modal>
    </>
  )
}
