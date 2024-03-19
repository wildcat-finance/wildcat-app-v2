import { ReactNode } from "react"
import { Box, FormControl, InputLabel, Select } from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import Icon from "../../../assets/icons/clock_icon.svg"

export type ExtendedSelectProps = {
  label: string
  children: ReactNode
  small?: boolean
}

export const ExtendedSelect = ({
  label,
  children,
  small,
}: ExtendedSelectProps) => {
  switch (small) {
    case false: {
      return (
        <FormControl>
          <InputLabel>{label}</InputLabel>
          <Select sx={{ width: "260px" }}>{children}</Select>
        </FormControl>
      )
    }
    case true: {
      return (
        <Box>
          <FormControl sx={{ position: "relative", width: "260px" }}>
            <InputLabel
              sx={{
                fontSize: "10px",
                transform: "translate(29.15px, 6px) scale(1)",
                "&.Mui-focused": {
                  display: "none",
                },
                "&.MuiFormLabel-filled": {
                  display: "none",
                },
              }}
            >
              {label}
            </InputLabel>
            <SvgIcon
              fontSize="small"
              sx={{
                position: "absolute",
                top: "29.5%",
                left: "10px",
                zIndex: -1,
              }}
            >
              <Icon />
            </SvgIcon>
            <Select size="small">{children}</Select>
          </FormControl>
        </Box>
      )
    }
    default: {
      return (
        <FormControl>
          <InputLabel>{label}</InputLabel>
          <Select sx={{ width: "260px" }}>{children}</Select>
        </FormControl>
      )
    }
  }
}
