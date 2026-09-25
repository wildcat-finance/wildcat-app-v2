import React, { useId, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  Divider,
  FormControlLabel,
  IconButton,
  RadioGroup,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import Cross from "@/assets/icons/cross_icon.svg"
import Filter from "@/assets/icons/filter_icon.svg"
import ExtendedRadio from "@/components/@extended/ExtendedRadio"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { SmallFilterSelectItem } from "@/components/SmallFilterSelect"
import { COLORS } from "@/theme/colors"

export type MobileFilterSortDirection = "asc" | "desc"

export type MobileFilterButtonProps = {
  assetsOptions: { id: string; name: string }[]
  statusesOptions?: { id: string; name: string }[]
  withdrawalCycleOptions: { id: string; name: string }[]
  marketAssets: SmallFilterSelectItem[]
  setMarketAssets: React.Dispatch<React.SetStateAction<SmallFilterSelectItem[]>>
  marketStatuses?: SmallFilterSelectItem[]
  setMarketStatuses?: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >
  marketWithdrawalCycles: SmallFilterSelectItem[]
  setMarketWithdrawalCycles: React.Dispatch<
    React.SetStateAction<SmallFilterSelectItem[]>
  >
  showSelfOnboard?: boolean
  setShowSelfOnboard?: React.Dispatch<React.SetStateAction<boolean>>
  showOnboardByBorrower?: boolean
  setShowOnboardByBorrower?: React.Dispatch<React.SetStateAction<boolean>>
  terms?: {
    options: { id: string; name: string }[]
    selected: SmallFilterSelectItem[]
    setSelected: React.Dispatch<React.SetStateAction<SmallFilterSelectItem[]>>
  }

  sort?: {
    fields: { id: string; name: string }[]
    field: string
    setField: (field: string) => void
    direction: MobileFilterSortDirection
    setDirection: (direction: MobileFilterSortDirection) => void
    defaultField: string
    defaultDirection: MobileFilterSortDirection
  }
}

const optionCheckboxSx = {
  "& ::before": {
    transform: "translate(-3px, -3px) scale(0.75)",
  },
}

const nestedOptionSx = {
  marginLeft: "16px",
  "& .MuiTypography-root": {
    maxWidth: "145px",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    overflowX: "hidden",
  },
}

export const MobileFilterButton = ({
  assetsOptions,
  statusesOptions = [],
  withdrawalCycleOptions,
  marketAssets,
  setMarketAssets,
  marketStatuses = [],
  setMarketStatuses,
  marketWithdrawalCycles,
  setMarketWithdrawalCycles,
  showSelfOnboard,
  setShowSelfOnboard,
  showOnboardByBorrower,
  setShowOnboardByBorrower,
  terms,
  sort,
}: MobileFilterButtonProps) => {
  const { t } = useTranslation()

  const [open, setOpen] = useState<boolean>(false)
  const sortLabelId = useId()
  const sortDirectionLabelId = useId()

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

  const allTermsSelected =
    !!terms &&
    terms.options.length > 0 &&
    terms.options.every((opt) =>
      terms.selected.some((sel) => sel.id === opt.id),
    )

  const isFiltered =
    (marketAssets.length > 0 && marketAssets.length !== assetsOptions.length) ||
    (marketStatuses.length > 0 &&
      marketStatuses.length !== statusesOptions.length) ||
    (marketWithdrawalCycles.length > 0 &&
      marketWithdrawalCycles.length !== withdrawalCycleOptions.length) ||
    (!!terms &&
      terms.selected.length > 0 &&
      terms.selected.length !== terms.options.length)

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
      setMarketStatuses?.(
        statusesOptions.map((opt) => ({ id: opt.id, name: opt.name })),
      )
    } else {
      setMarketStatuses?.([])
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
      setMarketStatuses?.([...marketStatuses, item])
    } else {
      setMarketStatuses?.(
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

  const toggleAllTerms = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!terms) return
    terms.setSelected(
      event.target.checked
        ? terms.options.map((opt) => ({ id: opt.id, name: opt.name }))
        : [],
    )
  }

  const handleChangeTerms = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: SmallFilterSelectItem,
  ) => {
    if (!terms) return
    terms.setSelected(
      event.target.checked
        ? [...terms.selected, item]
        : terms.selected.filter((existingItem) => existingItem.id !== item.id),
    )
  }

  const handleReset = () => {
    setMarketAssets([])
    setMarketStatuses?.([])
    setMarketWithdrawalCycles([])
    terms?.setSelected([])
    if (sort) {
      sort.setField(sort.defaultField)
      sort.setDirection(sort.defaultDirection)
    }
  }

  const handleToggleOpen = () => setOpen((prev) => !prev)

  return (
    <>
      <Box sx={{ position: "relative", display: "inline-flex" }}>
        <IconButton
          onClick={handleToggleOpen}
          aria-label={t("common.labels.filters")}
          aria-haspopup="dialog"
          aria-expanded={open}
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
            flexShrink: 0,
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
              {t("common.labels.filters")}
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
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            minHeight: 0,
            overflowY: "auto",
            padding: "16px 12px",
          }}
        >
          {sort && (
            <>
              <Typography
                id={sortLabelId}
                variant="mobText3"
                color={COLORS.santasGrey}
              >
                {t("common.labels.sortBy")}
              </Typography>
              <RadioGroup
                aria-labelledby={sortLabelId}
                name="mobile-filter-sort-field"
                value={sort.field}
                onChange={(event) => sort.setField(event.target.value)}
                sx={{ gap: "14px" }}
              >
                {sort.fields.map((option) => (
                  <FormControlLabel
                    key={option.id}
                    value={option.id}
                    label={option.name}
                    sx={nestedOptionSx}
                    control={<ExtendedRadio />}
                  />
                ))}
              </RadioGroup>
              <Divider />
              <Typography
                id={sortDirectionLabelId}
                variant="mobText3"
                color={COLORS.santasGrey}
              >
                {t("common.labels.sortDirection")}
              </Typography>
              <RadioGroup
                aria-labelledby={sortDirectionLabelId}
                name="mobile-filter-sort-direction"
                value={sort.direction}
                onChange={(event) =>
                  sort.setDirection(
                    event.target.value === "asc" ? "asc" : "desc",
                  )
                }
                sx={{ gap: "14px" }}
              >
                {(["desc", "asc"] as const).map((direction) => (
                  <FormControlLabel
                    key={direction}
                    value={direction}
                    label={t(
                      direction === "desc"
                        ? "common.labels.descending"
                        : "common.labels.ascending",
                    )}
                    sx={nestedOptionSx}
                    control={<ExtendedRadio />}
                  />
                ))}
              </RadioGroup>
              <Divider />
            </>
          )}

          {setShowSelfOnboard && (
            <FormControlLabel
              label={t("marketList.shared.tables.other.selfOnboard")}
              control={
                <ExtendedCheckbox
                  checked={showSelfOnboard}
                  onChange={(e) => setShowSelfOnboard(e.target.checked)}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          )}

          {setShowOnboardByBorrower && (
            <FormControlLabel
              label={t("marketList.shared.tables.other.manual")}
              control={
                <ExtendedCheckbox
                  checked={showOnboardByBorrower}
                  onChange={(e) => setShowOnboardByBorrower(e.target.checked)}
                  sx={{
                    "& ::before": {
                      transform: "translate(-3px, -3px) scale(0.75)",
                    },
                  }}
                />
              }
            />
          )}

          {statusesOptions.length > 0 && (
            <>
              <FormControlLabel
                label={t("common.placeholders.markets")}
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
            </>
          )}
          {terms && (
            <>
              <FormControlLabel
                label={t("common.fields.term")}
                control={
                  <ExtendedCheckbox
                    checked={allTermsSelected}
                    indeterminate={
                      terms.selected.length > 0 && !allTermsSelected
                    }
                    onChange={toggleAllTerms}
                    sx={optionCheckboxSx}
                  />
                }
              />
              {terms.options.map((item) => (
                <FormControlLabel
                  key={item.id}
                  label={item.name}
                  sx={nestedOptionSx}
                  control={
                    <ExtendedCheckbox
                      value={item}
                      onChange={(event) => handleChangeTerms(event, item)}
                      checked={terms.selected.some(
                        (selectedItem) => selectedItem.id === item.id,
                      )}
                      sx={optionCheckboxSx}
                    />
                  }
                />
              ))}
            </>
          )}
          <FormControlLabel
            label={t("common.placeholders.withdrawalCycle")}
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
            label={t("common.fields.currency")}
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

        <Box sx={{ width: "100%", flexShrink: 0, padding: "12px 12px 0" }}>
          <Button
            onClick={handleReset}
            size="medium"
            variant="contained"
            color="secondary"
            fullWidth
          >
            {t("common.buttons.reset")}
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
