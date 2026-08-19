import { Box, Button } from "@mui/material"
import { usePathname, useSearchParams } from "next/navigation"
import { useTranslation } from "react-i18next"

import { BackButton } from "@/components/BackButton"
import {
  resolveProfileTabs,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { analyticsUiEnabled } from "@/config/featureFlags"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isSubgraphPricingConfigured } from "@/lib/subgraphCapabilities"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { isBorrowerContextPath } from "@/utils/profileRoutes"

const ProfileTabList = ({
  resolved,
}: {
  resolved: NonNullable<ReturnType<typeof resolveProfileTabs>>
}) => {
  const { currentTab, setCurrentTab } = useProfileTab(
    resolved.tabs,
    resolved.defaultTab,
  )

  return (
    <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
      {resolved.tabs.map((tab) => {
        const isActive = tab.value === currentTab

        return (
          <Button
            key={tab.value}
            type="button"
            variant="text"
            size="medium"
            onClick={() => setCurrentTab(tab.value)}
            sx={{
              ...MenuItemButton,
              backgroundColor: isActive ? COLORS.whiteSmoke : "transparent",
            }}
          >
            {tab.label}
          </Button>
        )
      })}
    </Box>
  )
}

export const BorrowerSidebar = () => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const isLenderProfile = pathname.includes(ROUTES.lender.profile)
  const isEditProfile = pathname.includes(ROUTES.borrower.editProfile)

  const backLink =
    isBorrowerContextPath(pathname) || searchParams.get("from") === "borrower"
      ? ROUTES.borrower.root
      : ROUTES.lender.root

  const resolved = resolveProfileTabs(pathname)
  const { chainId } = useSelectedNetwork()
  const analyticsAvailable = isSubgraphPricingConfigured(chainId)
  const showTabs =
    analyticsUiEnabled &&
    !isEditProfile &&
    resolved !== null &&
    (resolved.kind === "borrower" || analyticsAvailable)

  return (
    <Box sx={ContentContainer}>
      <BackButton title={t("common.buttons.back")} link={backLink} back />

      {showTabs && resolved ? (
        <ProfileTabList resolved={resolved} />
      ) : (
        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          <Button variant="text" size="medium" sx={MenuItemButton}>
            {isEditProfile
              ? t(
                  isLenderProfile
                    ? "nav.editLenderProfile"
                    : "nav.editBorrowerProfile",
                )
              : t(
                  isLenderProfile ? "nav.lenderProfile" : "nav.borrowerProfile",
                )}
          </Button>
        </Box>
      )}
    </Box>
  )
}
