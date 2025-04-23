import { useState } from "react"

import {
  Box,
  Button,
  FormControlLabel,
  RadioGroup,
  SvgIcon,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import { COLORS } from "@/theme/colors"

import { AllocationAccountType } from "../../types"

type AccountTypeProps = {
  setProgress: (progress: number) => void
  // eslint-disable-next-line react/no-unused-prop-types
  selectedAccount: AllocationAccountType | null | string
  // eslint-disable-next-line react/no-unused-prop-types
  handleSelectAccount: (account: AllocationAccountType | string) => void
}

export const AccountType = ({
  setProgress,
  handleSelectAccount,
}: AccountTypeProps) => {
  const [delegation, setDelegation] = useState<"self" | "another">("self")
  const router = useRouter()
  const { address } = useAccount()
  const theme = useTheme()
  const { t } = useTranslation()
  const breakpoint = theme.breakpoints
  const isMobile = useMediaQuery(breakpoint.down("sm"))

  const handleChangeDelegation = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setDelegation(event.target.value as "self" | "another")
  }

  const handleBack = () => {
    router.back()
  }

  const handleNext = () => {
    if (delegation === "self" && address) {
      handleSelectAccount(address)
      setProgress(60)
    } else {
      setProgress(40)
    }
  }

  return (
    <Box
      display="flex"
      flexDirection="column"
      gap="32px"
      height="100%"
      justifyContent={isMobile ? "space-between" : "flex-start"}
    >
      <Box display="flex" flexDirection="column" gap="16px">
        <Typography variant="text3" sx={{ marginLeft: "12px" }}>
          {t("delegation.chooseAccount")}
        </Typography>

        <RadioGroup
          aria-labelledby="deligation-form"
          name="delegation"
          value={delegation}
          onChange={handleChangeDelegation}
          sx={{
            flexDirection: "row",
            flexWrap: { xs: "wrap", sm: "nowrap" },
            gap: "6px",
          }}
        >
          <FormControlLabel
            label={t("delegation.self")}
            control={
              <ExtendedRadio value="self" onChange={handleChangeDelegation} />
            }
            sx={{
              width: "100%",
              height: "44px",
              border: `1px solid ${COLORS.whiteLilac}`,
              borderRadius: "8px",
              padding: "0 15px",
              display: "flex",
              alignItems: "center",
            }}
          />

          <FormControlLabel
            label={t("delegation.other")}
            control={
              <ExtendedRadio
                value="another"
                onChange={handleChangeDelegation}
              />
            }
            sx={{
              width: "100%",
              height: "44px",
              border: `1px solid ${COLORS.whiteLilac}`,
              borderRadius: "8px",
              padding: "0 15px",
              display: "flex",
              alignItems: "center",
            }}
          />
        </RadioGroup>
      </Box>
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Button
          onClick={handleBack}
          startIcon={
            <SvgIcon sx={{ width: "16px", height: "16px" }}>
              <Arrow />
            </SvgIcon>
          }
          variant="text"
          color="primary"
        >
          {t("delegation.back")}
        </Button>
        <Button variant="contained" color="primary" onClick={handleNext}>
          {t("delegation.next")}
        </Button>
      </Box>
    </Box>
  )
}
