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
import { underlyingAssetsMock } from "@/mocks/mocks"
import { useAppDispatch } from "@/store/hooks"
import {
  setBorrowerMarketAsset,
  setBorrowerMarketStatus,
} from "@/store/slices/borrowerSidebarSlice/borrowerSidebarSlice"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

export const AllMarketsSidebar = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()

  function handleChangeStatus(event: React.ChangeEvent, value: string) {
    dispatch(setBorrowerMarketStatus(value))
  }

  function handleChangeAsset(event: React.ChangeEvent, value: string) {
    dispatch(setBorrowerMarketAsset(value))
  }

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
          <RadioGroup
            defaultValue="All"
            name="radio-status"
            onChange={handleChangeStatus}
          >
            <FormControlLabel
              value="All"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:allRadio")}
            />
            <FormControlLabel
              value={MarketStatus.HEALTHY}
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:healthyRadio")}
            />
            <FormControlLabel
              value={MarketStatus.DELINQUENT}
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:delinquentRadio")}
            />
            <FormControlLabel
              value={MarketStatus.PENALTY}
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
          <RadioGroup
            defaultValue="All"
            name="radio-asset"
            onChange={handleChangeAsset}
          >
            <FormControlLabel
              value="All"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList:allRadio")}
            />
            {underlyingAssetsMock.map((asset) => (
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
