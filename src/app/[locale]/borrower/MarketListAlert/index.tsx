import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"

export const MarketListAlert = () => {
  const alertState = "whitelist"

  return (
    <Box
      className="test"
      sx={{
        width: "100%",
        height: "min-content",

        display: "flex",
        flexDirection: "column",
        gap: "24px",

        padding: "28px 40px 32px 32px",
        marginBottom: "32px",
        borderRadius: "16px",
        color: "white",
        backgroundColor: "black",
      }}
    >
      <Box
        sx={{
          width: "400px",
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        }}
      >
        <Typography variant="title2">Apply to become a borrower</Typography>
        <Typography variant="text2" sx={{ color: "#FFFFFF99" }}>
          We see you aren&apos;t whitelisted as a borrower. Please complete this
          Typeform and we&apos;ll reach out for next steps.
        </Typography>
      </Box>
      <Link href="https://forms.gle/irca7KeC7ASmkRh16" target="_blank">
        <Button
          size="large"
          sx={{
            width: "196px",
            backgroundColor: "#FFFFFF",
            color: "#111111",
            border: "none",
            "&:hover": {
              background: "#DEDEDE",
              boxShadow: "none",
            },
          }}
        >
          Leave a Request
        </Button>
      </Link>
    </Box>
  )
}
