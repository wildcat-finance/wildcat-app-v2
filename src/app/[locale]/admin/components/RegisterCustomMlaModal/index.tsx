"use client"

import * as React from "react"
import { useState } from "react"

import {
  Box,
  Button,
  Dialog,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import { CustomMlaTemplateForAdminView } from "@/app/api/mla/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import {
  buildCustomMlaTemplate,
  fillWithPlaceholders,
  hasTemplateBraces,
} from "@/lib/mlaTemplateText"
import { COLORS } from "@/theme/colors"

import { useBorrowerOrganisations } from "../../hooks/useBorrowerOrganisations"
import {
  useCustomMlaTemplates,
  useRegisterCustomMla,
} from "../../hooks/useCustomMlaTemplates"

// The theme pins every TextField root to a fixed height, which clips a
// multi-line field and pushes its help text over the next field.
const GROWING_FIELD = {
  height: "auto",
  "& .MuiInputBase-root": {
    height: "auto",
    alignItems: "flex-start",
    padding: 0,
  },
}

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

/// Register a custom MLA for one borrower: the agreement text exactly as the
/// borrower supplied it.
export const RegisterCustomMlaModal = () => {
  const { t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [borrowerId, setBorrowerId] = useState("")
  const [name, setName] = useState("")
  const [version, setVersion] = useState("")
  const [description, setDescription] = useState("")
  const [text, setText] = useState("")

  const { data: organisations } = useBorrowerOrganisations()
  const { data: customMlas } = useCustomMlaTemplates()
  const { mutate, isPending, error, reset } = useRegisterCustomMla()

  const borrower = organisations?.find(({ id }) => id === borrowerId)
  const borrowerMlas =
    customMlas?.filter((mla) => mla.borrowerId === borrowerId) ?? []
  const hasBraces = hasTemplateBraces(text)
  const isComplete =
    !!borrowerId && !!name.trim() && !!version.trim() && !!text.trim()

  const handleSelectBorrower = (id: string) => {
    const selected = organisations?.find(
      (organisation) => organisation.id === id,
    )
    setBorrowerId(id)
    if (!selected) return
    setName(`${selected.name} MLA`)
    setVersion(
      nextCustomMlaVersion(
        customMlas?.filter((mla) => mla.borrowerId === id) ?? [],
      ),
    )
  }

  const handleClose = () => {
    if (isPending) return
    setIsOpen(false)
    setShowPreview(false)
    setBorrowerId("")
    setName("")
    setVersion("")
    setDescription("")
    setText("")
    reset()
  }

  const handleSubmit = () =>
    mutate(
      {
        borrowerId,
        name: name.trim(),
        version: version.trim(),
        description: description.trim() || undefined,
        text,
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
            onChange={(e) => handleSelectBorrower(e.target.value)}
            helperText={
              borrower &&
              (borrowerMlas.length === 0
                ? t("admin.customMla.firstForBorrower", {
                    borrower: borrower.name,
                    interpolation: { escapeValue: false },
                  })
                : t("admin.customMla.existingForBorrower", {
                    borrower: borrower.name,
                    count: borrowerMlas.length,
                    interpolation: { escapeValue: false },
                  }))
            }
            fullWidth
            sx={{ height: "auto" }}
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
            label={t("admin.customMla.text")}
            helperText={
              hasBraces
                ? t("admin.customMla.braces")
                : t("admin.customMla.textHelp")
            }
            error={hasBraces}
            value={text}
            onChange={(e) => setText(e.target.value)}
            multiline
            minRows={10}
            maxRows={24}
            fullWidth
            sx={GROWING_FIELD}
          />
          <Button
            variant="outlined"
            size="small"
            sx={{ width: "fit-content" }}
            disabled={!text.trim()}
            onClick={() => setShowPreview((shown) => !shown)}
          >
            {showPreview
              ? t("admin.customMla.hidePreview")
              : t("admin.customMla.showPreview")}
          </Button>
          {showPreview && (
            <iframe
              srcDoc={fillWithPlaceholders(buildCustomMlaTemplate(text))}
              title={t("admin.customMla.preview")}
              sandbox=""
              style={{
                width: "100%",
                height: "360px",
                border: `1px solid ${COLORS.whiteLilac}`,
              }}
            />
          )}
          {error && (
            <Typography variant="text3" color={COLORS.wildWatermelon}>
              {error.message}
            </Typography>
          )}
          <Button
            variant="contained"
            size="large"
            disabled={!isComplete || hasBraces || isPending}
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
