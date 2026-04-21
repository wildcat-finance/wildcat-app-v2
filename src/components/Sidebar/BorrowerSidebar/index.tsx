import { Box, Button, Typography } from "@mui/material"
import { usePathname } from "next/navigation"

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
    <Box display="flex" flexDirection="column" rowGap="6px" width="100%">
      {resolved.tabs.map((tab) => {
        const isActive = tab.value === currentTab

        return (
          <Box
            key={tab.value}
            component="button"
            type="button"
            onClick={() => setCurrentTab(tab.value)}
            sx={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              padding: "10px 12px",
              borderRadius: "10px",
              border: `1px solid ${
                isActive ? COLORS.hawkesBlue : COLORS.athensGrey
              }`,
              backgroundColor: isActive ? COLORS.glitter : COLORS.whiteSmoke,
              transition: "background-color 120ms, border-color 120ms",
              "&:hover": {
                backgroundColor: isActive ? COLORS.glitter : COLORS.athensGrey,
              },
            }}
          >
            <Typography
              variant="text3"
              sx={{
                color: COLORS.blackRock,
                fontWeight: isActive ? 600 : 500,
              }}
            >
              {tab.label}
            </Typography>
          </Box>
        )
      })}
    </Box>
  )
}

export const BorrowerSidebar = () => {
  const pathname = usePathname()
  const isLenderProfile = pathname.includes(ROUTES.lender.profile)
  const isEditProfile = pathname.includes(ROUTES.borrower.editProfile)

  const backLink = pathname.includes(ROUTES.borrower.profile)
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
