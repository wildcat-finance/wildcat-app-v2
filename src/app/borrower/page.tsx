import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { ROUTES } from "@/routes"
import { ContentContainer } from "@/app/borrower/page-style"

export default function Borrower() {
  return (
    <Box>
      <Box sx={ContentContainer}>
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
