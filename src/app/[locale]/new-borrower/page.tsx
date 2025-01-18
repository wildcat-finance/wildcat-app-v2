"use client"

import React from "react"

import { Box } from "@mui/material"
import { useTranslation } from "react-i18next"

import { MarketsSection } from "@/app/[locale]/new-borrower/components/MarketsSection"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { BorrowerDashboardSections } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"

export default function BorrowerPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  const section = useAppSelector((state) => state.borrowerDashboard.section)

  return (
    <Box
      sx={{
        height: "calc(100vh - 43px - 43px - 52px)",
        padding: "32px 0 0",
        overflow: "hidden",
      }}
    >
      {section === BorrowerDashboardSections.MARKETS && <MarketsSection />}
    </Box>
  )
}
