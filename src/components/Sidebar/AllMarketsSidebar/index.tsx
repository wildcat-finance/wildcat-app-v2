import {
  Box,
  Divider,
  FormControl,
  FormControlLabel,
  InputAdornment,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material"
import { COLORS } from "@/theme/colors"
import SvgIcon from "@mui/material/SvgIcon"
import Icon from "@/assets/icons/search_icon.svg"
import RadioButton from "@/components/extended/RadioButton"

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
  <Box
    sx={{
      minHeight: "calc(100vh - 82px - 43px)",
      minWidth: "267px",
      borderRight: `1px solid ${COLORS.blackRock006}`,
      padding: "42px 16px 0px",
      display: "flex",
      flexDirection: "column",
      rowGap: "24px",
    }}
  >
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
        <Typography variant="text2" sx={{ mb: "12px" }}>
          Market Status
        </Typography>
        <RadioGroup defaultValue="all" name="radio-buttons-group">
          <FormControlLabel value="all" control={<RadioButton />} label="All" />
          <FormControlLabel
            value="healty"
            control={<RadioButton />}
            label="Healty"
          />
          <FormControlLabel
            value="delinquent"
            control={<RadioButton />}
            label="Delinquent"
          />
          <FormControlLabel
            value="penalty"
            control={<RadioButton />}
            label="Penalty"
          />
        </RadioGroup>
      </FormControl>
    </Box>

    <Divider />

    <Box>
      <FormControl>
        <Typography variant="text2" sx={{ mb: "12px" }}>
          Underlying asset
        </Typography>
        <RadioGroup defaultValue="all" name="radio-buttons-group">
          <FormControlLabel value="all" control={<RadioButton />} label="All" />
          {MOCK.map((asset) => (
            <FormControlLabel
              key={asset.id}
              value={asset.underlyingAsset}
              control={<RadioButton />}
              label={asset.underlyingAsset}
            />
          ))}
        </RadioGroup>
      </FormControl>
    </Box>
  </Box>
)
