import { Box, Button, Typography } from "@mui/material"
import Link from "next/link"
import { ROUTES } from "@/routes"
import { ContentContainer } from "@/app/[locale]/borrower/page-style"
import initTranslations from "@/app/i18n"
import { useAccount } from "wagmi"

export default async function Borrower({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { t } = await initTranslations(locale, ["borrowerMarketList"])

  return (
    <Box>
      <Box sx={ContentContainer}>
        <Typography variant="title2">{t("header")}</Typography>
        <Link href={ROUTES.borrowerMarket}>
          <Button variant="contained" size="small">
            {t("newMarketButton")}
          </Button>
        </Link>
      </Box>
    </Box>
  )
}
