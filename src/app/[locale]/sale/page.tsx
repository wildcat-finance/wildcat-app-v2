import * as React from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import LineWithPrediction from "@/app/[locale]/sale/components/SaleChart"
import { SaleSidebar } from "@/app/[locale]/sale/components/SaleSidebar"
import Clock from "@/assets/icons/clock_icon.svg"
import Docs from "@/assets/icons/policies_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

export default function SaleTokenPage() {
  const address = "0xca732651410E915090d7A7D889A1E44eF4575fcE"

  return (
    <Box sx={{ height: "calc(100vh - 62px)", display: "flex" }}>
      <SaleSidebar />

      <Box sx={{ width: "100%" }}>
        <Box sx={{ width: "100%", padding: "32px 30px" }}>
          <Box>
            <Typography variant="text3" color={COLORS.santasGrey}>
              Price per Token
            </Typography>
            <Box sx={{ display: "flex", gap: "4px", alignItems: "flex-end" }}>
              <Typography variant="title2">4.5</Typography>

              <Typography variant="text3" marginBottom="2px">
                USDC
              </Typography>

              <Typography
                variant="text3"
                marginBottom="2px"
                color={COLORS.carminePink}
              >
                -3.87%
              </Typography>
            </Box>
          </Box>

          <Box
            sx={{
              marginTop: "26px",
              width: "100%",
              backgroundColor: COLORS.hintOfRed,
              borderRadius: "12px",
            }}
          >
            <LineWithPrediction />
          </Box>

          <Box>
            <Box
              sx={{ display: "flex", alignItems: "center", marginTop: "54px" }}
            >
              <Box
                sx={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  backgroundColor: COLORS.athensGrey,
                  marginRight: "10px",
                }}
              />

              <Typography
                variant="title2"
                sx={{ textTransform: "uppercase", marginRight: "12px" }}
              >
                WLDC
              </Typography>

              <Box
                sx={{
                  padding: "2px 8px",
                  backgroundColor: COLORS.glitter,
                  borderRadius: "26px",

                  display: "flex",
                  alignItems: "center",
                }}
              >
                <Typography variant="text4" color={COLORS.blueRibbon}>
                  $WLDC
                </Typography>
              </Box>
            </Box>

            <Box sx={{ marginTop: "12px", display: "flex", gap: "38px" }}>
              <Box sx={{ width: "100%" }}>
                <Box
                  sx={{
                    display: "flex",
                    gap: "6px",
                    alignItems: "center",
                    marginBottom: "12px",
                  }}
                >
                  <Box
                    sx={{
                      width: "fit-content",
                      padding: "2px 8px",
                      backgroundColor: "#D1FAE6",
                      borderRadius: "26px",

                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    <Box
                      sx={{
                        width: "6px",
                        height: "6px",
                        borderRadius: "50%",
                        backgroundColor: "#28CA7C",
                      }}
                    />
                    <Typography variant="text4" color="#19965A">
                      Active
                    </Typography>
                  </Box>

                  <SvgIcon
                    sx={{
                      "& path": {
                        fill: COLORS.greySuit,
                      },
                    }}
                  >
                    <Clock />
                  </SvgIcon>

                  <Typography variant="text3">
                    2 March, 2025 - 3 March, 2025
                  </Typography>
                </Box>

                <Typography variant="text2" color={COLORS.santasGrey}>
                  Any description of token we need here to seem transparent and
                  useful
                </Typography>
              </Box>

              <Box sx={{ width: "100%" }}>
                <Box
                  sx={{
                    width: "fit-content",
                    padding: "4px 8px",
                    display: "flex",
                    gap: "6px",
                    backgroundColor: COLORS.hintOfRed,
                    borderRadius: "8px",
                    alignItems: "center",
                  }}
                >
                  <SvgIcon
                    sx={{
                      "& path": {
                        fill: COLORS.greySuit,
                      },
                    }}
                  >
                    <Docs />
                  </SvgIcon>

                  <Typography variant="text2">
                    {trimAddress(address)}
                  </Typography>

                  {/* <LinkGroup */}
                  {/*  linkValue={`${EtherscanBaseUrl}/address/${address}`} */}
                  {/*  copyValue={address} */}
                  {/* /> */}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
