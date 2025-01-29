import React from "react"

import { Box, Button, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { useAppDispatch, useAppSelector } from "@/store/hooks"
import { setMarketSection } from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"

const SwitcherButton = ({
  label,
  section,
  activeSection,
  onSetSection,
}: {
  label: string
  section: string
  activeSection: string
  onSetSection: (section: string) => void
}) => (
  <Button
    variant="text"
    onClick={() => onSetSection(section)}
    sx={{
      gap: "6px",
      padding: "6px 16px",
      fontWeight: activeSection === section ? 600 : 500,
      backgroundColor:
        activeSection === section ? COLORS.whiteSmoke : "transparent",
    }}
  >
    {label}
  </Button>
)

export const AdminSectionSwitcher = ({
  activeSection,
  setActiveSection,
}: {
  activeSection: string
  setActiveSection: (section: string) => void
}) => {
  const { t } = useTranslation()

  return (
    <Box sx={{ width: "fit-content", display: "flex", gap: "12px" }}>
      <SwitcherButton
        label="Pending Invitations"
        section="invitations"
        activeSection={activeSection}
        onSetSection={setActiveSection}
      />

      <SwitcherButton
        label="Registered Borrowers"
        section="borrowers"
        activeSection={activeSection}
        onSetSection={setActiveSection}
      />
    </Box>
  )
}
