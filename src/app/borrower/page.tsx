import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { ROUTES } from "@/routes"

export default function Borrower() {
  return (
    <Box>
      <Box
        sx={{
          width: "100%",
          padding: "42px 14px 0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography variant="title2">All markets</Typography>
        <Link href={ROUTES.borrowerMarket}>
          <Button variant="contained" size="small">
            New Market
          </Button>
        </Link>
      </Box>
    </Box>
  )
}
