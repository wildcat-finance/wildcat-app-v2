"use client"

import { useEffect } from "react"

import { Box, Button, Typography, useTheme } from "@mui/material"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import {
  containerBox,
  mainBox,
  title,
  button,
  contentBox,
  whiteGradientBox,
} from "./style"

const HAS_SIGNED_AIRDROP_KEY = "hasSignedAirdrop"

export default function AgreementPage() {
  const theme = useTheme()
  const { t } = useTranslation()
  const router = useRouter()

  const handleSignAndConfirm = () => {
    localStorage.setItem(HAS_SIGNED_AIRDROP_KEY, "true")
    router.back()
  }

  return (
    <Box sx={containerBox(theme)}>
      <Box sx={mainBox(theme)}>
        <Typography variant="title3" textAlign="center" sx={title(theme)}>
          {t("airdrop.agreement.wildcatService")}
        </Typography>
        <Box sx={contentBox(theme)}>
          <Typography variant="body1">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            nec fringilla dolor. Vestibulum blandit luctus nisi a aliquet. Nulla
            fermentum arcu et nisl vulputate viverra. Proin viverra sit amet
            sapien faucibus maximus. Integer vel urna tempus, elementum erat
            nec, molestie mi. Vivamus ligula massa, lobortis ac enim sit amet,
            facilisis ultrices mauris. Mauris rutrum risus a sapien convallis,
            vitae lacinia est tempus. Donec elit leo, tincidunt id pellentesque
            vitae, tincidunt vel diam. Donec rhoncus scelerisque tellus sed
            tempor. Fusce a elit sed tellus venenatis vulputate. Aliquam sit
            amet lectus at lacus cursus pharetra. Aenean lacinia nisi velit.
            Nullam pretium odio vitae sapien efficitur auctor. Maecenas suscipit
            urna id tellus efficitur pretium. Quisque eu ante arcu. Sed non leo
            et erat tempor pretium ut quis quam. Integer rhoncus dignissim nulla
            rhoncus dapibus. Sed viverra pretium congue. Donec tincidunt
            fermentum orci fringilla finibus. Aenean vitae arcu vel lacus tempus
            pulvinar ut vitae nunc. Suspendisse vel consectetur massa, non
            ullamcorper orci. Maecenas id dignissim justo. Sed ac euismod purus,
            id aliquet magna. Pellentesque porttitor erat commodo, imperdiet est
            ac, luctus orci. Sed eleifend augue non neque interdum ornare.
            Aenean non porta enim, ut semper est. Aenean eleifend urna eu
            euismod efficitur. Morbi nec nibh non nisl mollis consectetur. Etiam
            et semper ex, quis congue magna. Nam venenatis risus ac tempus
            molestie. Ut ut ultrices ligula, sed iaculis ex. Vivamus viverra
            semper suscipit. Orci varius natoque penatibus et magnis dis
            parturient montes, nascetur ridiculus mus. Duis pretium rutrum
            pellentesque. Duis rhoncus mollis lacinia. Mauris bibendum libero et
            dictum porta. Vivamus vulputate elit odio, tincidunt ultrices libero
            posuere ullamcorper. Curabitur orci est, malesuada at dignissim sed,
            aliquam eget ante. Praesent vitae est a augue molestie auctor ut
            eget enim. Sed iaculis aliquam diam ut venenatis. Nunc cursus, nunc
            ut facilisis vulputate, lectus tortor consequat nisl, viverra mattis
            neque sapien eget est. Nullam facilisis rhoncus quam, sed malesuada
            velit aliquam quis. Morbi et nibh eget tortor aliquet laoreet. Ut
            porta nulla at commodo facilisis. Pellentesque habitant morbi
            tristique senectus et netus et malesuada fames ac turpis egestas.
            Nullam dapibus purus sed ipsum egestas convallis. Sed et consequat
            quam. Praesent vel justo nec nisi imperdiet feugiat. Donec sapien
            ligula, euismod vel ultrices eget, condimentum eu risus. Sed
            ultricies eleifend risus, quis aliquet velit sagittis eu. Class
            aptent taciti sociosqu ad litora torquent per conubia nostra, per
            inceptos himenaeos. Ut interdum, sapien non dictum molestie, sem
            nunc porttitor ante, nec pellentesque dolor ex in massa. Donec
            iaculis in libero at pulvinar. Pellentesque porta libero vel orci
            malesuada volutpat. Sed dignissim eleifend odio, eget posuere libero
            suscipit id. Duis consequat ligula sit amet porttitor venenatis. Nam
            dapibus, libero quis posuere sodales, nulla nisi ultricies neque, et
            congue ligula quam sed nibh. Ut ligula mauris, pulvinar a sem sit
            amet, ullamcorper auctor urna. Quisque sollicitudin purus et ipsum
            tincidunt tempus viverra maximus est. Aliquam gravida, augue sed
            posuere accumsan, erat urna facilisis tortor, vitae accumsan metus
            purus vitae risus. Integer at lacinia orci, sed semper sapien. Donec
            in dui tristique, sagittis augue sit amet, faucibus augue. Nunc
            feugiat dolor dapibus, facilisis sem vitae, viverra est. Nunc
            fringilla mi ut odio aliquet, quis condimentum diam interdum. Nulla
            eget lectus interdum, malesuada libero id, ultrices risus. Proin
            lacinia interdum pretium. Donec condimentum arcu sed augue commodo,
            a vestibulum magna commodo. Nullam neque eros, interdum et diam
            quis, lacinia tempus libero. Fusce aliquet pretium efficitur.
            Phasellus id egestas sem. Sed sagittis sapien nec condimentum
            vulputate. Donec posuere gravida metus. Nunc enim enim, malesuada
            non viverra sit amet, suscipit sed urna. Sed dapibus enim non
            scelerisque consequat. Suspendisse euismod ornare metus non laoreet.
            Vivamus vel dui at orci fringilla posuere convallis vitae lorem.
            Phasellus vel lacinia odio. Nulla convallis pretium mi non aliquet.
          </Typography>
        </Box>
        <Button
          variant="contained"
          color="primary"
          sx={button(theme)}
          onClick={handleSignAndConfirm}
        >
          {t("airdrop.agreement.signAndConfirm")}
        </Button>
        <Box sx={whiteGradientBox(theme)} />
      </Box>
    </Box>
  )
}
