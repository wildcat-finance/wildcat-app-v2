"use client"

import * as React from "react"
import { ReactNode, useState } from "react"

import { Box, IconButton, SvgIcon, Tab, Tabs, Typography } from "@mui/material"
import Link from "next/link"
import { useCopyToClipboard } from "react-use"

import { HistoryTable } from "@/app/[locale]/sale/components/HistoryTable"
import LineWithPrediction from "@/app/[locale]/sale/components/SaleChart"
import { SaleChip } from "@/app/[locale]/sale/components/SaleChip"
import { SaleSidebar } from "@/app/[locale]/sale/components/SaleSidebar"
import Clock from "@/assets/icons/clock_icon.svg"
import LinkedIn from "@/assets/icons/linkedin_icon.svg"
import Docs from "@/assets/icons/policies_icon.svg"
import Site from "@/assets/icons/site_icon.svg"
import X from "@/assets/icons/x_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { ButtonsContainer, ButtonStyle } from "@/components/LinkComponent/style"
import { TooltipButton } from "@/components/TooltipButton"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { pageCalcHeights } from "@/utils/constants"
import { trimAddress } from "@/utils/formatters"

const ParamsItem = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <Box
    sx={{
      width: "100%",
      display: "flex",
      justifyContent: "space-between",
      paddingBottom: "12px",
      borderBottom: `1px solid ${COLORS.athensGrey}`,
    }}
  >
    <Typography variant="text3" color={COLORS.santasGrey}>
      {title}
    </Typography>
    {children}
  </Box>
)

