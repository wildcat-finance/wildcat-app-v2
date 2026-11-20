"use client"

import * as React from "react"
import { useState } from "react"

import { Box, Button, Dialog, Skeleton, Typography } from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { CustomMlaTemplateForAdminView } from "@/app/api/mla/interface"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"
import { timestampToDateFormatted } from "@/utils/formatters"

import {
  useCustomMlaTemplates,
  useRetireMlaTemplate,
} from "../../hooks/useCustomMlaTemplates"
import { RegisterCustomMlaModal } from "../RegisterCustomMlaModal"

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

/// Custom MLAs of the selected network's class, with registration and
/// retirement for admins.
export const CustomMlasTable = () => {
  const { t } = useTranslation()
  const { data, isLoading } = useCustomMlaTemplates()
  const [retiring, setRetiring] =
    useState<CustomMlaTemplateForAdminView | null>(null)

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
      minWidth: 100,
      align: "right",
      renderCell: ({ row }) =>
        row.retiredAt ? null : (
          <Button
            variant="text"
            color="error"
            size="small"
            onClick={() => setRetiring(row)}
          >
            {t("admin.customMla.retire")}
          </Button>
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
          sx={{ maxWidth: "calc(100vw - 267px)" }}
          autoHeight
          rows={data}
          columns={columns}
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
    </Box>
  )
}
