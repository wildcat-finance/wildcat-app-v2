"use client"

import { Box, Button, Typography } from "@mui/material"
import dayjs from "dayjs"
import Link from "next/link"
import { usePathname } from "next/navigation"

import {
  ContentContainer,
  DownloadIcon,
  CommitHashLinkSx,
  DeployInfoSx,
} from "./style"

const DEPLOY_DATE_FORMAT = "DD.MM.YYYY HH:mm"

const getCommitInfo = () => {
  if (process.env.NODE_ENV !== "production" || !process.env.COMMIT_HASH)
    return null

  return (
    <div style={DeployInfoSx}>
      <Link
        href={`${process.env.NEXT_PUBLIC_GIT_WILDCAT_URL}/8bf7cc1`}
        target="_blank"
        style={CommitHashLinkSx}
      >
        {process.env.COMMIT_HASH}
      </Link>
      {dayjs(process.env.BUILD_TIME).format(DEPLOY_DATE_FORMAT)}
    </div>
  )
}

const COMMIT_INFO = getCommitInfo()

export const Footer = () => {
  const pathname = usePathname()
  const showFooter = pathname !== "/agreement"

  return (
    <Box sx={ContentContainer}>
      <Typography variant="text4">
        Wildcat © All Rights reserved. 2023
      </Typography>
      <div>{COMMIT_INFO}</div>
      {showFooter && (
        <Link
          href="/pdf/Wildcat_Protocol_Services_Agreement.pdf"
          target="_blank"
        >
          <Button variant="text" size="small">
            <Typography variant="text4">Download Agreement</Typography>
            <Box sx={DownloadIcon}>⇤</Box>
          </Button>
        </Link>
      )}
    </Box>
  )
}
