import { ChangeEvent, useState } from "react"

import {
  Box,
  Button,
  Divider,
  InputAdornment,
  SvgIcon,
  TextField,
  useMediaQuery,
  useTheme,
} from "@mui/material"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"

import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import SearchIcon from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

import { SearchStyles } from "./style"
import { AllocationAccountType } from "../../types"
// eslint-disable-next-line import/no-cycle
import { AllocationAccount } from "../AllocationAccount"

export const AccountsList = ({
  setProgress,
  selectedAccount,
  handleSelectAccount,
}: {
  setProgress: (progress: number) => void
  selectedAccount: AllocationAccountType | null | string
  handleSelectAccount: (account: AllocationAccountType | string) => void
}) => {
  const router = useRouter()
  const [accountAddress, setAccountAddress] = useState("")
  const theme = useTheme()
  const { t } = useTranslation()
  const breakpoint = theme.breakpoints
  const isMobile = useMediaQuery(breakpoint.down("sm"))

  const handleChangeAccountAddress = (evt: ChangeEvent<HTMLInputElement>) => {
    setAccountAddress(evt.target.value)
  }

  const handleSelectClick = (account: AllocationAccountType) => {
    handleSelectAccount(account)
    setProgress(60)
  }

  const handleBack = () => {
    router.back()
  }

  const handleNext = () => {
    if (accountAddress) {
      handleSelectAccount(accountAddress)
      setProgress(60)
    }
  }

  return (
    <Box display="flex" gap="32px" flexDirection="column" height="100%">
      <TextField
        onChange={handleChangeAccountAddress}
        onKeyDown={(e) => e.stopPropagation()}
        fullWidth
        size="small"
        placeholder="Search by Name"
        sx={SearchStyles}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SvgIcon
                fontSize="small"
                sx={{
                  width: "20px",
                  "& path": { fill: `${COLORS.blackRock}` },
                }}
              >
                <SearchIcon />
              </SvgIcon>
            </InputAdornment>
          ),
        }}
      />
      {!accountAddress ? (
        <Box display="flex" gap="24px" flexDirection="column">
          <AllocationAccount handleSelect={handleSelectClick} />
          <Divider />
          <AllocationAccount handleSelect={handleSelectClick} />
          <Divider />
          <AllocationAccount handleSelect={handleSelectClick} />
        </Box>
      ) : (
        <Box
          display="flex"
          justifyContent="space-between"
          alignItems={isMobile ? "flex-end" : "center"}
          flexGrow={isMobile ? 1 : 0}
        >
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
      )}
    </Box>
  )
}
