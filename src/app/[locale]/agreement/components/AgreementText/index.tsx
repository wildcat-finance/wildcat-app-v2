import { Box, Skeleton, SxProps, Theme, Typography } from "@mui/material"

import { Markdown } from "@/components/Markdown"
import { COLORS } from "@/theme/colors"

const AgreementTextFrameSx = {
  width: "100%",
  minWidth: 0,
  alignSelf: "stretch",
  boxSizing: "border-box",
  maxHeight: {
    xs: "calc(100dvh - 300px)",
    md: "calc(100dvh - 330px)",
  },
}

export const AgreementText = ({
  markdown,
  isLoading,
  sx,
}: {
  markdown?: string
  isLoading?: boolean
  sx?: SxProps<Theme>
}) => {
  if (isLoading) {
    return (
      <Box
        sx={[
          {
            ...AgreementTextFrameSx,
            display: "flex",
            flexDirection: "column",
            rowGap: "12px",
            overflow: "hidden",
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {Array.from({ length: 18 }).map((_, i) => (
          <Skeleton
            // eslint-disable-next-line react/no-array-index-key
            key={i}
            variant="text"
            width={i % 5 === 4 ? "88%" : "100%"}
          />
        ))}
      </Box>
    )
  }

  if (!markdown) {
    return (
      <Typography variant="text2">
        Current Terms of Use are not available.
      </Typography>
    )
  }

  return (
    <Box
      sx={[
        {
          ...AgreementTextFrameSx,
          overflowX: "hidden",
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          rowGap: "20px",
          position: "relative",
          zIndex: 0,
          color: "#383838",
          paddingBottom: {
            xs: "96px",
            md: "112px",
          },
          overflowWrap: "anywhere",
          scrollbarColor: `${COLORS.greySuit} transparent`,
          scrollbarWidth: "thin",

          "&::-webkit-scrollbar": {
            width: "10px",
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-track": {
            backgroundColor: "transparent",
          },
          "&::-webkit-scrollbar-thumb": {
            backgroundColor: COLORS.greySuit,
            borderRadius: "999px",
            border: "2px solid transparent",
            backgroundClip: "content-box",
          },
          "&::-webkit-scrollbar-thumb:hover": {
            backgroundColor: COLORS.santasGrey,
          },

          "& .prose-rendered": {
            width: "100%",
            color: "inherit",
          },
          "& .prose-rendered > *:first-of-type": {
            marginTop: 0,
          },
          "& .prose-rendered > *:last-child": {
            marginBottom: 0,
          },
          "& .prose-rendered h1": {
            fontSize: "18px",
            lineHeight: "28px",
            margin: "0 0 16px",
            fontWeight: 600,
          },
          "& .prose-rendered h2": {
            fontSize: "17px",
            lineHeight: "27px",
            margin: "26px 0 8px",
            fontWeight: 600,
          },
          "& .prose-rendered h3, & .prose-rendered h4": {
            fontSize: "16px",
            lineHeight: "26px",
            margin: "22px 0 8px",
            fontWeight: 600,
          },
          "& .prose-rendered p, & .prose-rendered li": {
            fontSize: "16px",
            lineHeight: "26px",
            margin: 0,
            fontWeight: 400,
          },
          "& .prose-rendered p": {
            marginBottom: "16px",
          },
          "& .prose-rendered ul, & .prose-rendered ol": {
            margin: "0 0 16px",
            paddingLeft: "22px",
          },
          "& .prose-rendered li": {
            marginBottom: "8px",
          },
          "& .prose-rendered li:last-child": {
            marginBottom: 0,
          },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      <Markdown markdown={markdown} />
    </Box>
  )
}
