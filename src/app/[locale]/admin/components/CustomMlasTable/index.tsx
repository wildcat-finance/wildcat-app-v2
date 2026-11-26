"use client"

import * as React from "react"
import { useState } from "react"

import { Box, Button, Dialog, Skeleton, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { useGetMlaTemplate } from "@/app/[locale]/borrower/hooks/mla/useGetMlaTemplate"
import { CustomMlaTemplateForAdminView } from "@/app/api/mla/interface"
import { MlaDocument } from "@/components/MlaDocument"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { fillWithPlaceholders } from "@/lib/mlaTemplateText"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted } from "@/utils/formatters"
import { toMlaPdfFileName } from "@/utils/mlaPdfFileName"

import {
  useCustomMlaTemplates,
  useDownloadMlaPdf,
  useRetireMlaTemplate,
} from "../../hooks/useCustomMlaTemplates"
import { RegisterCustomMlaModal } from "../RegisterCustomMlaModal"

const NEWEST_FIRST = {
  sorting: { sortModel: [{ field: "createdAt", sort: "desc" as const }] },
}

const RetireMlaDialog = ({
  template,
  onClose,
}: {
  template: CustomMlaTemplateForAdminView
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const { mutate, isPending, error } = useRetireMlaTemplate()
  return (
    <Dialog
      open
      onClose={isPending ? undefined : onClose}
      sx={{
        "& .MuiDialog-paper": {
          width: "500px",
          borderRadius: "20px",
          padding: "24px 0",
        },
      }}
    >
      <TxModalHeader
        title={t("admin.customMla.retireTitle")}
        crossOnClick={onClose}
        arrowOnClick={null}
      />
      <Box padding="0 24px" display="flex" flexDirection="column" gap="16px">
        <Typography variant="text3" color={COLORS.santasGrey}>
          {t("admin.customMla.retireDescription", {
            name: template.name,
            version: template.version,
            borrower: template.borrowerName,
            interpolation: { escapeValue: false },
          })}
        </Typography>
        {error && (
          <Typography variant="text3" color={COLORS.wildWatermelon}>
            {error.message}
          </Typography>
        )}
        <Button
          variant="contained"
          color="error"
          disabled={isPending}
          onClick={() => mutate(template.id, { onSuccess: onClose })}
        >
          {t("admin.customMla.retire")}
        </Button>
      </Box>
    </Dialog>
  )
}

/// A custom MLA as borrowers and lenders read it, placeholders in brackets.
const ViewMlaDialog = ({
  template,
  onClose,
}: {
  template: CustomMlaTemplateForAdminView
  onClose: () => void
}) => {
  const { t } = useTranslation()
  const { data, isLoading } = useGetMlaTemplate(template.id)
  const { mutate: download, isPending: isDownloading } = useDownloadMlaPdf()
  const html = data ? fillWithPlaceholders(data) : ""
  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      sx={{
        "& .MuiDialog-paper": { borderRadius: "20px", padding: "24px 0" },
      }}
    >
      <TxModalHeader
        title={`${template.name} (${template.version})`}
        crossOnClick={onClose}
        arrowOnClick={null}
      >
        <Box sx={{ padding: "0 24px" }}>
          <Typography variant="text3" color={COLORS.santasGrey}>
            {template.borrowerName}
          </Typography>
        </Box>
      </TxModalHeader>
      <Box padding="24px" display="flex" flexDirection="column" gap="16px">
        {isLoading ? (
          <Skeleton
            variant="rounded"
            height="560px"
            sx={{ bgcolor: COLORS.athensGrey }}
          />
        ) : (
          <MlaDocument html={html} title={t("admin.customMla.preview")} />
        )}
        <Box display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            size="large"
            disabled={!data || isDownloading}
            onClick={() =>
              download({
                html,
                fileName: toMlaPdfFileName(template.name, template.version),
              })
            }
          >
            {isDownloading
              ? t("admin.customMla.preparingPdf")
              : t("admin.customMla.downloadPdf")}
          </Button>
        </Box>
      </Box>
    </Dialog>
  )
}

