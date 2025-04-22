"use client"

import { useState } from "react"

import { Box, Typography, useMediaQuery, useTheme } from "@mui/material"
import { useTranslation } from "react-i18next"

import { COLORS } from "@/theme/colors"

import {
  mainBox,
  leftBox,
  rightBox,
  footerText,
  containerBox,
  leftTitle,
} from "./style"
import { AllocationBox } from "../AllocationBox"
import { AccountsList } from "../components/AccountsList"
import { AccountType } from "../components/AccountType"
import { ConfirmDelegation } from "../components/ConfirmDelegation"
import { ProgressHeader } from "../components/ProgressHeader"
import { Parameters } from "../Parameters"

const steps = {
  "20": {
    stepName: "accountType",
    component: AccountType,
  },
  "40": {
    stepName: "accountList",
    component: AccountsList,
  },
  "60": {
    stepName: "confirmDelegation",
    component: ConfirmDelegation,
  },
}

export default function DelegationPage() {
  const { t } = useTranslation()
  const theme = useTheme()
  const breakpoint = theme.breakpoints
  const isMobile = useMediaQuery(breakpoint.down("sm"))
  const [progress, setProgress] = useState(20)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const StepComponent = steps[String(progress) as keyof typeof steps].component

  return (
    <Box sx={containerBox(theme)}>
      <Box sx={mainBox(theme)}>
        <Box sx={rightBox(theme)}>
          <ProgressHeader progress={progress} setProgress={setProgress} />
          <Box sx={{ padding: "0px 20px 20px", flexGrow: 1 }}>
            <StepComponent setProgress={setProgress} />
          </Box>
        </Box>
        <Box sx={leftBox(theme)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Typography
              variant="text2"
              sx={leftTitle(theme)}
              textAlign="center"
            >
              {isMobile
                ? t("airdrop.allocation.detailedInfo")
                : t("airdrop.allocation.yourAddress")}
            </Typography>
            {!isMobile && (
              <AllocationBox allocation="87453gqhrq-485hrq8gv4rb" />
            )}
            <Parameters />
          </Box>
          <Typography
            sx={footerText(theme)}
            variant="text4"
            color={COLORS.santasGrey}
          >
            {t("footer.rights")}
          </Typography>
        </Box>
      </Box>
    </Box>
  )
}
