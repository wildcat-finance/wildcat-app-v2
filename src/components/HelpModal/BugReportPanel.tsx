"use client"

import { useState } from "react"

import {
  Box,
  Button,
  Checkbox,
  FormControlLabel,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import {
  buildBugReportPayload,
  isBugReportTracingAvailable,
} from "@/lib/bug-report/client"
import {
  BUG_REPORT_DESCRIPTION_MAX_LENGTH,
  BUG_REPORT_DESCRIPTION_MIN_LENGTH,
} from "@/lib/bug-report/types"
import { COLORS } from "@/theme/colors"

type BugReportPanelProps = {
  onBack: () => void
}

export function BugReportPanel({ onBack }: BugReportPanelProps) {
  const { t, i18n } = useTranslation()
  const { address, connector } = useAccount()

  const [description, setDescription] = useState("")
  const [includeTraces, setIncludeTraces] = useState(
    isBugReportTracingAvailable(),
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const [reportId, setReportId] = useState<string | null>(null)

  const otelAvailable = isBugReportTracingAvailable()
  const trimmedLength = description.trim().length
  const isDescriptionValid =
    trimmedLength >= BUG_REPORT_DESCRIPTION_MIN_LENGTH &&
    description.length <= BUG_REPORT_DESCRIPTION_MAX_LENGTH

  const descriptionError =
    submissionError ??
    (submitAttempted && trimmedLength < BUG_REPORT_DESCRIPTION_MIN_LENGTH
      ? t("helpModal.bugReport.validation.descriptionMin", {
          count: BUG_REPORT_DESCRIPTION_MIN_LENGTH,
        })
      : null)

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    if (e.target.value.length > BUG_REPORT_DESCRIPTION_MAX_LENGTH) return
    setDescription(e.target.value)
    setSubmissionError(null)
  }

  const handleSubmit = async () => {
    setSubmitAttempted(true)
    setSubmissionError(null)
    if (!isDescriptionValid) return

    setIsSubmitting(true)
    try {
      const payload = buildBugReportPayload({
        description: description.trim(),
        includeTraces,
        locale: i18n.resolvedLanguage || i18n.language,
        walletAddress: address,
        connectorId: connector?.id,
      })

      const response = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string
        } | null
        setSubmissionError(
          body?.error ?? t("helpModal.bugReport.messages.genericError"),
        )
        return
      }

      const body = (await response.json()) as { reportId: string }
      setReportId(body.reportId)
      setDescription("")
      setSubmitAttempted(false)
    } catch {
      setSubmissionError(t("helpModal.bugReport.messages.genericError"))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (reportId) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          pt: "8px",
        }}
      >
        <Typography variant="text2">
          {t("helpModal.bugReport.success.title")}
        </Typography>
        <Typography variant="text3" color={COLORS.manate}>
          {t("helpModal.bugReport.success.subtitle")}
        </Typography>
        <Box
          sx={{
            borderRadius: "12px",
            border: `1px solid ${COLORS.whiteLilac}`,
            backgroundColor: COLORS.blackHaze,
            p: "12px",
          }}
        >
          <Typography variant="text4" color={COLORS.santasGrey}>
            {t("helpModal.bugReport.success.reportId")}
          </Typography>
          <Typography variant="text3">{reportId}</Typography>
        </Box>
        <Button variant="contained" onClick={onBack}>
          {t("helpModal.bugReport.actions.backToHelp")}
        </Button>
      </Box>
    )
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        pt: "8px",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "4px" }}>
        <Typography variant="text2">
          {t("helpModal.bugReport.title")}
        </Typography>
        <Typography variant="text3" color={COLORS.manate}>
          {t("helpModal.bugReport.subtitle")}
        </Typography>
      </Box>

      <TextField
        multiline
        minRows={5}
        maxRows={8}
        value={description}
        onChange={handleDescriptionChange}
        placeholder={t("helpModal.bugReport.placeholder")}
        error={Boolean(descriptionError)}
        helperText={
          descriptionError ??
          t("helpModal.bugReport.descriptionHelper", {
            min: BUG_REPORT_DESCRIPTION_MIN_LENGTH,
            max: BUG_REPORT_DESCRIPTION_MAX_LENGTH,
          })
        }
      />

      <Typography variant="text4" color={COLORS.santasGrey}>
        {t("helpModal.bugReport.characterCount", {
          count: description.length,
          max: BUG_REPORT_DESCRIPTION_MAX_LENGTH,
        })}
      </Typography>

      <Box
        sx={{
          borderRadius: "12px",
          border: `1px solid ${COLORS.whiteLilac}`,
          p: "12px",
          backgroundColor: COLORS.blackHaze,
        }}
      >
        <FormControlLabel
          control={
            <Checkbox
              checked={includeTraces && otelAvailable}
              disabled={!otelAvailable}
              onChange={(e) => setIncludeTraces(e.target.checked)}
            />
          }
          label={t("helpModal.bugReport.includeTraces")}
          sx={{ alignItems: "flex-start", margin: 0 }}
        />
        <Typography
          variant="text4"
          color={COLORS.santasGrey}
          sx={{ pl: "40px" }}
        >
          {otelAvailable
            ? t("helpModal.bugReport.traceHelper")
            : t("helpModal.bugReport.traceUnavailable")}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", gap: "8px", pt: "4px" }}>
        <Button
          fullWidth
          variant="outlined"
          onClick={onBack}
          disabled={isSubmitting}
        >
          {t("helpModal.bugReport.actions.back")}
        </Button>
        <Button
          fullWidth
          variant="contained"
          onClick={handleSubmit}
          disabled={!isDescriptionValid || isSubmitting}
        >
          {isSubmitting
            ? t("helpModal.bugReport.actions.submitting")
            : t("helpModal.bugReport.actions.submit")}
        </Button>
      </Box>
    </Box>
  )
}
