import { Box, Button } from "@mui/material"
import Link from "next/link"

export const AgreementActions = () => {
  const a = "a"
  return (
    <Box
      sx={{
        position: "absolute",
        bottom: "0",
        width: "100%",
        justifyContent: "center",
        paddingBottom: "44px",
        display: "flex",
        gap: "16px",
      }}
    >
      <Button
        variant="contained"
        size="large"
        sx={{ width: "168.63px", height: "44px" }}
      >
        Sign and continue
      </Button>
      <Link
        href="/pdf/Wildcat_Protocol_Services_Agreement.pdf"
        target="_blank"
        download
      >
        <Button
          variant="contained"
          color="secondary"
          size="large"
          sx={{ width: "168.63px", height: "44px" }}
        >
          Download
        </Button>
      </Link>
    </Box>
  )
}
