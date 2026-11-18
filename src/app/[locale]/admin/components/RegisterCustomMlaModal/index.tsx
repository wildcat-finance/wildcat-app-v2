"use client"

import * as React from "react"
import { useMemo, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import {
  MlaFieldValueKey,
  MlaFieldValueKeys,
  MlaTemplateField,
} from "@/lib/mlaFields"
import {
  deriveTemplateFields,
  isLenderField,
  plaintextToHtml,
  validateTemplateFields,
} from "@/lib/mlaTemplateText"
import { COLORS } from "@/theme/colors"

import { useBorrowerOrganisations } from "../../hooks/useBorrowerOrganisations"
import { useRegisterCustomMla } from "../../hooks/useCustomMlaTemplates"

const BORROWER_SOURCES = MlaFieldValueKeys.filter(
  (source) => !isLenderField(source),
)
const LENDER_SOURCES = MlaFieldValueKeys.filter(isLenderField)

const FieldList = ({
  title,
  fields,
  sources,
  onChange,
}: {
  title: string
  fields: MlaTemplateField[]
  sources: readonly MlaFieldValueKey[]
  onChange: (fields: MlaTemplateField[]) => void
}) => {
  const { t } = useTranslation()
  const update = (index: number, field: Partial<MlaTemplateField>) =>
    onChange(
      fields.map((current, i) =>
        i === index ? { ...current, ...field } : current,
      ),
    )
  return (
    <Box display="flex" flexDirection="column" gap="8px">
      <Typography variant="text2">{title}</Typography>
      {fields.map((field, index) => (
        <Box
          // eslint-disable-next-line react/no-array-index-key
          key={index}
          display="flex"
          gap="8px"
          alignItems="center"
        >
          <TextField
            select
            size="small"
            label={t("admin.customMla.fieldSource")}
            value={field.source}
            onChange={(e) =>
              update(index, { source: e.target.value as MlaFieldValueKey })
            }
            sx={{ width: "45%" }}
          >
            {sources.map((source) => (
              <MenuItem key={source} value={source}>
                {source}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label={t("admin.customMla.fieldPlaceholder")}
            value={field.placeholder}
            onChange={(e) => update(index, { placeholder: e.target.value })}
            sx={{ flex: 1 }}
          />
          <IconButton
            aria-label={t("admin.customMla.removeField")}
            onClick={() => onChange(fields.filter((_, i) => i !== index))}
          >
            ×
          </IconButton>
        </Box>
      ))}
      <Button
        variant="text"
        size="small"
        sx={{ width: "fit-content" }}
        onClick={() =>
          onChange([
            ...fields,
            { source: sources[0], placeholder: `[${sources[0]}]` },
          ])
        }
      >
        {t("admin.customMla.addField")}
      </Button>
    </Box>
  )
}

/// Register a custom MLA, entered by hand, for one borrower.
export const RegisterCustomMlaModal = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [borrowerId, setBorrowerId] = useState("")
  const [name, setName] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [plaintext, setPlaintext] = useState("")
  const [html, setHtml] = useState("")
  const [borrowerFields, setBorrowerFields] = useState<MlaTemplateField[]>([])
  const [lenderFields, setLenderFields] = useState<MlaTemplateField[]>([])

  const { data: organisations } = useBorrowerOrganisations()
  const { mutate, isPending, error, reset } = useRegisterCustomMla()

  const effectiveHtml = html.trim() ? html : plaintextToHtml(plaintext)
  const problems = useMemo(
    () =>
      plaintext.trim()
        ? validateTemplateFields({
            plaintext,
            html: effectiveHtml,
            borrowerFields,
            lenderFields,
          })
        : [],
    [plaintext, effectiveHtml, borrowerFields, lenderFields],
  )
  const isComplete =
    !!borrowerId && !!name.trim() && !!version.trim() && !!plaintext.trim()

  const handleClose = () => {
    if (isPending) return
    setIsOpen(false)
    setShowPreview(false)
    setBorrowerId("")
    setName("")
    setVersion("")
    setDescription("")
    setPlaintext("")
    setHtml("")
    setBorrowerFields([])
    setLenderFields([])
    reset()
  }

  const handleDetectFields = () => {
    const derived = deriveTemplateFields(
      [plaintext, html],
      [...borrowerFields, ...lenderFields],
    )
    setBorrowerFields(derived.borrowerFields)
    setLenderFields(derived.lenderFields)
  }

  const handleSubmit = () =>
    mutate(
      {
        borrowerId,
        name: name.trim(),
        version: version.trim(),
        description: description.trim() || undefined,
        plaintext,
        html: html.trim() ? html : undefined,
        borrowerFields,
        lenderFields,
      },
      { onSuccess: handleClose },
    )

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
        maxWidth="md"
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
          gap="16px"
          sx={{ overflowY: "auto" }}
        >
          <TextField
            select
            label={t("admin.customMla.borrower")}
            value={borrowerId}
            onChange={(e) => setBorrowerId(e.target.value)}
            fullWidth
          >
            {organisations?.map((organisation) => (
              <MenuItem key={organisation.id} value={organisation.id}>
                {organisation.alias
                  ? `${organisation.name} (${organisation.alias})`
                  : organisation.name}
              </MenuItem>
            ))}
          </TextField>
          <Box display="flex" gap="12px">
            <TextField
              label={t("admin.customMla.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={{ flex: 2 }}
            />
            <TextField
              label={t("admin.customMla.version")}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              sx={{ flex: 1 }}
            />
          </Box>
          <TextField
            label={t("admin.customMla.notes")}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            fullWidth
          />
          <TextField
            label={t("admin.customMla.plaintext")}
            helperText={t("admin.customMla.plaintextHelp", {
              borrowerExample: "{{borrower.name}}",
              lenderExample: "{{lender.address}}",
            })}
            value={plaintext}
            onChange={(e) => setPlaintext(e.target.value)}
            multiline
            minRows={10}
            maxRows={24}
            fullWidth
          />
          <TextField
            label={t("admin.customMla.html")}
            helperText={t("admin.customMla.htmlHelp")}
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            multiline
            minRows={3}
            maxRows={16}
            fullWidth
          />
          <Box display="flex" gap="12px">
            <Button
              variant="outlined"
              size="small"
              disabled={!plaintext.trim()}
              onClick={handleDetectFields}
            >
              {t("admin.customMla.detectFields")}
            </Button>
            <Button
              variant="outlined"
              size="small"
              disabled={!plaintext.trim()}
              onClick={() => setShowPreview((shown) => !shown)}
            >
              {showPreview
                ? t("admin.customMla.hidePreview")
                : t("admin.customMla.showPreview")}
            </Button>
          </Box>
          {showPreview && (
            <iframe
              srcDoc={effectiveHtml}
              title={t("admin.customMla.preview")}
              sandbox=""
              style={{
                width: "100%",
                height: "360px",
                border: `1px solid ${COLORS.whiteLilac}`,
              }}
            />
          )}
          <FieldList
            title={t("admin.customMla.borrowerFields")}
            fields={borrowerFields}
            sources={BORROWER_SOURCES}
            onChange={setBorrowerFields}
          />
          <FieldList
            title={t("admin.customMla.lenderFields")}
            fields={lenderFields}
            sources={LENDER_SOURCES}
            onChange={setLenderFields}
          />
          {problems.length > 0 && (
            <Box component="ul" sx={{ margin: 0, paddingLeft: "20px" }}>
              {problems.map((problem) => (
                <Typography
                  component="li"
                  key={problem}
                  variant="text3"
                  color={COLORS.wildWatermelon}
                >
                  {problem}
                </Typography>
              ))}
            </Box>
          )}
          {error && (
            <Typography variant="text3" color={COLORS.wildWatermelon}>
              {error.message}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            disabled={!isComplete || problems.length > 0 || isPending}
            onClick={handleSubmit}
          >
            {isPending
              ? t("admin.customMla.registering")
              : t("admin.customMla.submit")}
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
