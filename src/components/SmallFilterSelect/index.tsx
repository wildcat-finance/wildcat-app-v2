import {
  ChangeEvent,
  Dispatch,
  SetStateAction,
  useRef,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from "react"
import * as React from "react"

import {
  Box,
  Button,
  FormControl,
  FormControlLabel,
  InputAdornment,
  InputLabel,
  Select,
  SvgIcon,
  TextField,
} from "@mui/material"

import Filter from "@/assets/icons/filter_icon.svg"
import Icon from "@/assets/icons/search_icon.svg"
import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { LendersMarketChip } from "@/components/LendersMarketChip"
import { COLORS } from "@/theme/colors"

export type SmallFilterSelectItem = { id: string; name: string }

export type SmallFilterSelectProps = {
  placeholder: string
  options: SmallFilterSelectItem[]
  selected: SmallFilterSelectItem[]
  setSelected: Dispatch<SetStateAction<SmallFilterSelectItem[]>>
  width?: string
}

const CollapsedChips = ({
  items,
  onDelete,
}: {
  items: SmallFilterSelectItem[]
  onDelete: (item: SmallFilterSelectItem) => void
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const measureRef = useRef<HTMLDivElement | null>(null)
  const ellipsisRef = useRef<HTMLDivElement | null>(null)
  const [visibleCount, setVisibleCount] = useState(items.length)

  // calculate a 'fake' row consisting of all assets selected + ... width
  // eg ((USDC) (DAI) (WETH) ...)
  // then do a one-shot pass adding chips until we have to use ...
  const recompute = useCallback(() => {
    const container = containerRef.current
    const measure = measureRef.current
    if (!container || !measure) return
    const allChips = Array.from(
      measure.querySelectorAll('[data-chip="true"]'),
    ) as HTMLElement[]
    if (allChips.length === 0) {
      setVisibleCount(0)
      return
    }
    const ellipsisWidth = ellipsisRef.current?.offsetWidth || 12
    const containerWidth = container.clientWidth
    if (!containerWidth) return

    const widths = allChips.map((c) => c.offsetWidth)
    let acc = 0
    let count = 0
    for (let i = 0; i < widths.length; i += 1) {
      const w = widths[i]
      const remainingAfter = widths.length - (i + 1)
      const needEllipsis = remainingAfter > 0
      const needed = acc + w + (needEllipsis ? ellipsisWidth : 0)
      if (needed <= containerWidth) {
        acc += w
        count = i + 1
      } else {
        break
      }
    }
    if (count === 0) count = 1 // always show at least one
    setVisibleCount(count)
  }, [])

  // re-run when the set of items change
  useLayoutEffect(() => {
    setVisibleCount(items.length)
    recompute()
  }, [items, recompute])

  useEffect(() => {
    const onResize = () => {
      recompute()
    }
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [recompute])

  const visible = items.slice(0, visibleCount)
  const hidden = items.slice(visibleCount)
  const showAll = hidden.length === 0

  return (
    <>
      <Box
        ref={containerRef}
        sx={{
          height: "20px",
          display: "flex",
          flexWrap: "nowrap",
          overflow: "hidden",
          gap: 0.5,
          alignItems: "center",
          width: "100%",
          "& > *": { flexShrink: 0 },
        }}
      >
        {visible.map((m) => (
          <LendersMarketChip
            key={m.id}
            type="new"
            marketName={m.name}
            withButton
            width="auto"
            onClick={() => onDelete(m)}
          />
        ))}
        {!showAll && (
          <Box
            sx={{
              height: "20px",
              display: "flex",
              alignItems: "center",
              paddingLeft: "4px",
              fontSize: "12px",
              lineHeight: 1,
              color: COLORS.ultramarineBlue,
              userSelect: "none",
            }}
            title={hidden.map((i) => i.name).join(", ")}
          >
            …
          </Box>
        )}
      </Box>
      {/* measurement layer */}
      <Box
        ref={measureRef}
        sx={{
          position: "absolute",
          visibility: "hidden",
          pointerEvents: "none",
          height: 0,
          overflow: "hidden",
          display: "flex",
          gap: 0.5,
        }}
      >
        {items.map((m) => (
          <Box key={m.id} data-chip="true">
            <LendersMarketChip
              type="new"
              marketName={m.name}
              withButton
              width="auto"
            />
          </Box>
        ))}
        <Box
          ref={ellipsisRef}
          sx={{
            height: "20px",
            display: "flex",
            alignItems: "center",
            paddingLeft: "4px",
            fontSize: "12px",
            lineHeight: 1,
            color: COLORS.ultramarineBlue,
          }}
        >
          …
        </Box>
      </Box>
    </>
  )
}

export const SmallFilterSelect = ({
  placeholder,
  options,
  selected,
  setSelected,
  width,
}: SmallFilterSelectProps) => {
  const [search, setSearch] = useState("")

  const selectRef = useRef<HTMLElement>(null)

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }

    setSearch("")
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  const handleChangeItems = (
    event: React.ChangeEvent<HTMLInputElement>,
    item: SmallFilterSelectItem,
  ) => {
    if (event.target.checked) {
      setSelected([...selected, item])
    } else {
      setSelected(
        selected.filter((existingItem) => existingItem.id !== item.id),
      )
    }
  }

  const handleDeleteItem = (item: SmallFilterSelectItem) => {
    setSelected(selected.filter((existingItem) => existingItem.id !== item.id))
  }

  const handleClear = () => {
    setSelected([])
  }

  const handleChangeName = (evt: ChangeEvent<HTMLInputElement>) => {
    setSearch(evt.target.value)
  }

  const filteredOptions = options.filter(
    (option) =>
      option.name.toLowerCase().includes(search.toLowerCase()) ||
      option.id.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <FormControl>
      {selected.length === 0 && (
        <InputLabel
          sx={{
            fontSize: "13px",
            fontWeight: 500,
            lineHeight: "20px",
            color: COLORS.santasGrey,
            transform: "translate(33px, 6px)",
            pointerEvents: "none",

            "&.MuiInputLabel-shrink": {
              display: "block",

              "&.Mui-focused": {
                transform: "translate(33px, 6px)",
              },
            },
          }}
        >
          {placeholder}
        </InputLabel>
      )}

      <Select
        ref={selectRef}
        onOpen={onOpen}
        onClose={onClose}
        value={selected}
        size="small"
        multiple
        startAdornment={
          <SvgIcon
            fontSize="big"
            sx={{
              "& path": { stroke: `${COLORS.greySuit}` },
            }}
          >
            <Filter />
          </SvgIcon>
        }
        renderValue={(selectedMarkets) => (
          <CollapsedChips items={selectedMarkets} onDelete={handleDeleteItem} />
        )}
        MenuProps={{
          sx: {
            "& .MuiPaper-root": {
              width: "234px",
              height: "fit-content",
              fontFamily: "inherit",
              padding: "12px",
              marginTop: "2px",
            },
          },
          anchorOrigin: {
            vertical: "bottom",
            horizontal: "left",
          },
          transformOrigin: {
            vertical: "top",
            horizontal: "left",
          },
        }}
        sx={{
          width: width || "180px",
          height: "32px",
          "& .MuiSelect-icon": {
            display: "block",
            top: "5px",
            transform: "translate(3.5px, 0px) scale(0.7)",
            "&.MuiSelect-iconOpen": {
              transform: "translate(3.5px, 0px) scale(0.7) rotate(180deg)",
            },

            "& path": { fill: `${COLORS.santasGrey}` },
          },
        }}
      >
        <TextField
          value={search}
          onChange={handleChangeName}
          fullWidth
          size="small"
          placeholder="Search"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{
                    width: "20px",
                    "& path": { fill: `${COLORS.greySuit}` },
                  }}
                >
                  <Icon />
                </SvgIcon>
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            maxHeight: "150px",
            overflow: "auto",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            marginTop: "20px",
            padding: "0px 10px",
          }}
        >
          {filteredOptions.map((item) => (
            <FormControlLabel
              key={item.id}
              label={item.name}
              sx={{
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
                  onChange={(event) => handleChangeItems(event, item)}
                  checked={selected.some(
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

        <Button
          onClick={handleClear}
          size="medium"
          variant="contained"
          color="secondary"
          sx={{ width: "100%", marginTop: "12px" }}
        >
          Reset
        </Button>
      </Select>
    </FormControl>
  )
}
