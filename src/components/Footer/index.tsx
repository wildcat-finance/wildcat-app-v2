import { Box, Button, Typography } from "@mui/material"

export const Footer = () => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0 20px 15px 25px",
    }}
  >
    <Typography variant="text4Highlighted">
      Wildcat © All Rights reserved. 2023
    </Typography>
    <Button variant="text" size="small">
      <Typography variant="text4Highlighted">Download Agreement</Typography>
      <Box sx={{ rotate: "270deg", marginLeft: "2px" }}>⇤</Box>
    </Button>
  </Box>
)
