"use client"

import {
  Box,
  Button,
  Divider,
  InputAdornment,
  MenuItem,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"
import Link from "next/link"

import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { InputLabel } from "@/components/InputLabel"
import { TextfieldChip } from "@/components/TextfieldAdornments/TextfieldChip"
import { ROUTES } from "@/routes"
import { useAppDispatch } from "@/store/hooks"
import { setNextStep } from "@/store/slices/routingSlice/routingSlice"

import {
  BackButton,
  BackButtonArrow,
  ButtonsContainer,
  DividerStyle,
  DropdownOption,
  InputGroupContainer,
  NextButton,
} from "./style"

export const NewMarketForm = () => {
  const dispatch = useAppDispatch()

  const handleClickNext = () => {
    dispatch(setNextStep())
  }

  return (
    <Box>
      <Box marginBottom="28px">
        <Typography variant="title2">Create New market</Typography>
      </Box>

      <Typography variant="text1">Definition</Typography>

      <InputLabel label="Market Name" margin="16px 0 0 0">
        <TextField label="Use more than 1 character, e.g. blsm" />
      </InputLabel>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Master Loan Agreement">
          <ExtendedSelect label="Please Select">
            <MenuItem value="noMLA" sx={DropdownOption}>
              No MLA
            </MenuItem>
            <MenuItem value="wildcatMLA" sx={DropdownOption}>
              Wildcat MLA template
            </MenuItem>
          </ExtendedSelect>
        </InputLabel>

        <InputLabel label="KYC Preferences">
          <ExtendedSelect label="Please Select">
            <MenuItem value="share" sx={DropdownOption}>
              Share contact info for direct KYC
            </MenuItem>
          </ExtendedSelect>
        </InputLabel>

        <InputLabel label="Select market type">
          <ExtendedSelect label="Please Select">
            <MenuItem value="standard" sx={DropdownOption}>
              Standard Wildcat Market
            </MenuItem>
          </ExtendedSelect>
        </InputLabel>

        <InputLabel label="Underlying asset">
          <TextField label="Search name or paste address" />
        </InputLabel>
      </Box>

      <InputLabel label="Market token name" margin="36px 0 0 0">
        <TextField
          label="Use more than 1 character, e.g. Blossom"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip text="Asset Name" />
              </InputAdornment>
            ),
          }}
        />
      </InputLabel>

      <InputLabel label="Market token symbol" margin="36px 0 0 0">
        <TextField
          label="Use more than 1 character, e.g. blsm"
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <TextfieldChip text="Asset Symbol" />
              </InputAdornment>
            ),
          }}
        />
      </InputLabel>

      <Divider sx={DividerStyle} />

      <Typography variant="title3">Amount and Duties</Typography>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Max. Borrowing Capacity">
          <TextField
            label="under 1000"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <TextfieldChip text="Token Symbol" />
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Base APR">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">%</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Penalty APR">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">%</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Reserve Ratio">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">%</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>
      </Box>

      <Divider sx={DividerStyle} />

      <Typography variant="title3">Grace and Withdrawals</Typography>

      <Box sx={InputGroupContainer}>
        <InputLabel label="Grace period">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">hours</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>

        <InputLabel label="Withdrawal cycle length">
          <TextField
            label="10-20"
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <Typography variant="text3">hours</Typography>
                </InputAdornment>
              ),
            }}
          />
        </InputLabel>
      </Box>

      <Box sx={ButtonsContainer}>
        <Link href={ROUTES.borrower.root} passHref>
          <Button size="large" variant="text" sx={BackButton}>
            <SvgIcon fontSize="medium" sx={BackButtonArrow}>
              <BackArrow />
            </SvgIcon>
            Back
          </Button>
        </Link>

        <Button
          size="large"
          variant="contained"
          sx={NextButton}
          onClick={handleClickNext}
        >
          Next
        </Button>
      </Box>
    </Box>
  )
}
