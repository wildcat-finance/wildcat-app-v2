import { Box, Typography } from "@mui/material"

import { NewMarketForm } from "@/app/[locale]/borrower/new-market/NewMarketForm"

export default async function NewMarket() {
  return (
    <Box padding="38px 366px 52px 101px">
      <Typography variant="title2">Create New market</Typography>

      <NewMarketForm />
    </Box>
  )
}
