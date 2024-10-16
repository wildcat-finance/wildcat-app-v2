import { ChangeEvent, useEffect, useState } from "react"

import {
  Box,
  Button,
  FormControlLabel,
  InputAdornment,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"
import { useAccount } from "wagmi"

import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { FilterSelect } from "@/components/FilterSelect"
import { useCurrentNetwork } from "@/hooks/useCurrentNetwork"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  resetSidebarSlice,
  setMarketName,
  setMarketsAssets,
  setMarketsStatuses,
  setScrollTarget,
} from "@/store/slices/marketsOverviewSidebarSlice/marketsOverviewSidebarSlice"
import { COLORS } from "@/theme/colors"
import { MarketAssets, MarketStatus } from "@/utils/marketStatus"

export const underlyingAssetsMock = [
  {
    address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599",
    name: MarketAssets.WBTC,
  },
  {
    address: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
    name: MarketAssets.WETH,
  },
  {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    name: MarketAssets.USDT,
  },
  {
    address: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    name: MarketAssets.USDC,
  },
  {
    address: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    name: MarketAssets.DAI,
  },
]

export const SidebarButton = ({
  label,
  amount,
  onClick,
}: {
  label: string
  amount?: string
  onClick?: () => void
}) => (
  <Box
    onClick={onClick}
    sx={{
      height: "28px",
      width: "100%",
      display: "flex",
      gap: "5px",
      alignItems: "center",
      cursor: "pointer",
    }}
  >
    <Typography variant="text3">{label}</Typography>
    <Typography variant="text3" color={COLORS.santasGrey}>
      {amount}
    </Typography>
  </Box>
)

export const MarketsTabSidebar = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const pathname = usePathname()

  const { isConnected } = useAccount()
  const { isWrongNetwork } = useCurrentNetwork()
  const showConnectedData = isConnected && !isWrongNetwork

  const [selectedAssets, setSelectedAssets] = useState<
    { name: string; address: string }[]
  >([])

  const marketName = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketName,
  )
  const marketsStatuses = useAppSelector(
    (state) => state.marketsOverviewSidebar.marketsStatuses,
  )

  const activeAmount = useAppSelector(
    (state) => state.marketsOverviewSidebar.activeMarketsAmount,
  )
  const terminatedAmount = useAppSelector(
    (state) => state.marketsOverviewSidebar.terminatedMarketsAmount,
  )
  const otherAmount = useAppSelector(
    (state) => state.marketsOverviewSidebar.otherMarketsAmount,
  )

  const handleChangeMarketStatus = (
    event: React.ChangeEvent<HTMLInputElement>,
    status: MarketStatus,
  ) => {
    if (event.target.checked) {
      dispatch(setMarketsStatuses([...marketsStatuses, status]))
    } else {
      dispatch(
        setMarketsStatuses(
          marketsStatuses.filter((existingStatus) => existingStatus !== status),
        ),
      )
    }
  }

  const handleChangeMarketName = (evt: ChangeEvent<HTMLInputElement>) => {
    dispatch(setMarketName(evt.target.value))
  }

  const handleClearStatuses = () => {
    dispatch(setMarketsStatuses([]))
  }

  const handleClickReset = () => {
    setSelectedAssets([])
    dispatch(resetSidebarSlice())
  }

  const scrollToMarkets = (
    target: "active-markets" | "terminated-markets" | "other-markets",
  ) => {
    dispatch(setScrollTarget(target))
  }

  useEffect(() => {
    dispatch(setMarketsAssets(selectedAssets))
  }, [selectedAssets])

  useEffect(() => {
    setSelectedAssets([])
    dispatch(resetSidebarSlice())
  }, [pathname])

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        padding: "42px 16px 0px",
        display: "flex",
        flexDirection: "column",
        rowGap: "24px",
      }}
    >
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

      <Box>
        <Typography
          variant="text3"
          color={COLORS.santasGrey}
          sx={{ height: "20px" }}
        >
          Markets Types
        </Typography>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginTop: "10px",
          }}
        >
          {showConnectedData && (
            <SidebarButton
              label="Your Active Markets"
              amount={activeAmount}
              onClick={() => scrollToMarkets("active-markets")}
            />
          )}
          {showConnectedData && (
            <SidebarButton
              label="Your Terminated Markets"
              amount={terminatedAmount}
              onClick={() => scrollToMarkets("terminated-markets")}
            />
          )}
          <SidebarButton
            label="Other Markets"
            amount={otherAmount}
            onClick={() => scrollToMarkets("other-markets")}
          />
        </Box>
      </Box>

      <Box>
        <Box
          sx={{
            display: "flex",
            width: "100%",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="text3" color={COLORS.santasGrey}>
            Active Market Status
          </Typography>

          {marketsStatuses.length !== 0 && (
            <Button
              onClick={handleClearStatuses}
              variant="text"
              size="small"
              sx={{
                color: COLORS.ultramarineBlue,
                padding: 0,
                minWidth: "min-content",
                "&:hover": {
                  backgroundColor: "transparent",
                  color: COLORS.cornflowerBlue,
                },
              }}
            >
              Clear
            </Button>
          )}
        </Box>

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <FormControlLabel
            label={MarketStatus.HEALTHY}
            control={
              <ExtendedCheckbox
                value={MarketStatus.HEALTHY}
                onChange={(event) =>
                  handleChangeMarketStatus(event, MarketStatus.HEALTHY)
                }
                checked={marketsStatuses.some(
                  (selectedStatus) => selectedStatus === MarketStatus.HEALTHY,
                )}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />

          <FormControlLabel
            label={MarketStatus.DELINQUENT}
            control={
              <ExtendedCheckbox
                value={MarketStatus.DELINQUENT}
                onChange={(event) =>
                  handleChangeMarketStatus(event, MarketStatus.DELINQUENT)
                }
                checked={marketsStatuses.some(
                  (selectedStatus) =>
                    selectedStatus === MarketStatus.DELINQUENT,
                )}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />

          <FormControlLabel
            label={MarketStatus.PENALTY}
            control={
              <ExtendedCheckbox
                value={MarketStatus.PENALTY}
                onChange={(event) =>
                  handleChangeMarketStatus(event, MarketStatus.PENALTY)
                }
                checked={marketsStatuses.some(
                  (selectedStatus) => selectedStatus === MarketStatus.PENALTY,
                )}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />
        </Box>
      </Box>

      <FilterSelect
        label="Underlying Asset"
        placeholder="Filter by Asset"
        selected={selectedAssets}
        setSelected={setSelectedAssets}
        options={underlyingAssetsMock}
      />

      <Button
        onClick={handleClickReset}
        variant="contained"
        color="secondary"
        size="medium"
        sx={{ height: "32px", padding: "11px" }}
      >
        Reset all filters
      </Button>
    </Box>
  )
}
