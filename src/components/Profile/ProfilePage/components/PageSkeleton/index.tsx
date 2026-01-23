import * as React from "react"
import { useEffect, useState } from "react"

import { Box, Divider, Skeleton, SvgIcon, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import {
  InfoColumn,
  InfoContainer,
  InfoDivider,
} from "@/components/Profile/components/OverallBlock/style"
import {
  MobileBackButton,
  MobileBackButtonIcon,
  MobileDivider,
  MobileNameBlockContainer,
  MobileSwitchContainer,
} from "@/components/Profile/ProfilePage/components/MobileNamePageBlockWrapper/style"
import {
  ProfileNamePageBlockButtonsContainer,
  ProfileNamePageBlockContainer,
  ProfileNamePageBlockLinksContainer,
} from "@/components/Profile/ProfilePage/components/ProfileNamePageBlock/style"
import {
  MobileContentContainer,
  PageContentContainer,
} from "@/components/Profile/ProfilePage/style"
import { ROUTES } from "@/routes"

import { ProfilePageSkeletonProps } from "./interface"
import {
  MarketsSectionSkeletonContainer,
  MarketsSkeletonContainer,
  MobileMarketsSectionSkeletonContainer,
  ParametersItemSkeletonContainer,
} from "./style"

export const ParametersItemSkeleton = () => (
  <Box sx={ParametersItemSkeletonContainer}>
    <Skeleton
      sx={{
        width: "75px",
        height: "20px",
      }}
    />

    <Skeleton
      sx={{
        width: "75px",
        height: "20px",
      }}
    />
  </Box>
)

export const ProfilePageSkeleton = ({
  isExternal,
  isMobile,
}: ProfilePageSkeletonProps) => {
  const { t } = useTranslation()

  const pathname = usePathname()
  const backLink = pathname.includes(ROUTES.borrower.profile)
    ? ROUTES.borrower.root
    : ROUTES.lender.root

  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (isMobile)
    return (
      <Box sx={MobileContentContainer}>
        <Box sx={MobileNameBlockContainer}>
          <Link href={backLink} style={MobileBackButton}>
            <SvgIcon sx={MobileBackButtonIcon}>
              <Arrow />
            </SvgIcon>
          </Link>

          <Box sx={{ ...ProfileNamePageBlockContainer, alignItems: "center" }}>
            <Skeleton
              sx={{
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                marginBottom: "12px",
              }}
            />

            <Skeleton
              sx={{ width: "150px", height: "32px", marginBottom: "12px" }}
            />

            <Box
              sx={{
                ...ProfileNamePageBlockLinksContainer,
                marginBottom: "16px",
              }}
            >
              <Skeleton
                sx={{ height: "28px", width: "70px", borderRadius: "8px" }}
              />
              <Skeleton
                sx={{ height: "28px", width: "70px", borderRadius: "8px" }}
              />
              <Skeleton
                sx={{ height: "28px", width: "70px", borderRadius: "8px" }}
              />
            </Box>

            <Skeleton sx={{ width: "225px", height: "24px" }} />
          </Box>

          <Divider sx={MobileDivider} />

          <Box sx={MobileSwitchContainer}>
            <Skeleton sx={{ width: "100%", borderRadius: "10px" }} />
            <Skeleton sx={{ width: "100%", borderRadius: "10px" }} />
          </Box>
        </Box>

        <Box sx={MobileMarketsSectionSkeletonContainer}>
          <Skeleton sx={{ height: "154px", borderRadius: "14px" }} />
          <Skeleton sx={{ height: "154px", borderRadius: "14px" }} />
          <Skeleton sx={{ height: "154px", borderRadius: "14px" }} />
          <Skeleton sx={{ height: "154px", borderRadius: "14px" }} />
          <Skeleton sx={{ height: "154px", borderRadius: "14px" }} />
          <Skeleton sx={{ height: "154px", borderRadius: "14px" }} />
        </Box>
      </Box>
    )

  return (
    <Box sx={PageContentContainer}>
      <Box
        sx={ProfileNamePageBlockContainer}
        alignItems={isExternal ? "center" : "flex-start"}
      >
        <Skeleton
          sx={{
            width: "48px",
            height: "48px",
            borderRadius: "50%",
          }}
        />

        <Skeleton
          sx={{
            height: "40px",
            width: "300px",
            marginTop: isExternal ? "20px" : "24px",
          }}
        />

        <Skeleton sx={{ height: "40px", width: "500px", marginTop: "12px" }} />

        <Box
          sx={{
            ...ProfileNamePageBlockButtonsContainer,
            justifyContent: isExternal ? "center" : "space-between",
            marginTop: "22px",
          }}
        >
          <Box sx={ProfileNamePageBlockLinksContainer}>
            <Skeleton
              sx={{ height: "28px", width: "70px", borderRadius: "8px" }}
            />
            <Skeleton
              sx={{ height: "28px", width: "70px", borderRadius: "8px" }}
            />
            <Skeleton
              sx={{ height: "28px", width: "70px", borderRadius: "8px" }}
            />
          </Box>

          {!isExternal && (
            <Skeleton
              sx={{ height: "28px", width: "102px", borderRadius: "8px" }}
            />
          )}
        </Box>
      </Box>

      <Divider sx={{ marginY: "32px" }} />

      <Box>
        <Typography variant="title3">
          {t("borrowerProfile.profile.overallInfo.title")}
        </Typography>

        <Box sx={InfoContainer}>
          <Box sx={InfoColumn}>
            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>

            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>

            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>

            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>
          </Box>

          <Box sx={InfoColumn}>
            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>

            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>

            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>

            <Box>
              <ParametersItemSkeleton />
              <Divider sx={InfoDivider} />
            </Box>
          </Box>
        </Box>

        <Box sx={MarketsSectionSkeletonContainer}>
          <Typography variant="title3">
            {t("borrowerProfile.profile.activeMarkets.title")}
          </Typography>

          <Box sx={MarketsSkeletonContainer}>
            <Skeleton sx={{ height: "51px" }} />
            <Skeleton sx={{ height: "51px" }} />
            <Skeleton sx={{ height: "51px" }} />
            <Skeleton sx={{ height: "51px" }} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
