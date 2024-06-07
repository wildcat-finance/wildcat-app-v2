import { ChangeEvent } from "react"

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
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  setBorrowerMarketAsset,
  setBorrowerMarketName,
  setBorrowerMarketStatus,
} from "@/store/slices/borrowerSidebarSlice/borrowerSidebarSlice"
import { SidebarMarketAssets } from "@/store/slices/borrowerSidebarSlice/interface"
import { COLORS } from "@/theme/colors"
import { MarketStatus } from "@/utils/marketStatus"

export const AllMarketsSidebar = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const marketName = useAppSelector((state) => state.borrowerSidebar.marketName)
  const marketStatus = useAppSelector((state) => state.borrowerSidebar.status)
  const marketAsset = useAppSelector(
    (state) => state.borrowerSidebar.underlyingAsset,
  )

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    dispatch(setBorrowerMarketName(evt.target.value))
  }

  function handleChangeStatus(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value as MarketStatus | "All"
    dispatch(setBorrowerMarketStatus(value))
  }

  function handleChangeAsset(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value as SidebarMarketAssets
    dispatch(setBorrowerMarketAsset(value))
  }

  return (
    <Box sx={ContentContainer}>
      <TextField
        fullWidth
        placeholder={t("borrowerMarketList.sidebar.searchPlaceholder")}
        value={marketName}
        onChange={handleChangeMarketName}
        size="small"
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
            {t("borrowerMarketList.sidebar.title.status")}
          </Typography>
          <RadioGroup
            defaultValue={marketStatus}
            name="radio-status"
            onChange={handleChangeStatus}
          >
            <FormControlLabel
              value="All"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList.sidebar.radio.all")}
            />
            <FormControlLabel
              value={MarketStatus.HEALTHY}
              control={<ExtendedRadio />}
              label={MarketStatus.HEALTHY}
            />
            <FormControlLabel
              value={MarketStatus.DELINQUENT}
              control={<ExtendedRadio />}
              label={MarketStatus.DELINQUENT}
            />
            <FormControlLabel
              value={MarketStatus.PENALTY}
              control={<ExtendedRadio />}
              label={MarketStatus.PENALTY}
            />
          </RadioGroup>
        </FormControl>
      </Box>

      <Divider />

      <Box>
        <FormControl>
          <Typography variant="text2" mb="12px">
            {t("borrowerMarketList.sidebar.title.asset")}
          </Typography>
          <RadioGroup
            defaultValue={marketAsset}
            name="radio-asset"
            onChange={handleChangeAsset}
          >
            <FormControlLabel
              value="All"
              control={<ExtendedRadio />}
              label={t("borrowerMarketList.sidebar.radio.all")}
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
