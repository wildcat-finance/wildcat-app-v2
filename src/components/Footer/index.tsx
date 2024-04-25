"use client"

import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ContentContainer, DownloadIcon } from "@/components/Footer/style"

export const Footer = () => {
  const pathname = usePathname()
  const showFooter = pathname !== "/agreement"

  return (
    <Box sx={ContentContainer}>
      <Typography variant="text4Highlighted">
        Wildcat © All Rights reserved. 2023
      </Typography>
      {showFooter && (
        <Link
          href="/pdf/Wildcat_Protocol_Services_Agreement.pdf"
          target="_blank"
        >
          <Button variant="text" size="small">
            <Typography variant="text4Highlighted">
              Download Agreement
            </Typography>
            <Box sx={DownloadIcon}>⇤</Box>
          </Button>
        </Link>
      )}
    </Box>
  )
}
