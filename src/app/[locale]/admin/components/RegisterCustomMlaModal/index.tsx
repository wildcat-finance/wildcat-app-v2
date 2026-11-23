"use client"

import * as React from "react"
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { useGetMlaTemplate } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplate"
import { useGetMlaTemplates } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplates"
import {
  CustomMlaTemplateForAdminView,
  MlaTemplateMetadata,
} from "@/app/api/mla/interface"
import { MlaDocument } from "@/components/MlaDocument"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import {
  fillWithPlaceholders,
  prepareCustomMlaTemplate,
} from "@/lib/mlaTemplateText"
import {
  carryTextEdits,
  findTextMissingFromHtml,
  parseHtmlParagraphs,
  prettifyHtmlBody,
  splitHtmlBody,
} from "@/lib/mlaTextSync"
import { COLORS } from "@/theme/colors"
import { toMlaPdfFileName } from "@/utils/mlaPdfFileName"
import { getMlaTemplateLabel } from "@/utils/mlaTemplateLabel"

import { useBorrowerOrganisations } from "../../hooks/useBorrowerOrganisations"
import {
  useCustomMlaTemplates,
  useDownloadMlaPdf,
  useRegisterCustomMla,
} from "../../hooks/useCustomMlaTemplates"
import { BorrowerOrganisationPicker } from "../BorrowerOrganisationPicker"

// Two fields share a row on wide screens and stack on narrow ones.
const ROW = {
  display: "flex",
  gap: "12px",
  flexDirection: { xs: "column", md: "row" },
}

const PANE_HEIGHT = "560px"
const HTML_PANE_HEIGHT = "360px"

// A multi-line field of a fixed height that scrolls its text, framed like the
// preview beside it. The theme otherwise pins every field to one line's
// height.
const paneField = (height: string) => ({
  height,
  "& .MuiInputBase-root": {
    height: "100%",
    alignItems: "stretch",
    padding: 0,
  },
  "& textarea": {
    height: "100% !important",
    overflowY: "auto !important",
    boxSizing: "border-box",
  },
})

const CODE_FONT = { fontFamily: "monospace", fontSize: "12px" }

// Rendering the formatted agreement reloads a large document, so it follows
// the text once typing pauses.
const PREVIEW_DELAY_MS = 400

const excerpt = (text: string) =>
  text.length > 140 ? `${text.slice(0, 137)}...` : text

/// The text and the HTML that last matched it. Text edits since are carried
/// into the HTML; editing the HTML by hand makes a new pair.
type SyncedTexts = { html: string; plaintext: string }

/// The version to suggest for a borrower's next custom MLA: one above its
/// highest numbered version, or a count when versions are not numbers.
export const nextCustomMlaVersion = (
  existing: Pick<CustomMlaTemplateForAdminView, "version">[],
) => {
  const numbers = existing
    .map(({ version }) => Number(version))
    .filter((version) => Number.isInteger(version))
  return String(
    numbers.length > 0 ? Math.max(...numbers) + 1 : existing.length + 1,
  )
}

/// The network class's market MLA, as the server picks it to label a custom
/// MLA's fields: the default, else the oldest. New custom MLAs start from it.
export const findPlaceholderSource = (
  templates: MlaTemplateMetadata[] | undefined,
) =>
  templates?.find(({ borrowerId, isDefault }) => !borrowerId && isDefault) ??
  templates?.find(({ borrowerId }) => !borrowerId)

const PaneHeader = ({
  title,
  caption,
  area,
}: {
  title: string
  caption: string
  area?: string
}) => (
  <Box display="flex" flexDirection="column" gap="2px" gridArea={area}>
    <Typography variant="text3">{title}</Typography>
    <Typography variant="text4" color={COLORS.santasGrey}>
      {caption}
    </Typography>
  </Box>
)

const MessageList = ({
  title,
  lines,
  color,
}: {
  title: string
  lines: string[]
  color: string
}) => (
  <Box display="flex" flexDirection="column" gap="4px">
    <Typography variant="text3" color={color}>
      {title}
    </Typography>
    {lines.map((line, index) => (
      // Two edits can read the same.
      // eslint-disable-next-line react/no-array-index-key
      <Typography key={index} variant="text4" color={color}>
        {line}
      </Typography>
    ))}
  </Box>
)

