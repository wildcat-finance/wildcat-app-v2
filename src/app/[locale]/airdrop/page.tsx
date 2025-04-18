"use client"

import { useEffect, useState } from "react"

import {
  Box,
  Button,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { ParametersItem } from "@/app/[locale]/airdrop/[allocation]/Parameters/components/ParametersItem"
import { AirdropChip } from "@/app/[locale]/airdrop/components/AirdropChip"
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

    "&.Mui-error": {
      borderColor: COLORS.carminePink,
      color: COLORS.white,
      backgroundColor: "#F7575726",
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

const ActivateButtonStyle = {
  marginTop: "24px",
  backgroundColor: COLORS.ultramarineBlue,
  color: COLORS.white,
  "&:hover": {
    backgroundColor: COLORS.blueRibbon,
    color: COLORS.white,
  },
}

const ViewButtonStyle = {
  marginTop: "24px",
  backgroundColor: COLORS.glitter,
  color: COLORS.ultramarineBlue,
  "&:hover": {
    backgroundColor: COLORS.hawkesBlue,
    color: COLORS.ultramarineBlue,
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
          display: { xs: "none", sm: "block" },
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

          display: { xs: "none", sm: "block" },
        }}
        onClick={onClick}
        disabled={disabled}
      >
        Reset
      </Button>
    )

  return null
}

const mockAllocations = [
  {
    address: "00000",
    status: "non-active",
  },
  {
    address: "11111",
    status: "active",
  },
  {
    address: "22222",
    status: "expired",
  },
]

export default function AirdropPage() {
  const [address, setAddress] = useState<string>("")
  const [hasFullAddress, setHasFullAddress] = useState<boolean>(false)
  const [error, setError] = useState<string | undefined>(undefined)

  const router = useRouter()

  const handleClickView = () => {
    router.push(`/airdrop/${address}`)
  }

  const handleChangeFullAddress = () => {
    setHasFullAddress(!hasFullAddress)
  }

  const handleChangeAddress = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAddress(event.target.value)
  }

  const handleResetAddress = () => {
    setAddress("")
  }

  // mock logic

  const allocation = mockAllocations.find((a) => a.address === address)

  useEffect(() => {
    setHasFullAddress(false)
    setError(undefined)
  }, [address])

  useEffect(() => {
    if (hasFullAddress && !allocation) {
      setError("‣ No Allocation Found. Try another one.")
    }
  }, [hasFullAddress])

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
          margin: "25vh auto 0px",

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
          <Link href="https://wildcat.finance/" style={{ color: COLORS.white }}>
            Learn more
          </Link>
        </Typography>

        <TextField
          value={address}
          onChange={handleChangeAddress}
          fullWidth
          placeholder="Enter address to check eligibility"
          error={!!error}
          helperText={error}
          sx={AddressTextfieldStyle}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldButton
                  state={hasFullAddress}
                  onClick={
                    hasFullAddress
                      ? handleResetAddress
                      : handleChangeFullAddress
                  }
                  disabled={!address}
                />
              </InputAdornment>
            ),
          }}
        />

        {hasFullAddress && allocation && (
          <Box
            sx={{
              width: "100%",
              borderRadius: "16px",
              padding: "24px",
              backgroundColor: COLORS.white,
              marginTop: "9px",
            }}
          >
            <ParametersItem
              title="Alloaction"
              value={
                <AirdropChip
                  type={
                    allocation.status as "non-active" | "active" | "expired"
                  }
                />
              }
            />

            <Divider sx={{ width: "100%", margin: "12px 0" }} />

            <ParametersItem
              title="Amount"
              value="15,000 WETH"
              tooltipText="TBD"
            />

            <Divider sx={{ width: "100%", margin: "12px 0" }} />

            <ParametersItem
              title="Amount Claimed"
              value="0 WETH"
              tooltipText="TBD"
            />

            <Divider sx={{ width: "100%", margin: "12px 0" }} />

            <ParametersItem title="Claimable Amount" value="0 WETH" />

            {allocation.status !== "expired" && (
              <Link href={`/airdrop/${address}`}>
                <Button
                  fullWidth
                  variant="contained"
                  size="large"
                  sx={
                    allocation.status === "non-active"
                      ? ActivateButtonStyle
                      : ViewButtonStyle
                  }
                >
                  {allocation.status === "non-active" ? "Activate" : "View"}
                </Button>
              </Link>
            )}
          </Box>
        )}
      </Box>
    </Box>
  )
}
