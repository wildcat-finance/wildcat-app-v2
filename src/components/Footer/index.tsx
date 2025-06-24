"use client"

import { Box, Button, Divider, Typography, useMediaQuery } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"
import { theme } from "@/theme/theme"
import { dayjs } from "@/utils/dayjs"

import { ContentContainer, DownloadIcon, DeployInfoSx } from "./style"

const DEPLOY_DATE_FORMAT = "DD.MM.YYYY HH:mm"

const getCommitInfo = (isMobile: boolean) => {
  if (
    process.env.NODE_ENV !== "production" ||
    !process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  )
    return null

  return (
    <Box
      sx={
        isMobile
          ? {
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }
          : DeployInfoSx
      }
    >
      <Link
        href={`${process.env.NEXT_PUBLIC_GIT_WILDCAT_URL}/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
        target="_blank"
        style={{
          display: "flex",
          justifyContent: "center",
          color: isMobile ? COLORS.white06 : COLORS.santasGrey,
        }}
      >
        <Typography
          variant="text4"
          color={isMobile ? COLORS.white06 : COLORS.santasGrey}
        >
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}
        </Typography>
      </Link>

      <Typography
        variant="text4"
        sx={{
          textAlign: { xs: "center", md: "left" },
          color: { xs: COLORS.white06, md: COLORS.santasGrey },
        }}
      >
        {dayjs(process.env.BUILD_TIME).format(DEPLOY_DATE_FORMAT)}
      </Typography>
    </Box>
  )
}

const COMMIT_INFO = getCommitInfo(false)

export const Footer = ({ showFooter = true }: { showFooter?: boolean }) => {
  const isMobile = useMobileResolution()
  const { t } = useTranslation()
  const pathname = usePathname()
  const showFooterOnPage = pathname !== "/agreement"

  if (isMobile)
    return (
      <Box marginTop="4px">
        <Divider sx={{ borderColor: COLORS.white06 }} />

        <Box
          sx={{
            padding: "24px 20px 20px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          <Typography variant="text4" textAlign="center" color={COLORS.white06}>
            {t("footer.rights")}
          </Typography>

          {COMMIT_INFO}
        </Box>
      </Box>
    )

  if (!isMobile && showFooter)
    return (
      <Box sx={ContentContainer}>
        {showFooterOnPage && (
          <Link
            href="/pdf/Wildcat_Terms_of_Use.pdf"
            target="_blank"
            style={{ width: "fit-content", marginBottom: "8px" }}
          >
            <Button
              variant="text"
              size="small"
              sx={{
                padding: 0,
                color: COLORS.blackRock,
                "&:hover": {
                  background: "transparent",
                  color: COLORS.blackRock,
                  boxShadow: "none",
                },
              }}
            >
              {t("footer.agreement")}
              <Box sx={DownloadIcon}>⇤</Box>
            </Button>
          </Link>
        )}
        <Typography
          variant="text4"
          color={COLORS.santasGrey}
          sx={{ marginBottom: COMMIT_INFO ? "8px" : 0 }}
        >
          {t("footer.rights")}
        </Typography>

        {COMMIT_INFO}
      </Box>
    )

  return null
}
