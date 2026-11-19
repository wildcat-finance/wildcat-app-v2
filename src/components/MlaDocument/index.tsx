"use client"

import { Box, SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

/// An MLA shown in place on the page. The HTML comes from a stored template or
/// agreement and holds names that borrowers and token deployers chose, so the
/// frame is sandboxed: no scripts, and no access to the app's origin. Every
/// view of an MLA renders through this component.
export const MlaDocument = ({
  html,
  title,
  sx,
}: {
  html: string
  title: string
  sx?: SxProps<Theme>
}) => (
  <Box
    component="iframe"
    srcDoc={html}
    title={title}
    sandbox=""
    sx={[
      {
        width: "100%",
        height: "70vh",
        minHeight: "480px",
        border: `1px solid ${COLORS.whiteLilac}`,
        borderRadius: "12px",
        backgroundColor: COLORS.white,
      },
      ...(Array.isArray(sx) ? sx : [sx]),
    ]}
  />
)
