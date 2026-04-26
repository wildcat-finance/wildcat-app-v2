import { Box, Button } from "@mui/material"
import { usePathname } from "next/navigation"
import { useAccount } from "wagmi"

import { BackButton } from "@/components/BackButton"
import {
  resolveProfileTabs,
  useProfileTab,
} from "@/components/Profile/shared/profileTabs"
import {
  ContentContainer,
  MenuItemButton,
} from "@/components/Sidebar/BorrowerSidebar/style"
import { useSelectedNetwork } from "@/hooks/useSelectedNetwork"
import { isHinterlightSupported } from "@/lib/hinterlight"
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
  const pathname = usePathname()
  const { address } = useAccount()
  const isLenderProfile = pathname.includes(ROUTES.lender.profile)
  const isEditProfile = pathname.includes(ROUTES.borrower.editProfile)

  const backLink = isBorrowerContextPath(pathname, address)
    ? ROUTES.borrower.root
    : ROUTES.lender.root

  const resolved = resolveProfileTabs(pathname)
  const { chainId } = useSelectedNetwork()
  const analyticsAvailable = isHinterlightSupported(chainId)
  const showTabs =
    !isEditProfile &&
    resolved !== null &&
    (resolved.kind === "borrower" || analyticsAvailable)

  return (
    <Box sx={ContentContainer}>
      <BackButton title="Back" link={backLink} />

      {showTabs && resolved ? (
        <ProfileTabList resolved={resolved} />
      ) : (
        <Box display="flex" flexDirection="column" rowGap="4px" width="100%">
          <Button variant="text" size="medium" sx={MenuItemButton}>
            {isEditProfile && "Edit "}
            {isLenderProfile ? "Lender" : "Borrower"} Profile
          </Button>
        </Box>
      )}
    </Box>
  )
}