export default function SaleTokenPage() {
  const address = "0xca732651410E915090d7A7D889A1E44eF4575fcE"

  const [tab, setTab] = useState<"details" | "history" | "sale">("details")

  const handleTabsChange = (
    event: React.SyntheticEvent,
    newTab: "details" | "history" | "sale",
  ) => {
    setTab(newTab)
  }

  return (
    <Box sx={{ height: "calc(100vh - 62px)", display: "flex" }}>
      <SaleSidebar />

      <Box
        sx={{
          width: "100%",
          height: `calc(100vh - 61px)`,
          overflow: "auto",
          overflowY: "auto",
        }}
      >
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

          <Tabs
            value={tab}
            onChange={handleTabsChange}
            sx={{
              marginTop: "44px",
              height: "41px",
              minHeight: "41px",

              "& .MuiTabs-flexContainer": {
                alignItems: "flex-end",
              },
            }}
          >
            <Box
              sx={{
                width: "10px",
                minWidth: "10px",
                height: "1px",
                backgroundColor: COLORS.athensGrey,
              }}
            />
            <Tab
              value="details"
              label="LBP Details"
              sx={{
                fontSize: "13px",
                fontWeight: 500,
                lineHeight: "20px",
                height: "41px",
                minHeight: "41px",
                minWidth: "fit-content",
                padding: "0 4px",

                borderColor: COLORS.athensGrey,
              }}
            />
            <Tab
              value="history"
              label="Purchase History"
              sx={{
                fontSize: "13px",
                fontWeight: 500,
                lineHeight: "20px",
                height: "41px",
                minHeight: "41px",
                minWidth: "fit-content",
                padding: "0 4px",

                borderColor: COLORS.athensGrey,
              }}
            />
            <Tab
              value="sale"
              label="Sale Details"
              sx={{
                fontSize: "13px",
                fontWeight: 500,
                lineHeight: "20px",
                height: "41px",
                minHeight: "41px",
                minWidth: "fit-content",
                padding: "0 4px",

                borderColor: COLORS.athensGrey,
              }}
            />
            <Box
              sx={{
                width: "100%",
                height: "1px",
                backgroundColor: COLORS.athensGrey,
              }}
            />
          </Tabs>

          {tab === "details" && (
            <>
              <Box>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    marginTop: "54px",
                  }}
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

                  <SaleChip
                    value="$WLDC"
                    color={COLORS.glitter}
                    textColor={COLORS.blueRibbon}
                  />
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
                      Any description of token we need here to seem transparent
                      and useful
                    </Typography>
                  </Box>

                  <Box sx={{ width: "100%" }}>
                    <Box
                      sx={{
                        width: "fit-content",
                        padding: "4px 8px",
                        display: "flex",
                        gap: "6px",
                        backgroundColor: COLORS.whiteSmoke,
                        borderRadius: "8px",
                        alignItems: "center",
                        marginBottom: "16px",
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

                      <LinkGroup linkValue={address} copyValue={address} />
                    </Box>

                    <Box sx={{ display: "flex", gap: "6px" }}>
                      <IconButton
                        sx={{
                          height: "28px",
                          width: "28px",

                          backgroundColor: COLORS.whiteSmoke,
                          borderRadius: "8px",

                          "&:hover": {
                            backgroundColor: COLORS.athensGrey,
                          },
                        }}
                      >
                        <Site />
                      </IconButton>

                      <IconButton
                        sx={{
                          height: "28px",
                          width: "28px",

                          backgroundColor: COLORS.whiteSmoke,
                          borderRadius: "8px",

                          "&:hover": {
                            backgroundColor: COLORS.athensGrey,
                          },
                        }}
                      >
                        <LinkedIn />
                      </IconButton>

                      <IconButton
                        sx={{
                          height: "28px",
                          width: "28px",

                          backgroundColor: COLORS.whiteSmoke,
                          borderRadius: "8px",

                          "&:hover": {
                            backgroundColor: COLORS.athensGrey,
                          },
                        }}
                      >
                        <X />
                      </IconButton>
                    </Box>
                  </Box>
                </Box>
              </Box>

              <Box
                sx={{
                  width: "100%",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "36px",
                  marginTop: "32px",
                }}
              >
                <Box>
                  <Typography variant="title3">Balances</Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginTop: "24px",
                    }}
                  >
                    <ParamsItem title="End Weight">
                      <Box sx={{ display: "flex", gap: "2px" }}>
                        <SaleChip
                          value="99% USDC"
                          color={COLORS.glitter}
                          textColor={COLORS.blueRibbon}
                        />
                        <Typography variant="text3" color={COLORS.blueRibbon}>
                          /
                        </Typography>
                        <SaleChip
                          value="1% WLDC"
                          color={COLORS.glitter}
                          textColor={COLORS.blueRibbon}
                        />
                      </Box>
                    </ParamsItem>

                    <ParamsItem title="Start Weight">
                      <Box sx={{ display: "flex", gap: "2px" }}>
                        <SaleChip
                          value="1% USDC"
                          color={COLORS.whiteSmoke}
                          textColor={COLORS.blackRock}
                        />
                        <Typography variant="text3" color={COLORS.blackRock}>
                          /
                        </Typography>
                        <SaleChip
                          value="99% WLDC"
                          color={COLORS.whiteSmoke}
                          textColor={COLORS.blackRock}
                        />
                      </Box>
                    </ParamsItem>

                    <ParamsItem title="Total Volume">
                      <Typography variant="text3" color={COLORS.blackRock}>
                        998.98 USDC
                      </Typography>
                    </ParamsItem>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="title3">Statistic</Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginTop: "24px",
                    }}
                  >
                    <ParamsItem title="Main Token Released">
                      <Typography variant="text3" color={COLORS.blackRock}>
                        1.2 WLDC
                      </Typography>
                    </ParamsItem>

                    <ParamsItem title="Base Tokens Accrued">
                      <Typography variant="text3" color={COLORS.blackRock}>
                        0.234 USDC
                      </Typography>
                    </ParamsItem>

                    <ParamsItem title="Swap Fee">
                      <Typography variant="text3" color={COLORS.blackRock}>
                        0%
                      </Typography>
                    </ParamsItem>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="title3">Settings</Typography>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      marginTop: "24px",
                    }}
                  >
                    <ParamsItem title="Owner Rights">
                      <Box sx={{ display: "flex", gap: "6px" }}>
                        <Typography variant="text3" color={COLORS.blackRock}>
                          Pull Liquidity
                        </Typography>
                        <TooltipButton value="TBD" />
                      </Box>
                    </ParamsItem>
                  </Box>
                </Box>
              </Box>
            </>
          )}

          {tab === "history" && <HistoryTable />}
        </Box>
      </Box>
    </Box>
  )
}
