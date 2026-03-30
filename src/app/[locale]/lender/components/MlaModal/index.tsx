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
          (isLoading && t("marketDetailsLender.mla.loadingMla")) ||
          (!isLoading &&
            (mla === null
              ? t("lenderMarketDetails.buttons.noMla")
              : t("marketDetailsLender.actions.viewMla")))}
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
              title={t("marketDetailsLender.mla.title")}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
            }}
          >
            {isSigning ? (
              <Button variant="outlined" onClick={onSign}>
                {t("common.toast.signing")}
              </Button>
            ) : (
              showSignButton && (
                <Button
                  variant="outlined"
                  onClick={onSign}
                  disabled={disableSignButton || isSigning}
                >
                  {t("marketDetailsLender.mla.signMla")}
                </Button>
              )
            )}
            {downloadPdfUrl && (
              <Button
                variant="outlined"
                onClick={() => window.open(downloadPdfUrl, "_blank")}
              >
                {t("marketDetailsLender.mla.downloadPdf")}
              </Button>
            )}
            {downloadSignedUrl && (
              <Button
                variant="outlined"
                onClick={() => window.open(downloadSignedUrl, "_blank")}
              >
                {t("marketDetailsLender.mla.downloadSignedMla")}
              </Button>
            )}
          </Box>
        </Box>
      </Modal>
    </>
  )
}
