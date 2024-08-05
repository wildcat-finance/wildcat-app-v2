"use client"

import { Box, Button, Divider, Typography } from "@mui/material"
import { useAccount } from "wagmi"

import { useMarketsForBorrower } from "@/app/[locale]/borrower/hooks/useMarketsForBorrower"
import { MarketParametersItem } from "@/app/[locale]/borrower/market/[address]/components/MarketParameters/components/MarketParametersItem"
import { COLORS } from "@/theme/colors"

export default function BorrowerPage() {
  const { data: allMarkets, isLoading } = useMarketsForBorrower()
  const { address, isConnected } = useAccount()

  const activeMarkets = allMarkets?.filter(
    (market) =>
      market.borrower.toLowerCase() === address?.toLowerCase() &&
      !market.isClosed,
  )

  return (
    <Box
      sx={{
        width: "69.88%",
        height: "calc(100vh - 43px - 43px - 52px)",
        overflow: "hidden",
        padding: "52px 20px 0 44px",
      }}
    >
      <Box sx={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="title1">Wintermute LLC</Typography>
          <Box display="flex" gap="6px">
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              sx={{ height: "28px" }}
            >
              Website
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              sx={{ height: "28px" }}
            >
              Twitter
            </Button>

            <Button
              size="small"
              variant="outlined"
              color="secondary"
              sx={{ height: "28px" }}
            >
              Linkedin
            </Button>
          </Box>
        </Box>

        <Typography
          variant="text2"
          color={COLORS.santasGrey}
          sx={{ display: "inline-block", width: "586px" }}
        >
          – leading global algorithmic trading firm and one of the largest
          players in digital asset markets. With an average daily trading volume
          of over $5bn.
        </Typography>
      </Box>

      <Divider sx={{ margin: "32px 0" }} />

      <Box marginBottom="44px">
        <Typography variant="title3">Active Markets</Typography>
      </Box>

      <Box>
        <Typography variant="title3">Overall Info</Typography>

        <Box
          sx={{
            width: "100%",
            display: "flex",
            flexDirection: "row",
            gap: "24px",
            justifyContent: "space-between",
            marginTop: "24px",
          }}
        >
          <Box
            sx={{
              width: "48%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <MarketParametersItem
              title="Legal Name"
              value="Wintermute"
              link="Wintermute"
            />
            <Divider sx={{ margin: "12px 0 12px" }} />

            <MarketParametersItem title="Headquarters" value="London" />
            <Divider sx={{ margin: "12px 0 12px" }} />

            <MarketParametersItem title="Founded" value="2017" />
            <Divider sx={{ margin: "12px 0 12px" }} />
          </Box>

          <Box
            sx={{
              width: "48%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
            }}
          >
            <MarketParametersItem title="Markets" value="test" link="7" />
            <Divider sx={{ margin: "12px 0 12px" }} />

            <MarketParametersItem title="Markets" value="12 ETH" />
            <Divider sx={{ margin: "12px 0 12px" }} />

            <MarketParametersItem
              title="Defaults"
              value="0"
              tooltipText="TBD"
            />
            <Divider sx={{ margin: "12px 0 12px" }} />
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
