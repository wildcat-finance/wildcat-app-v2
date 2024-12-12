"use client"

import { useEffect, useMemo, useState } from "react"

import { Box, Button, Modal } from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import { LenderMlaModalProps } from "./interface"
import { useSignLenderMLA } from "../../hooks/useSignLenderMla"
import { useGetSignedMla } from "../../hooks/useSignMla"

export const LenderMlaModal = ({ mla, isLoading }: LenderMlaModalProps) => {
  const { address } = useAccount()
  const { data: signedMla, isLoading: signedMlaLoading } = useGetSignedMla(
    mla?.market,
  )
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
    if (mla && signedMla && address)
      return `/api/mla/${mla.market}/${address}/pdf`
    return null
  }, [signedMla, address, mla])
  const downloadSignedUrl = useMemo(() => {
    if (mla && signedMla && address)
      return `/api/mla/${mla.market}/${address}/signed`
    return null
  }, [signedMla, address, mla])

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        disabled={isLoading || mla === null || signedMlaLoading || isPending}
        onClick={() => mla && setIsMlaOpen(true)}
      >
        {(isLoading && "Loading MLA...") ||
          (!isLoading &&
            (mla === null
              ? t("lenderMarketDetails.buttons.noMla")
              : t("lenderMarketDetails.buttons.viewMla")))}
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
              srcDoc={mla?.html}
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
