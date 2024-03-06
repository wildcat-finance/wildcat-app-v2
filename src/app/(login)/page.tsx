import { Button, Typography } from "@mui/material"
import Image from "next/image"
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

import illustration from "../../assets/pictures/login_page.png"
import wildcatLogo from "../../assets/logos/wildcat_logo.svg"

export default function LoginPage() {
  return (
    <>
      <Header>
        <Image src={wildcatLogo} alt="Logo" />
        <Button variant="outlined" color="secondary" size="large">
          Connect a wallet
        </Button>
      </Header>
      <ContentContainer>
        <Illustration src={illustration} alt="картин очка" />
        <ConnectContainer>
          <Title variant="title1Highlighted">Connect your wallet</Title>
          <Description variant="text1">
            Please connect your wallet to access the app
          </Description>
          <Button variant="contained" size="large">
            Connect a wallet
          </Button>
        </ConnectContainer>
      </ContentContainer>
      <Footer>
        <Copyright variant="text4Highlighted">
          Wildcat © All Rights reserved. 2023
        </Copyright>
        <Button variant="text" size="small">
          <Typography variant="text4Highlighted">Download Agreement</Typography>
          <DownloadIcon>⇤</DownloadIcon>
        </Button>
      </Footer>
    </>
  )
}