/// Register a custom MLA for one borrower. A stored MLA (the market MLA, or
/// one of the borrower's earlier custom MLAs) loads into the dialog; the admin
/// edits its text, and each edit is made in its HTML too, which the preview
/// shows. Edits that cannot be placed in the HTML are listed for the admin to
/// make there by hand. Both are saved as a new template, filled in at signing
/// as the market MLA is.
export const RegisterCustomMlaModal = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [showHtml, setShowHtml] = useState(false)
  const [borrowerId, setBorrowerId] = useState("")
  const [name, setName] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [startFromId, setStartFromId] = useState<number>()
  const [synced, setSynced] = useState<SyncedTexts>()
  const [plaintext, setPlaintext] = useState("")
  const [knownGaps, setKnownGaps] = useState<Set<string>>(new Set())
  const [previewHtml, setPreviewHtml] = useState("")
  const loadedFromId = useRef<number>()

  const { data: organisations } = useBorrowerOrganisations()
  const { data: customMlas } = useCustomMlaTemplates()
  const { mutate, isPending, error, reset } = useRegisterCustomMla()
  const { mutate: downloadPdf, isPending: isDownloading } = useDownloadMlaPdf()
  const { data: templates } = useGetMlaTemplates()
  const marketMla = findPlaceholderSource(templates)
  const { data: placeholderSource } = useGetMlaTemplate(marketMla?.id)
  const startId = startFromId ?? marketMla?.id
  const { data: startTemplate, isLoading: isLoadingStart } = useGetMlaTemplate(
    isOpen ? startId : undefined,
  )

  // Load the chosen MLA once per choice, so a refetch never overwrites the
  // admin's edits. Paragraphs its two texts already disagree on are noted,
  // so only gaps the admin's edits open are reported.
  useEffect(() => {
    if (!isOpen || !startTemplate || startTemplate.id !== startId) return
    if (loadedFromId.current === startTemplate.id) return
    loadedFromId.current = startTemplate.id
    const html = prettifyHtmlBody(startTemplate.html)
    setSynced({ html, plaintext: startTemplate.plaintext })
    setPlaintext(startTemplate.plaintext)
    setKnownGaps(
      new Set(
        findTextMissingFromHtml(html, startTemplate.plaintext).map(
          ({ words }) => words,
        ),
      ),
    )
  }, [isOpen, startTemplate, startId])

  // The 125 KB HTML is reworked as the text changes; typing stays responsive
  // while that catches up.
  const text = useDeferredValue(plaintext)
  const syncedParagraphs = useMemo(
    () => (synced ? parseHtmlParagraphs(synced.html) : []),
    [synced],
  )
  const carried = useMemo(
    () =>
      synced
        ? carryTextEdits(synced.html, syncedParagraphs, synced.plaintext, text)
        : { html: "", unplaced: [] },
    [synced, syncedParagraphs, text],
  )
  const { html, unplaced } = carried
  const prepared = useMemo(
    () =>
      html.trim() && text.trim()
        ? prepareCustomMlaTemplate({ html, plaintext: text }, placeholderSource)
        : undefined,
    [html, text, placeholderSource],
  )
  const gaps = useMemo(() => {
    if (!html.trim()) return []
    const listed = new Set(unplaced.map((edit) => edit.text))
    return findTextMissingFromHtml(html, text).filter(
      ({ words, line }) => !knownGaps.has(words) && !listed.has(line),
    )
  }, [html, text, unplaced, knownGaps])

  useEffect(() => {
    const filled = prepared ? fillWithPlaceholders(prepared.template) : ""
    const timer = setTimeout(
      () => setPreviewHtml(filled),
      previewHtml ? PREVIEW_DELAY_MS : 0,
    )
    return () => clearTimeout(timer)
    // The delay only depends on whether a preview is showing yet.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prepared])

  const borrowerMlas =
    customMlas?.filter((mla) => mla.borrowerId === borrowerId) ?? []
  const startOptions = [
    ...(marketMla ? [{ id: marketMla.id, label: marketMla.name }] : []),
    ...borrowerMlas.map((mla) => ({
      id: mla.id,
      label: getMlaTemplateLabel(t, { ...mla, isCustom: true }),
    })),
  ]
  const isComplete =
    !!borrowerId &&
    !!name.trim() &&
    !!version.trim() &&
    !!prepared &&
    prepared.problems.length === 0 &&
    unplaced.length === 0
  const { head, body, tail } = splitHtmlBody(html)

  const handleSelectBorrower = (id: string) => {
    const selected = organisations?.find(
      (organisation) => organisation.id === id,
    )
    setBorrowerId(id)
    // Another borrower's custom MLA is not a starting point for this one.
    if (startFromId !== undefined && startFromId !== marketMla?.id) {
      setStartFromId(undefined)
    }
    if (!selected) return
    setName(`${selected.name} MLA`)
    setVersion(
      nextCustomMlaVersion(
        customMlas?.filter((mla) => mla.borrowerId === id) ?? [],
      ),
    )
  }

  // A hand edit to the HTML makes it the version that matches the text.
  const handleEditHtml = (editedBody: string) =>
    setSynced({ html: head + editedBody + tail, plaintext: text })

  const handleClose = () => {
    if (isPending) return
    setIsOpen(false)
    setShowHtml(false)
    setBorrowerId("")
    setName("")
    setVersion("")
    setDescription("")
    setStartFromId(undefined)
    setSynced(undefined)
    setPlaintext("")
    setKnownGaps(new Set())
    setPreviewHtml("")
    loadedFromId.current = undefined
    reset()
  }

  // The texts as typed, with every edit so far carried into the HTML, even if
  // the preview has not caught up yet.
  const prepareLatest = () => {
    if (!synced) return undefined
    const latest = carryTextEdits(
      synced.html,
      syncedParagraphs,
      synced.plaintext,
      plaintext,
    )
    return {
      unplaced: latest.unplaced,
      ...prepareCustomMlaTemplate(
        { html: latest.html, plaintext },
        placeholderSource,
      ),
    }
  }

  const handleDownloadPdf = () => {
    const latest = prepareLatest()
    if (!latest) return
    downloadPdf({
      html: fillWithPlaceholders(latest.template),
      fileName: toMlaPdfFileName(name, version),
    })
  }

  const handleSubmit = () => {
    const latest = prepareLatest()
    if (!latest || latest.unplaced.length > 0 || latest.problems.length > 0) {
      return
    }
    mutate(
      {
        borrowerId,
        name: name.trim(),
        version: version.trim(),
        description: description.trim() || undefined,
        html: latest.template.html,
        plaintext,
      },
      { onSuccess: handleClose },
    )
  }

  return (
    <>
      <Button
        variant="contained"
        color="primary"
        onClick={() => setIsOpen(true)}
      >
        {t("admin.customMla.register")}
      </Button>
      <Dialog
        open={isOpen}
        onClose={handleClose}
        maxWidth="lg"
        fullWidth
        sx={{
          "& .MuiDialog-paper": { borderRadius: "20px", padding: "24px 0" },
        }}
      >
        <TxModalHeader
          title={t("admin.customMla.title")}
          crossOnClick={handleClose}
          arrowOnClick={null}
        >
          <Box sx={{ padding: "0 24px" }}>
            <Typography variant="text3" color={COLORS.santasGrey}>
              {t("admin.customMla.description")}
            </Typography>
          </Box>
        </TxModalHeader>
        <Box
          padding="24px"
          display="flex"
          flexDirection="column"
          gap="20px"
          sx={{ overflowY: "auto" }}
        >
          <Box display="flex" flexDirection="column" gap="12px">
            <Box sx={ROW}>
              <BorrowerOrganisationPicker
                organisations={organisations}
                value={borrowerId}
                onChange={handleSelectBorrower}
                label={t("admin.customMla.borrower")}
                sx={{ flex: 5 }}
              />
              <TextField
                label={t("admin.customMla.name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                sx={{ flex: 5 }}
              />
              <TextField
                label={t("admin.customMla.version")}
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                sx={{ flex: 2 }}
              />
            </Box>
            <Box sx={ROW}>
              <TextField
                select
                label={t("admin.customMla.startFrom")}
                value={startId ?? ""}
                onChange={(e) => setStartFromId(Number(e.target.value))}
                sx={{ flex: 5 }}
              >
                {startOptions.map((option) => (
                  <MenuItem key={option.id} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label={t("admin.customMla.notes")}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ flex: 7 }}
              />
            </Box>
          </Box>
          <Box
            display="grid"
            columnGap="16px"
            rowGap="8px"
            sx={{
              gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" },
              gridTemplateAreas: {
                xs: '"textHead" "text" "previewHead" "preview"',
                md: '"textHead previewHead" "text preview"',
              },
            }}
          >
            <PaneHeader
              area="textHead"
              title={t("admin.customMla.textTitle")}
              caption={t("admin.customMla.textCaption", {
                example: "{{market.apr}}",
                interpolation: { escapeValue: false },
              })}
            />
            <TextField
              value={plaintext}
              onChange={(e) => setPlaintext(e.target.value)}
              disabled={isLoadingStart}
              placeholder={
                isLoadingStart ? t("admin.customMla.loadingTemplate") : ""
              }
              multiline
              rows={20}
              fullWidth
              inputProps={{ "aria-label": t("admin.customMla.textTitle") }}
              sx={{ gridArea: "text", ...paneField(PANE_HEIGHT) }}
            />
            <PaneHeader
              area="previewHead"
              title={t("admin.customMla.previewTitle")}
              caption={t("admin.customMla.previewCaption")}
            />
            <MlaDocument
              html={previewHtml}
              title={t("admin.customMla.preview")}
              sx={{ gridArea: "preview", height: PANE_HEIGHT, minHeight: 0 }}
            />
          </Box>
          {unplaced.length > 0 && (
            <MessageList
              title={t("admin.customMla.unplacedTitle")}
              lines={unplaced.map((edit) =>
                t(`admin.customMla.unplaced.${edit.kind}`, {
                  text: excerpt(edit.text),
                  interpolation: { escapeValue: false },
                }),
              )}
              color={COLORS.wildWatermelon}
            />
          )}
          {prepared && prepared.problems.length > 0 && (
            <MessageList
              title={t("admin.customMla.problems")}
              lines={prepared.problems}
              color={COLORS.wildWatermelon}
            />
          )}
          {gaps.length > 0 && (
            <MessageList
              title={t("admin.customMla.missingTitle")}
              lines={gaps.map(({ line }) => excerpt(line))}
              color={COLORS.santasGrey}
            />
          )}
          {showHtml && (
            <Box display="flex" flexDirection="column" gap="8px">
              <PaneHeader
                title={t("admin.customMla.htmlTitle")}
                caption={t("admin.customMla.htmlCaption")}
              />
              <TextField
                value={body}
                onChange={(e) => handleEditHtml(e.target.value)}
                multiline
                rows={14}
                fullWidth
                inputProps={{
                  "aria-label": t("admin.customMla.htmlTitle"),
                  spellCheck: false,
                  style: CODE_FONT,
                }}
                sx={paneField(HTML_PANE_HEIGHT)}
              />
            </Box>
          )}
          {error && (
            <Typography variant="text3" color={COLORS.wildWatermelon}>
              {error.message}
            </Typography>
          )}
          <Box
            display="flex"
            justifyContent="space-between"
            alignItems="center"
            gap="12px"
          >
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowHtml((shown) => !shown)}
            >
              {showHtml
                ? t("admin.customMla.hideHtml")
                : t("admin.customMla.editHtml")}
            </Button>
            <Box display="flex" gap="12px">
              <Button
                variant="outlined"
                size="large"
                disabled={!synced || isDownloading}
                onClick={handleDownloadPdf}
              >
                {isDownloading
                  ? t("admin.customMla.preparingPdf")
                  : t("admin.customMla.downloadPdf")}
              </Button>
              <Button
                variant="contained"
                size="large"
                disabled={!isComplete || isPending}
                onClick={handleSubmit}
                sx={{ minWidth: "200px" }}
              >
                {isPending
                  ? t("admin.customMla.registering")
                  : t("admin.customMla.submit")}
              </Button>
            </Box>
          </Box>
        </Box>
      </Dialog>
    </>
  )
}
