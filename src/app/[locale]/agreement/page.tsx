import { Box, Typography } from "@mui/material"
import { AgreementActions } from "@/app/[locale]/agreement/AgreementActions"
import { AgreementText } from "@/app/[locale]/agreement/AgreementText"

export default async function Agreement() {
  const a = "a"
  return (
    <Box
      className="text"
      sx={{
        padding: "50px 0 3px",

        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <Box
        sx={{
          maxWidth: "690px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Typography variant="title2" fontWeight={600} marginBottom="24px">
          Wildcat Service Agreement
        </Typography>

        <AgreementText />

        <Box
          sx={{
            position: "absolute",
            bottom: "0",
            height: "256px",
            width: "690px",
            backgroundImage:
              "linear-gradient(3deg, #FFFFFF 40%, #FFFFFF00 73%)",
            pointerEvents: "none",
          }}
        />
      </Box>
      <AgreementActions />
    </Box>
  )
}
