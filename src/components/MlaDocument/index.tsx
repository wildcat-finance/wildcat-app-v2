"use client"

import { useMemo } from "react"

import { Box, SxProps, Theme } from "@mui/material"

import { COLORS } from "@/theme/colors"

const LINK = /<a\b([^>]*)>/gi
const TARGET_OR_REL = /\s(?:target|rel)\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi
const OUTSIDE_HREF = /\bhref\s*=\s*["']?\s*(?:https?:|mailto:)/i

/// The agreement's HTML with every link to another page set to open in a new
/// tab. A link without a target would load in the frame in place of the
/// agreement. Links within the agreement (`#section`) stay as they are.
export const openLinksInNewTab = (html: string) =>
  html.replace(LINK, (tag, attributes: string) =>
    OUTSIDE_HREF.test(attributes)
      ? `<a${attributes.replace(
          TARGET_OR_REL,
          "",
        )} target="_blank" rel="noopener noreferrer">`
      : tag,
  )

/// What the frame may do: open its links in new tabs, which load as ordinary
/// pages. It still runs no scripts and has no access to the app's origin.
export const MLA_DOCUMENT_SANDBOX =
  "allow-popups allow-popups-to-escape-sandbox"

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
}) => {
  const document = useMemo(() => openLinksInNewTab(html), [html])
  return (
    <Box
      component="iframe"
      srcDoc={document}
      title={title}
      sandbox={MLA_DOCUMENT_SANDBOX}
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
}
