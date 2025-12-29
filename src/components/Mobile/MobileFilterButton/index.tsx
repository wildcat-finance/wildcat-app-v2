import React, { useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  FormControlLabel,
  IconButton,
  SvgIcon,
  Typography,
} from "@mui/material"

import Cross from "@/assets/icons/cross_icon.svg"
import Filter from "@/assets/icons/filter_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { COLORS } from "@/theme/colors"

export type MobileFilterButtonProps = {
  assetsOptions: { id: string; name: string }[]
  statusesOptions: { id: string; name: string }[]
  withdrawalCycleOptions: { id: string; name: string }[]
  marketAssets: SmallFilterSelectItem[]
  setMarketAssets: React.Dispatch<React.SetStateAction<SmallFilterSelectItem[]>>
  marketStatuses: SmallFilterSelectItem[]
  setMarketStatuses: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >
  marketWithdrawalCycles: SmallFilterSelectItem[]
  setMarketWithdrawalCycles: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >
}

export const MobileFilterButton = ({
  assetsOptions,
  statusesOptions,
  withdrawalCycleOptions,
  marketAssets,
  setMarketAssets,
  marketStatuses,
  setMarketStatuses,
  marketWithdrawalCycles,
  setMarketWithdrawalCycles,
}: MobileFilterButtonProps) => {
  const [open, setOpen] = useState<boolean>(false)

  const allAssetsSelected =
    assetsOptions.length > 0 &&
    assetsOptions.every((opt) => marketAssets.some((sel) => sel.id === opt.id))

  const allStatusesSelected =
    statusesOptions.length > 0 &&
    statusesOptions.every((opt) =>
      marketStatuses.some((sel) => sel.id === opt.id),
    )

  const allWithdrawalCyclesSelected =
    withdrawalCycleOptions.length > 0 &&
    withdrawalCycleOptions.every((opt) =>
      marketWithdrawalCycles.some((sel) => sel.id === opt.id),
    )

  const isFiltered =
    (marketAssets.length > 0 && marketAssets.length !== assetsOptions.length) ||
    (marketStatuses.length > 0 &&
      marketStatuses.length !== statusesOptions.length) ||
    (marketWithdrawalCycles.length > 0 &&
      marketWithdrawalCycles.length !== withdrawalCycleOptions.length)

  const toggleAllAssets = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setMarketAssets(
        assetsOptions.map((opt) => ({ id: opt.id, name: opt.name })),
      )
    } else {
      setMarketAssets([])
    }
  }

  const toggleAllStatuses = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setMarketStatuses(
        statusesOptions.map((opt) => ({ id: opt.id, name: opt.name })),
      )
    } else {
      setMarketStatuses([])
    }
  }

  const toggleAllWithdrawalCycles = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (event.target.checked) {
      setMarketWithdrawalCycles(
        withdrawalCycleOptions.map((opt) => ({ id: opt.id, name: opt.name })),
      )
    } else {
      setMarketWithdrawalCycles([])
    }
  }

  const handleChangeAssets = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: SmallFilterSelectItem,
  ) => {
    if (event.target.checked) {
      setMarketAssets([...marketAssets, item])
    } else {
      setMarketAssets(
        marketAssets.filter((existingItem) => existingItem.id !== item.id),
      )
    }
  }

  const handleChangeStatuses = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: SmallFilterSelectItem,
  ) => {
    if (event.target.checked) {
      setMarketStatuses([...marketStatuses, item])
    } else {
      setMarketStatuses(
        marketStatuses.filter((existingItem) => existingItem.id !== item.id),
      )
    }
  }

  const handleChangeWithdrawalCycles = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: SmallFilterSelectItem,
  ) => {
    if (event.target.checked) {
      setMarketWithdrawalCycles([...marketWithdrawalCycles, item])
    } else {
      setMarketWithdrawalCycles(
        marketWithdrawalCycles.filter(
          (existingItem) => existingItem.id !== item.id,
        ),
      )
    }
  }

  const handleReset = () => {
    setMarketAssets([])
    setMarketStatuses([])
    setMarketWithdrawalCycles([])
  }

  const handleToggleOpen = () => setOpen((prev) => !prev)

  return (
    <>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <IconButton
          onClick={handleToggleOpen}
          sx={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: isFiltered ? "#E4EBFEB2" : COLORS.blackHaze,
            "& path": {
              stroke: isFiltered ? COLORS.ultramarineBlue : "#8A8C9F",
              transition: "stroke 0.2s",
            },
            "&:hover": {
              backgroundColor: isFiltered ? "#E4EBFEB2" : `${COLORS.hintOfRed}`,
            },
          }}
        >
          <Filter />
        </IconButton>
        {isFiltered && (
          <Box
            sx={{
              position: "absolute",
              top: "1px",
              right: "2px",
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              border: "1px solid white",
              backgroundColor: COLORS.ultramarineBlue,
            }}
          />
        )}
      </Box>

      <Dialog
        open={open}
        onClose={handleToggleOpen}
        sx={{
          backdropFilter: "blur(10px)",
          "& .MuiDialog-paper": {
            height: "fit-content",
            width: "100%",
            maxWidth: "100%",
            border: "none",
            borderRadius: "14px",
            padding: "12px 0px",
            margin: "auto 4px 4px",
          },
        }}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0 12px",
            marginBottom: "8px",
          }}
        >
          <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
            <SvgIcon
              sx={{ fontSize: "20px", "& path": { fill: COLORS.santasGrey } }}
            >
              <Filter />
            </SvgIcon>

            <Typography variant="mobText3" color={COLORS.santasGrey}>
              Filters
            </Typography>
          </Box>

          <IconButton
            onClick={handleToggleOpen}
            sx={{ width: "16px", height: "16px" }}
          >
            <SvgIcon
              sx={{ fontSize: "16px", "& path": { fill: COLORS.santasGrey } }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>

        <Divider />

        <Box
          sx={{
            margin: "16px 0",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            padding: "0px 12px",
          }}
        >
          <FormControlLabel
            label="Markets"
            control={
              <ExtendedCheckbox
                checked={allStatusesSelected}
                indeterminate={
                  marketStatuses.length > 0 && !allStatusesSelected
                }
                onChange={toggleAllStatuses}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />

          {statusesOptions.map((item) => (
            <FormControlLabel
              key={item.id}
              label={item.name}
              sx={{
                marginLeft: "16px",
                "& .MuiTypography-root": {
                  maxWidth: "145px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflowX: "hidden",
                },
              }}
              control={
                <ExtendedCheckbox
                  value={item}
                  onChange={(event) => handleChangeStatuses(event, item)}
                  checked={marketStatuses.some(
                    (selectedItem) => selectedItem.id === item.id,
                  )}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          ))}

          <FormControlLabel
            label="Withdrawal Cycle"
            control={
              <ExtendedCheckbox
                checked={allWithdrawalCyclesSelected}
                indeterminate={
                  marketWithdrawalCycles.length > 0 &&
                  !allWithdrawalCyclesSelected
                }
                onChange={toggleAllWithdrawalCycles}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />

          {withdrawalCycleOptions.map((item) => (
            <FormControlLabel
              key={item.id}
              label={item.name}
              sx={{
                marginLeft: "16px",
                "& .MuiTypography-root": {
                  maxWidth: "145px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflowX: "hidden",
                },
              }}
              control={
                <ExtendedCheckbox
                  value={item}
                  onChange={(event) =>
                    handleChangeWithdrawalCycles(event, item)
                  }
                  checked={marketWithdrawalCycles.some(
                    (selectedItem) => selectedItem.id === item.id,
                  )}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          ))}

          <FormControlLabel
            label="Currency"
            control={
              <ExtendedCheckbox
                checked={allAssetsSelected}
                indeterminate={marketAssets.length > 0 && !allAssetsSelected}
                onChange={toggleAllAssets}
                sx={{
                  "& ::before": {
                    transform: "translate(-3px, -3px) scale(0.75)",
                  },
                }}
              />
            }
          />

          {assetsOptions.map((item) => (
            <FormControlLabel
              key={item.id}
              label={item.name}
              sx={{
                marginLeft: "16px",
                "& .MuiTypography-root": {
                  maxWidth: "145px",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  overflowX: "hidden",
                },
              }}
              control={
                <ExtendedCheckbox
                  value={item}
                  onChange={(event) => handleChangeAssets(event, item)}
                  checked={marketAssets.some(
                    (selectedItem) => selectedItem.id === item.id,
                  )}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          ))}
        </Box>

        <Divider />

        <Box sx={{ width: "100%", padding: "12px 12px 0" }}>
          <Button
            onClick={handleReset}
            size="medium"
            variant="contained"
            color="secondary"
            fullWidth
          >
            Reset
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
