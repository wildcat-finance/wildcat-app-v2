"use client"

import { useEffect, useState } from "react"

import {
  Box,
  Button,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material"
import Image from "next/image"
import Link from "next/link"

import Icon from "@/assets/icons/wildcatAllocation_icon.png"
import { COLORS } from "@/theme/colors"

const AddressTextfieldStyle = {
  "& .MuiFormControl-root": {
    width: "100%",
    maxWidth: "600px",
  },

  "& .MuiInputBase-root": {
    border: `1px solid transparent`,
    borderRadius: "32px",
    color: COLORS.whiteLilac,
    fontSize: "14px",
    lineHeight: "20px",
    backgroundColor: "#FFFFFF26",
    padding: 0,
    paddingLeft: "20px",
    paddingRight: "4px",

    "&:hover": {
      border: `1px solid ${COLORS.white04}`,
      backgroundColor: COLORS.white01,
    },

    "&.Mui-focused": {
      border: `1px solid ${COLORS.white04}`,
      backgroundColor: COLORS.white01,
    },

    "& .MuiInputBase-input": {
      padding: "14px 0",
    },

    "&.Mui-disabled": {
      border: `1px solid #E6E7EB33`,
      color: COLORS.whiteLilac,
      opacity: 1,
    },

    "& .MuiInputBase-input.MuiFilledInput-input.Mui-disabled.MuiInputBase-inputAdornedEnd":
      {
        WebkitTextFillColor: "unset",
      },
  },
}

const TextfieldButton = ({
  state,
  onClick,
  disabled,
}: {
  state: boolean
  onClick: () => void
  disabled: boolean
}) => {
  const a = ""

  if (!state)
    return (
      <Button
        variant="contained"
        color="secondary"
        sx={{
          borderRadius: "32px",
          padding: "10px 28.5px",
          fontSize: "14px",
          lineHeight: "20px",
        }}
        onClick={onClick}
        disabled={disabled}
      >
        Check Address
      </Button>
    )

  if (state)
    return (
      <Button
        variant="contained"
        color="secondary"
        sx={{
          borderRadius: "32px",
          padding: "10px 28.5px",
          fontSize: "14px",
          lineHeight: "20px",

          backgroundColor: "#FFFFFF33",
          color: COLORS.white,

          "&:hover": {
            background: COLORS.white01,
            boxShadow: "none",
          },
        }}
        onClick={onClick}
        disabled={disabled}
      >
        Reset
      </Button>
    )

  return null
}

export default function AirdropPage() {
  const mockAllocation = "1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa"

  const [address, setAddress] = useState<string>("")
  const [hasFullAddress, setHasFullAddress] = useState<boolean>(false)

  const handleChangeFullAddress = () => {
    setHasFullAddress(!hasFullAddress)
  }

  const handleChangeAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value)
  }

  useEffect(() => {
    setHasFullAddress(false)
  }, [address])

  return (
    <Box
      sx={{
        display: "flex",
        width: "100%",
        height: "calc(100vh - 60px)",
        padding: "8px",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          margin: "auto",

          width: "100%",
          maxWidth: "600px",
        }}
      >
        <Image
          src={Icon}
          alt="Wildcat Icon"
          width={41.862995987674175}
          height={38.91230115950478}
        />

        <Typography
          variant="title1"
          color={COLORS.white}
          sx={{ marginBottom: "10px", marginTop: "15px" }}
        >
          Wildcat Allocations
        </Typography>

        <Typography
          variant="text1"
          color={COLORS.white06}
          sx={{ marginBottom: "32px" }}
        >
          Claim tokens of your Wildcat Network Allocations.{" "}
          <Link href="#" style={{ color: COLORS.white }}>
            Learn more
          </Link>
        </Typography>

        <TextField
          value={address}
          onChange={handleChangeAddress}
          fullWidth
          placeholder="Enter address to check eligibility"
          sx={AddressTextfieldStyle}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldButton
                  state={hasFullAddress}
                  onClick={handleChangeFullAddress}
                  disabled={!address}
                />
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  )
}
