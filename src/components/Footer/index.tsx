"use client"

import { Box, Button, Typography } from "@mui/material"
import dayjs from "dayjs"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

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
    <div style={DeployInfoSx}>
      <Link
        href={`${process.env.NEXT_PUBLIC_GIT_WILDCAT_URL}/${process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}`}
        target="_blank"
        style={CommitHashLinkSx}
      >
        {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA}
      </Link>
      {dayjs(process.env.BUILD_TIME).format(DEPLOY_DATE_FORMAT)}
    </div>
  )
}

const COMMIT_INFO = getCommitInfo()

export const Footer = () => {
  const { t } = useTranslation()
  const pathname = usePathname()
  const showFooter = pathname !== "/agreement"

  return (
    <Box sx={ContentContainer}>
      {showFooter && (
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
      <Typography variant="text4" color={COLORS.santasGrey}>
        {COMMIT_INFO}
      </Typography>
    </Box>
  )
}
