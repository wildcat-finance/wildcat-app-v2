import { ChangeEvent, useState } from "react"

import { Box, Divider, InputAdornment, SvgIcon, TextField } from "@mui/material"

import SearchIcon from "@/assets/icons/search_icon.svg"
import { COLORS } from "@/theme/colors"

import { SearchStyles } from "./style"
import { AllocationAccount } from "../AllocationAccount"

export const AccountsList = ({
  setProgress,
}: {
  setProgress: (progress: number) => void
}) => {
  const [accountAddress, setAccountAddress] = useState("")

  const handleChangeAccountAddress = (evt: ChangeEvent<HTMLInputElement>) => {
    setAccountAddress(evt.target.value)
  }

  return (
    <Box display="flex" gap="32px" flexDirection="column">
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
      <Box display="flex" gap="24px" flexDirection="column">
        <AllocationAccount handleSelect={() => setProgress(60)} />
        <Divider />
        <AllocationAccount handleSelect={() => setProgress(60)} />
        <Divider />
        <AllocationAccount handleSelect={() => setProgress(60)} />
      </Box>
    </Box>
  )
}
