import { Box } from "@mui/material"

import { LegalInfoForm } from "@/app/[locale]/borrower/new-market/LegalInfoForm"
import { NewMarketForm } from "@/app/[locale]/borrower/new-market/NewMarketForm"

export default async function NewMarket() {
  return (
    <Box padding="38px 366px 52px 101px">
      {/* <NewMarketForm /> */}

      <LegalInfoForm />
    </Box>
  )
}
