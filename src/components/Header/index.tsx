import Image from "next/image"
import Box from "@mui/material/Box"
import Button from "@mui/material/Button"

import { ContentContainer } from "@/components/Header/style"

import WildcatLogo from "../../assets/logos/wildcat_logo.svg"

export default function Header() {
  return (
    <Box sx={ContentContainer}>
      <Image src={WildcatLogo} alt="Wildcat Logo" />
      <Button variant="text" size="large">
        Connect a wallet
      </Button>
    </Box>
  )
}
