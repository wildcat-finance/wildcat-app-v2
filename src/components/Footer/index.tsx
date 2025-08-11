"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { useAppDispatch } from "@/store/hooks"
import { setIsVisible } from "@/store/slices/cookieBannerSlice/cookieBannerSlice"
import { COLORS } from "@/theme/colors"
import { dayjs } from "@/utils/dayjs"

import {
  ContentContainer,
  DownloadIcon,
  CommitHashLinkSx,
  DeployInfoSx,
} from "./style"

const DEPLOY_DATE_FORMAT = "DD.MM.YYYY HH:mm"

const getCommitInfo = () => {
  if (
    process.env.NODE_ENV !== "production" ||
    !process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA
  )
    return null

  return (
    <Box sx={DeployInfoSx}>
      <Link
        href={`${process.env.NEXT_PUBLIC_GIT_WILDCAT_URL}/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
        target="_blank"
        style={CommitHashLinkSx}
      >
        <Typography variant="text4" color={COLORS.santasGrey}>
          {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA.slice(0, 7)}
        </Typography>
      </Link>

      <Box
        sx={{
          width: "2px",
          height: "2px",
          borderRadius: "50%",
          bgcolor: COLORS.santasGrey,
        }}
      />

      <Typography variant="text4" color={COLORS.santasGrey}>
        {dayjs(process.env.BUILD_TIME).format(DEPLOY_DATE_FORMAT)}
      </Typography>
    </Box>
  )
}

const COMMIT_INFO = getCommitInfo()

export const Footer = () => {
  const dispatch = useAppDispatch()

  const { t } = useTranslation()
  const pathname = usePathname()
  const showFooter = pathname !== "/agreement"

  const handleOpenCookiesModal = () => {
    dispatch(setIsVisible(true))
  }

  return (
    <Box sx={ContentContainer}>
      {showFooter && (
        <>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            sx={{
              borderRadius: "8px",
              marginBottom: "8px",
            }}
            onClick={handleOpenCookiesModal}
          >
            Cookies Settings
          </Button>

          <Link
            href="/pdf/Wildcat_Terms_of_Use.pdf"
            target="_blank"
            style={{
              display: "flex",
              textDecoration: "none",
              marginBottom: "4px",
            }}
          >
            <Typography variant="text4" sx={{ display: "flex", gap: "2px" }}>
              {t("footer.agreement")} <Box sx={{ rotate: "270deg" }}>⇤</Box>
            </Typography>
          </Link>

          <Link
            href="https://docs.wildcat.finance/legal/protocol-ui-privacy-policy"
            target="_blank"
            style={{
              display: "flex",
              textDecoration: "none",
              marginBottom: "8px",
            }}
          >
            <Typography variant="text4">Privacy Policy</Typography>
          </Link>
        </>
      )}

      <Typography
        variant="text4"
        color={COLORS.santasGrey}
        sx={{ marginBottom: COMMIT_INFO ? "2px" : 0 }}
      >
        {t("footer.rights")}
      </Typography>

      {COMMIT_INFO}
    </Box>
  )
}
