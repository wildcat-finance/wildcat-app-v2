import { Box, Button } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

export type AdminSection = "invitations" | "borrowers" | "kyc"

const SwitcherButton = ({
  label,
  section,
  activeSection,
  onSetSection,
}: {
  label: string
  section: AdminSection
  activeSection: AdminSection
  onSetSection: (section: AdminSection) => void
}) => (
  <Button
    variant="text"
    aria-pressed={activeSection === section}
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
  activeSection: AdminSection
  setActiveSection: (section: AdminSection) => void
}) => {
  const { t } = useTranslation()

  return (
    <Box
      sx={{
        width: "fit-content",
        display: "flex",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <SwitcherButton
        label={t("admin.invites.pendingTitle")}
        section="invitations"
        activeSection={activeSection}
        onSetSection={setActiveSection}
      />

      <SwitcherButton
        label={t("admin.borrowers.registeredTitle")}
        section="borrowers"
        activeSection={activeSection}
        onSetSection={setActiveSection}
      />
      <SwitcherButton
        label={t("admin.kyc.adminTitle")}
        section="kyc"
        activeSection={activeSection}
        onSetSection={setActiveSection}
      />
    </Box>
  )
}
