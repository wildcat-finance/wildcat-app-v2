import { Button, Typography } from "@mui/material"
import Link from "next/link"
import { ROUTES } from "@/routes"
import initTranslations from "@/app/i18n"
import {
  Illustration,
  ContentContainer,
  ConnectContainer,
  Title,
  Description,
  Header,
  Footer,
  Copyright,
  DownloadIcon,
} from "./styled"

import illustration from "../../../assets/pictures/login_page.webp"
import WildcatLogo from "../../../assets/icons/logo_white.svg"

export default async function LoginPage({
  params: { locale },
}: {
  params: { locale: string }
}) {
  const { t } = await initTranslations(locale, ["login"])

  return (
    <>
      <Header>
        <WildcatLogo />
        <Button variant="outlined" color="secondary" size="large">
          {t("connectWallet")}
        </Button>
      </Header>
      <ContentContainer>
        <Illustration src={illustration} alt="Illustration" />
        <ConnectContainer>
          <Title variant="title1Highlighted">{t("title")}</Title>
          <Description variant="text1">{t("greeting")}</Description>
          <Link href={ROUTES.borrower}>
            <Button variant="contained" size="large">
              {t("connectWallet")}
            </Button>
          </Link>
        </ConnectContainer>
      </ContentContainer>
      <Footer>
        <Copyright variant="text4Highlighted">
          Wildcat © {t("rights")}. 2023
        </Copyright>
        <Button variant="text" size="small">
          <Typography variant="text4Highlighted">{t("agreement")}</Typography>
          <DownloadIcon>⇤</DownloadIcon>
        </Button>
      </Footer>
    </>
  )
}
