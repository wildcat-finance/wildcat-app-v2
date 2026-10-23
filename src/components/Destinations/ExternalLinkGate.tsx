import * as React from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import ExternalLink from "@/assets/icons/externalLink_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
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
          position: "relative",
          width: "440px",
          maxWidth: "min(440px, calc(100% - 32px))",
          minWidth: "0 !important",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "8px",
          border: "none",
          borderRadius: "20px",
          margin: 0,
          padding: "24px 24px 16px",
        },
      }}
    >
      <IconButton
        onClick={onClose}
        aria-label={t("destinations.gate.stay")}
        sx={{
          position: "absolute",
          top: "28px",
          right: "24px",
          width: "20px",
          height: "20px",
          padding: 0,
        }}
      >
        <SvgIcon
          viewBox="0 0 24 24"
          sx={{ fontSize: "20px", "& path": { fill: COLORS.matteSilver } }}
        >
          <Cross />
        </SvgIcon>
      </IconButton>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: "24px",
          padding: "8px 24px 20px 4px",
        }}
      >
        <Box
          sx={{
            width: "32px",
            height: "32px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "10px",
            backgroundColor: COLORS.whiteSmoke,
          }}
        >
          <SvgIcon viewBox="0 0 16 16" sx={{ fontSize: "16px" }}>
            <ExternalLink />
          </SvgIcon>
        </Box>

        <Box sx={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Typography variant="text1" color={COLORS.bunker}>
            {t("destinations.gate.title")}
          </Typography>
          <Typography
            sx={{
              fontSize: "14px",
              lineHeight: "24px",
              fontWeight: 500,
              color: COLORS.blackRock,
              opacity: 0.7,
            }}
          >
            {t("destinations.gate.body")}
          </Typography>
        </Box>
      </Box>

      <Box
        component="label"
        sx={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          padding: "10px 4px",
          cursor: "pointer",
        }}
      >
        <ExtendedCheckbox
          checked={acknowledged}
          onChange={(event) => setAcknowledged(event.target.checked)}
          sx={{
            padding: 0,
            "& ::before": {
              transform: "translate(-3px, -3px) scale(0.75)",
            },
          }}
        />
        <Typography variant="text3" color={COLORS.blackRock}>
          {t("destinations.gate.confirm")}
        </Typography>
      </Box>

      <Button
        variant="contained"
        size="large"
        onClick={handleContinue}
        disabled={!acknowledged}
        fullWidth
        sx={{ height: "44px" }}
      >
        {t("destinations.gate.continue")}
      </Button>

      <Button
        variant="text"
        size="medium"
        onClick={onClose}
        fullWidth
        sx={{
          padding: "8px 12px",
          lineHeight: "20px",
          color: COLORS.blackRock,
        }}
      >
        {t("destinations.gate.stay")}
      </Button>
    </Dialog>
  )
}
