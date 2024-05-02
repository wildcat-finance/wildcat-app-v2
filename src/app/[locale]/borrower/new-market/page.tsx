import {
  Box,
  Button,
  Divider,
  InputAdornment,
  TextField,
  Typography,
} from "@mui/material"
import SvgIcon from "@mui/material/SvgIcon"

import {
  backButton,
  backButtonArrow,
  ButtonsContainer,
  DividerStyle,
  InputGroupContainer,
  newMarketContainer,
  nextButton,
} from "@/app/[locale]/borrower/new-market/style"
import BackArrow from "@/assets/icons/arrowLeft_icon.svg"
import { ExtendedSelect } from "@/components/@extended/ExtendedSelect"
import { InputLabel } from "@/components/InputLabel"

export default async function NewMarket() {
  return (
    <Box sx={newMarketContainer}>
      <Typography variant="title2">Create New market</Typography>

      <Box marginTop="28px">
        <Typography variant="text1">Definition</Typography>

        <InputLabel label="Market Name" margin="16px 0 0 0">
          <TextField label="Use more than 1 character, e.g. blsm" />
        </InputLabel>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "38px 10px",
            marginTop: "36px",
          }}
        >
          <InputLabel label="Master Loan Agreement">
            <ExtendedSelect label="Please Select" />
          </InputLabel>

          <InputLabel label="KYC Preferences">
            <ExtendedSelect label="Please Select" />
          </InputLabel>

          <InputLabel label="Select market type">
            <ExtendedSelect label="Please Select" />
          </InputLabel>

          <InputLabel label="Underlying asset">
            <TextField label="Search name or paste address" />
          </InputLabel>
        </Box>

        <InputLabel label="Market token name" margin="36px 0 0 0">
          <TextField label="Use more than 1 character, e.g. Blossom" />
        </InputLabel>

        <InputLabel label="Market token symbol" margin="36px 0 0 0">
          <TextField label="Use more than 1 character, e.g. blsm" />
        </InputLabel>

        <Divider sx={DividerStyle} />

        <Typography variant="title3">Amount and Duties</Typography>

        <Box sx={InputGroupContainer}>
          <InputLabel label="Max. Borrowing Capacity">
            <TextField label="under 1000" />
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
          <InputLabel label="Penalty APR">
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

          <InputLabel label="Reserve Ratio">
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
      </Box>

      <Box sx={ButtonsContainer}>
        <Button size="large" variant="text" sx={backButton}>
          <SvgIcon fontSize="medium" sx={backButtonArrow}>
            <BackArrow />
          </SvgIcon>
          Back
        </Button>
        <Button size="large" variant="contained" sx={nextButton}>
          Next
        </Button>
      </Box>
    </Box>
  )
}
