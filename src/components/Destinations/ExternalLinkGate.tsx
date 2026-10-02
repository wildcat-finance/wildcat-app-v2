import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  FormControlLabel,
  Typography,
  useTheme,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { TxModalFooterContainer } from "@/components/TxModalComponents/TxModalFooter/style"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

export type ExternalLinkTarget = { url: string; host: string }

export const ExternalLinkGate = ({
  target,
  onClose,
}: {
  target: ExternalLinkTarget | null
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const theme = useTheme()
  const [acknowledged, setAcknowledged] = React.useState(false)
  const [shownTarget, setShownTarget] = React.useState(target)
  if (target && target !== shownTarget) {
    setShownTarget(target)
    setAcknowledged(false)
  }

  const handleContinue = () => {
    if (!target || !acknowledged) return
    window.open(target.url, "_blank", "noopener,noreferrer")
    onClose()
  }

  return (
    <Dialog
      open={!!target}
      onClose={onClose}
      PaperProps={{ "aria-label": t("destinations.gate.title") }}
      sx={{
        "& .MuiDialog-paper": {
          width: "440px",
          maxWidth: "min(440px, calc(100% - 32px))",
          minWidth: "0 !important",
          border: "none",
          borderRadius: "20px",
          margin: 0,
          padding: "24px 0",
        },
      }}
    >
      <TxModalHeader
        title={t("destinations.gate.title")}
        arrowOnClick={null}
        crossOnClick={onClose}
      />

      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          padding: "0 24px",
          [theme.breakpoints.down("md")]: { padding: "0 20px" },
        }}
      >
        <Typography variant="text2" color={COLORS.blackRock}>
          {t("destinations.gate.body", {
            host: shownTarget?.host ?? "",
            interpolation: { escapeValue: false },
          })}
        </Typography>

        <FormControlLabel
          label={
            <Typography variant="text3">
              {t("destinations.gate.confirm")}
            </Typography>
          }
          control={
            <ExtendedCheckbox
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              sx={{
                "& ::before": {
                  transform: "translate(-3px, -3px) scale(0.75)",
                },
              }}
            />
          }
          sx={{ marginLeft: 0, gap: "8px" }}
        />
      </Box>

      <Box sx={{ ...TxModalFooterContainer(theme), marginTop: "24px" }}>
        <Button
          variant="contained"
          color="secondary"
          size="large"
          onClick={onClose}
          fullWidth
        >
          {t("destinations.gate.cancel")}
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleContinue}
          disabled={!acknowledged}
          fullWidth
        >
          {t("destinations.gate.continue")}
        </Button>
      </Box>
    </Dialog>
  )
}
