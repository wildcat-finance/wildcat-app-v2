"use client"

import { useState } from "react"

import { Box, Button, Modal } from "@mui/material"
import { useTranslation } from "react-i18next"

import { MlaModalProps } from "./interface"

export const MlaModal = ({
  mla,
  isLoading,
  onSign,
  showSignButton,
  downloadPdfUrl,
  downloadSignedUrl,
  disableModalButton,
  buttonText,
  sx,
  isSigning,
  disableSignButton,
  modalButtonVariant = "outlined",
  modalButtonSize = "small",
  isClosed,
}: MlaModalProps) => {
  const [isMlaOpen, setIsMlaOpen] = useState(false) // Add new state
  const { t } = useTranslation()
  return (
    <>
      <Button
        variant={modalButtonVariant}
        color="secondary"
        size={modalButtonSize}
        disabled={isLoading || mla === null || disableModalButton}
        onClick={() => mla && setIsMlaOpen(true)}
        sx={sx}
      >
        {buttonText ||
          (isLoading && "Loading MLA...") ||
          (!isLoading &&
            (mla === null
              ? t("lenderMarketDetails.buttons.noMla")
              : t("lenderMarketDetails.buttons.viewMla")))}
      </Button>
      <Modal
        open={isMlaOpen && !isClosed}
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
