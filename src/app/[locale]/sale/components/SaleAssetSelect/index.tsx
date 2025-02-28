import { Dispatch, SetStateAction, useMemo, useRef } from "react"
import * as React from "react"

import {
  Box,
  FormControlLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
} from "@mui/material"
import { SupportedChainId } from "@wildcatfi/wildcat-sdk"

import ExtendedCheckbox from "@/components/@extended/ExtendedСheckbox"
import { TargetChainId } from "@/config/network"
import { useAllTokensWithMarkets } from "@/hooks/useAllTokensWithMarkets"
import { COLORS } from "@/theme/colors"

export const SaleAssetSelect = ({
  selectedToken,
  setSelectedToken,
}: {
  selectedToken: string
  setSelectedToken: Dispatch<SetStateAction<string>>
}) => {
  const selectRef = useRef<HTMLElement>(null)

  const { data: tokensRaw } = useAllTokensWithMarkets()
  const tokens = useMemo(() => {
    if (TargetChainId === SupportedChainId.Sepolia) {
      /// Only take first token with a given symbol
      return tokensRaw?.filter(
        (token, index, self) =>
          index === self.findIndex((x) => x.symbol === token.symbol),
      )
    }
    return tokensRaw
  }, [tokensRaw])

  const handleChange = (event: SelectChangeEvent) => {
    setSelectedToken(event.target.value as string)
  }

  const onOpen = () => {
    if (selectRef.current) {
      selectRef.current.classList.add("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.add("Mui-focused")
    }
  }

  const onClose = () => {
    if (selectRef.current) {
      selectRef.current.classList.remove("Mui-focused")

      const previousElement = selectRef.current
        .previousSibling as Element | null
      previousElement?.classList.remove("Mui-focused")
    }
  }

  return (
    <Select
      ref={selectRef}
      onOpen={onOpen}
      onClose={onClose}
      value={selectedToken}
      onChange={handleChange}
      sx={{
        padding: 0,

        "& .MuiSelect-select.MuiSelect-filled.MuiInputBase-input.MuiFilledInput-input":
          {
            fontSize: "11px",
            paddingRight: "32px",
            paddingLeft: "4px",
          },

        "& .MuiSelect-select": {
          padding: 0,
        },

        "&.MuiInputBase-root.MuiFilledInput-root": {
          border: "transparent",
          width: "fit-content",
          minWidth: "54px",
          height: "100%",
          padding: 0,
        },

        "& .MuiSelect-icon": {
          "& path": { fill: `${COLORS.whiteLilac}` },
          right: "12px",
        },

        "&.Mui-disabled": {
          border: "transparent",
        },
      }}
    >
      {tokens &&
        tokens.map((token) => (
          <MenuItem value={token.address}>{token.symbol}</MenuItem>
        ))}
    </Select>
  )
}
