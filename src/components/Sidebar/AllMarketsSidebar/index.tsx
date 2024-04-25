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
import { useTranslation } from "react-i18next"

import Icon from "@/assets/icons/search_icon.svg"
import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import { ContentContainer } from "@/components/Sidebar/AllMarketsSidebar/style"
import { COLORS } from "@/theme/colors"

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

export const AllMarketsSidebar = () => {
  const { t } = useTranslation()

  return (
    <Box sx={ContentContainer}>
      <TextField
        fullWidth
        size="small"
        label={t("borrowerMarketList:searchMarketName")}
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
            {t("borrowerMarketList:statusRadioTitle")}
          </Typography>
          <RadioGroup defaultValue="all" name="radio-buttons-group">
            <FormControlLabel
              value="all"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:allRadio")}
            />
            <FormControlLabel
              value="healty"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:healthyRadio")}
            />
            <FormControlLabel
              value="delinquent"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:delinquentRadio")}
            />
            <FormControlLabel
              value="penalty"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:penaltyRadio")}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Divider />

      <Box>
        <FormControl>
          <Typography variant="text2" mb="12px">
            {t("borrowerMarketList:assetRadioTitle")}
          </Typography>
          <RadioGroup defaultValue="all" name="radio-buttons-group">
            <FormControlLabel
              value="all"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:allRadio")}
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
}
