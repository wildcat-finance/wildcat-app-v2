import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  RadioGroup,
  TextField,
  Typography,
  SvgIcon,
} from "@mui/material"

import { COLORS } from "@/theme/colors"
import { ContentContainer } from "@/components/Sidebar/AllMarketsSidebar/style"

import Icon from "@/assets/icons/search_icon.svg"
import ExtendedRadio from "../../extended/ExtendedRadio"

const MOCK = [
  {
    id: 1,
    underlyingAsset: "EUG",
  },
  {
    id: 2,
    underlyingAsset: "UNI",
  },
  {
    id: 3,
    underlyingAsset: "WETH",
  },
]

export const AllMarketsSidebar = () => (
  <Box sx={ContentContainer}>
    <TextField
      fullWidth
      size="small"
      label="Search by Market Name"
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <SvgIcon
              fontSize="small"
              sx={{ "& path": { fill: `${COLORS.greySuit}` } }}
            >
              <Icon />
            </SvgIcon>
          </InputAdornment>
        ),
      }}
    />

    <Divider />

    <Box>
      <FormControl>
        <Typography variant="text2" mb="12px">
          Market Status
        </Typography>
        <RadioGroup defaultValue="all" name="radio-buttons-group">
          <FormControlLabel
            value="all"
            control={<ExtendedRadio />}
            label="All"
          />
          <FormControlLabel
            value="healty"
            control={<ExtendedRadio />}
            label="Healty"
          />
          <FormControlLabel
            value="delinquent"
            control={<ExtendedRadio />}
            label="Delinquent"
          />
          <FormControlLabel
            value="penalty"
            control={<ExtendedRadio />}
            label="Penalty"
          />
        </RadioGroup>
      </FormControl>
    </Box>

    <Divider />

    <Box>
      <FormControl>
        <Typography variant="text2" mb="12px">
          Underlying asset
        </Typography>
        <RadioGroup defaultValue="all" name="radio-buttons-group">
          <FormControlLabel
            value="all"
            control={<ExtendedRadio />}
            label="All"
          />
          {MOCK.map((asset) => (
            <FormControlLabel
              key={asset.id}
              value={asset.underlyingAsset}
              control={<ExtendedRadio />}
              label={asset.underlyingAsset}
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Box>
  </Box>
)
