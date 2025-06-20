import React, { ChangeEvent, useState } from "react"

import {
  Box,
  Button,
  Dialog,
  IconButton,
  InputAdornment,
  MenuItem,
  SvgIcon,
  TextField,
  Typography,
} from "@mui/material"
import { MarketAccount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import Cross from "@/assets/icons/cross_icon.svg"
import Search from "@/assets/icons/search_icon.svg"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"

export type MobileSearchButtonProps = {
  marketAccounts: MarketAccount[]
  marketSearch: string
  setMarketSearch: React.Dispatch<React.SetStateAction<string>>
}

export const MobileSearchButton = ({
  marketAccounts,
  marketSearch,
  setMarketSearch,
}: MobileSearchButtonProps) => {
  const [open, setOpen] = useState<boolean>(false)

  const handleToggleOpen = () => setOpen((prev) => !prev)

  const handleChangeValue = (evt: ChangeEvent<HTMLInputElement>) => {
    setMarketSearch(evt.target.value)
  }

  const handleClickErase = (evt: React.MouseEvent) => {
    evt.stopPropagation()
    setMarketSearch("")
  }

  return (
    <>
      {marketSearch === "" && (
        <IconButton
          onClick={handleToggleOpen}
          sx={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            backgroundColor: COLORS.blackHaze,
            "&:hover": {
              backgroundColor: COLORS.hintOfRed,
            },
          }}
        >
          <SvgIcon
            sx={{
              fontSize: "14px",
              "& path": {
                fill: "#8A8C9F",
              },
            }}
          >
            <Search />
          </SvgIcon>
        </IconButton>
      )}

      {marketSearch !== "" && (
        <Box
          onClick={handleToggleOpen}
          sx={{
            padding: "6px 8px",
            borderRadius: "20px",
            display: "flex",
            alignItems: "center",
            gap: "2px",
            border: `1px solid ${COLORS.athensGrey}`,
            width: "fit-content",
          }}
        >
          <SvgIcon
            sx={{
              padding: "4px",
              fontSize: "18px",
              "& path": {
                fill: "#8A8C9F",
              },
            }}
          >
            <Search />
          </SvgIcon>

          <Typography
            variant="mobText3"
            noWrap
            sx={{
              maxWidth: 62,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {marketSearch}
          </Typography>

          <IconButton
            onClick={handleClickErase}
            sx={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "transparent",
              "&:hover": {
                backgroundColor: COLORS.hintOfRed,
              },
            }}
          >
            <SvgIcon
              sx={{
                fontSize: "12px",
                "& path": {
                  fill: "#8A8C9F",
                },
              }}
            >
              <Cross />
            </SvgIcon>
          </IconButton>
        </Box>
      )}

      <Dialog
        open={open}
        onClose={handleToggleOpen}
        sx={{
          height: "calc(100dvh - 64px)",
          marginTop: "auto",
          zIndex: 4,

          "& .MuiPaper-root.MuiDialog-paper": {
            maxWidth: "100%",
            maxHeight: "100%",
            height: "100%",
            border: "none",
            margin: "0 4px 4px",
            width: "100%",
            padding: "8px",
          },
          "& .MuiBackdrop-root": {
            marginTop: "auto",
            height: "100dvh",
            backgroundColor: "transparent",
            backdropFilter: "blur(10px)",
          },
        }}
      >
        <TextField
          value={marketSearch}
          onChange={handleChangeValue}
          onKeyDown={(e) => e.stopPropagation()}
          fullWidth
          size="small"
          placeholder="Search by Name"
          sx={{
            marginBottom: "8px",

            "& .MuiInputBase-root": {
              color: COLORS.blackRock,
              border: "none",
              borderBottom: `1px solid ${COLORS.whiteLilac}`,
              borderRadius: 0,
            },

            "& .MuiFormLabel-root": {
              color: COLORS.santasGrey,
            },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SvgIcon
                  fontSize="small"
                  sx={{
                    width: "20px",
                    "& path": { fill: `${COLORS.santasGrey}` },
                  }}
                >
                  <Search />
                </SvgIcon>
              </InputAdornment>
            ),
          }}
        />

        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            height: "100%",
            overflow: "auto",
          }}
        >
          {marketAccounts.map((market) => (
            <Link
              href={`${ROUTES.lender.market}/${market.market.address}`}
              style={{ textDecoration: "none" }}
            >
              <MenuItem
                key={market.market.address}
                value={market.market.address}
                sx={{
                  minHeight: "fit-content",
                  padding: "6px 12px",
                  borderRadius: "8px",
                }}
              >
                <Typography variant="text3">{market.market.name}</Typography>
              </MenuItem>
            </Link>
          ))}
        </Box>

        <Box sx={{ display: "flex", gap: "4px", paddingTop: "8px" }}>
          <Button
            onClick={handleClickErase}
            size="medium"
            variant="outlined"
            color="secondary"
            fullWidth
          >
            Reset
          </Button>

          <Button
            onClick={handleToggleOpen}
            size="medium"
            variant="contained"
            fullWidth
          >
            Search
          </Button>
        </Box>
      </Dialog>
    </>
  )
}