/// Custom MLAs of the selected network's class, newest first, with
/// registration, viewing, download and retirement for admins. Clicking a row
/// views its MLA.
export const CustomMlasTable = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useCustomMlaTemplates()
  const [retiring, setRetiring] =
    useState<CustomMlaTemplateForAdminView | null>(null)
  const [viewing, setViewing] = useState<CustomMlaTemplateForAdminView | null>(
    null,
  )
  const {
    mutate: download,
    isPending: isDownloading,
    variables: downloadRequest,
  } = useDownloadMlaPdf()
  const downloadingId =
    isDownloading && downloadRequest && "templateId" in downloadRequest
      ? downloadRequest.templateId
      : undefined

  const columns: GridColDef<CustomMlaTemplateForAdminView>[] = [
    {
      field: "borrowerName",
      headerName: t("admin.customMla.borrower"),
      flex: 1.5,
      minWidth: 160,
    },
    { field: "name", headerName: t("admin.customMla.name"), flex: 1.5 },
    { field: "version", headerName: t("admin.customMla.version"), flex: 0.7 },
    {
      field: "createdAt",
      headerName: t("admin.customMla.added"),
      type: "dateTime",
      flex: 1,
      minWidth: 150,
      valueGetter: (value) => new Date(value),
      valueFormatter: (value: Date) => timestampToDateFormatted(+value / 1000),
    },
    {
      field: "marketCount",
      headerName: t("admin.customMla.markets"),
      flex: 0.6,
    },
    {
      field: "retiredAt",
      headerName: t("admin.customMla.status"),
      flex: 1,
      renderCell: ({ value }) =>
        value
          ? t("admin.customMla.retiredOn", {
              date: timestampToDateFormatted(+new Date(value) / 1000),
            })
          : t("admin.customMla.active"),
    },
    {
      field: "id",
      headerName: "",
      sortable: false,
      minWidth: 260,
      align: "right",
      renderCell: ({ row }) => (
        <Box display="flex" justifyContent="flex-end" gap="4px" width="100%">
          <Button
            variant="text"
            size="small"
            onClick={(event) => {
              event.stopPropagation()
              setViewing(row)
            }}
          >
            {t("admin.customMla.view")}
          </Button>
          <Button
            variant="text"
            size="small"
            disabled={downloadingId === row.id}
            onClick={(event) => {
              event.stopPropagation()
              download({
                templateId: row.id,
                fileName: toMlaPdfFileName(row.name, row.version),
              })
            }}
          >
            {downloadingId === row.id
              ? t("admin.customMla.preparingPdf")
              : t("admin.customMla.download")}
          </Button>
          {!row.retiredAt && (
            <Button
              variant="text"
              color="error"
              size="small"
              onClick={(event) => {
                event.stopPropagation()
                setRetiring(row)
              }}
            >
              {t("admin.customMla.retire")}
            </Button>
          )}
        </Box>
      ),
    },
  ]

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        gap: 3,
        paddingTop: "24px",
      }}
    >
      <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
        <RegisterCustomMlaModal />
      </Box>
      {isLoading && (
        <Skeleton
          height="52px"
          width="100%"
          sx={{ bgcolor: COLORS.athensGrey }}
        />
      )}
      {!isLoading && !data?.length && (
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ textAlign: "center", padding: "32px 0" }}
        >
          {t("admin.customMla.empty")}
        </Typography>
      )}
      {!isLoading && !!data?.length && (
        <DataGrid
          sx={{
            maxWidth: "calc(100vw - 267px)",
            "& .MuiDataGrid-row": { cursor: "pointer" },
          }}
          autoHeight
          rows={data}
          columns={columns}
          initialState={NEWEST_FIRST}
          onRowClick={({ row }) => setViewing(row)}
          columnHeaderHeight={40}
          hideFooter={data.length <= 100}
        />
      )}
      {retiring && (
        <RetireMlaDialog
          template={retiring}
          onClose={() => setRetiring(null)}
        />
      )}
      {viewing && (
        <ViewMlaDialog template={viewing} onClose={() => setViewing(null)} />
      )}
    </Box>
  )
}
