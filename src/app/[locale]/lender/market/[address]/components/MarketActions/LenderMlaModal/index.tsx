"use client"

import { useState } from "react"

import { Box, Button, Modal } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useLenderMla } from "@/app/[locale]/lender/hooks/useLenderMla"
import { MlaDocument } from "@/components/MlaDocument"

import { LenderMlaModalProps } from "./interface"

export const LenderMlaModal = ({
  mla: mlaInput,
  isLoading,
}: LenderMlaModalProps) => {
  const { t } = useTranslation()
  const {
    mla,
    label,
    buttonText,
    html,
    downloads,
    signedMlaLoading,
    isSigning,
    canSign,
    sign,
  } = useLenderMla(mlaInput)
  const [isMlaOpen, setIsMlaOpen] = useState(false)

  return (
    <>
      <Button
        variant="outlined"
        color="secondary"
        size="small"
        disabled={isLoading || !mla || signedMlaLoading || isSigning}
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
            <MlaDocument
              html={html}
              title={label ?? buttonText}
              sx={{
                width: "800px",
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
              gap: 2,
              justifyContent: "center",
            }}
          >
            {canSign && (
              <Button variant="outlined" onClick={sign} disabled={isSigning}>
                {isSigning ? t("mla.signing") : t("mla.signMla")}
              </Button>
            )}
            {downloads.map(({ label: downloadLabel, url }) => (
              <Button
                key={url}
                variant="outlined"
                onClick={() => window.open(url, "_blank")}
              >
                {downloadLabel}
              </Button>
            ))}
          </Box>
        </Box>
      </Modal>
    </>
  )
}
