"use client"

import { Box } from "@mui/material"

import { COLORS } from "@/theme/colors"

/// An MLA shown in place on the page. The HTML comes from a stored template or
/// agreement; scripts are blocked.
export const MlaDocument = ({
  html,
  title,
}: {
  html: string
  title: string
}) => (
  <Box
    component="iframe"
    srcDoc={html}
    title={title}
    sandbox=""
    sx={{
      width: "100%",
      height: "70vh",
      minHeight: "480px",
      border: `1px solid ${COLORS.whiteLilac}`,
      borderRadius: "12px",
      backgroundColor: COLORS.white,
    }}
  />
)
