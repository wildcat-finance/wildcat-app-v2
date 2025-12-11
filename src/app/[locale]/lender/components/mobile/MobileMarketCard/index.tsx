import * as React from "react"

import { Box, Button, Divider, SvgIcon, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import Link from "next/link"

import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import Ethereal from "@/assets/companies-icons/ethereal_icon.svg"
import Arrow from "@/assets/icons/arrowLeft_icon.svg"
import Avatar from "@/assets/icons/avatar_icon.svg"
import { MarketStatusChip } from "@/components/@extended/MarketStatusChip"
import { MarketTypeChip } from "@/components/@extended/MarketTypeChip"
import { AprChip } from "@/components/AprChip"
import { TooltipButton } from "@/components/TooltipButton"
import { ROUTES } from "@/routes"
import { COLORS } from "@/theme/colors"
import { formatBps, formatTokenWithCommas } from "@/utils/formatters"
import { getMarketStatusChip } from "@/utils/marketStatus"
import { getMarketTypeChip } from "@/utils/marketType"

export type LenderMobileMarketItem = {
  id: string
  status: ReturnType<typeof getMarketStatusChip>
  apr: number
  term: ReturnType<typeof getMarketTypeChip>
  name: string
  capacityLeft?: TokenAmount
  borrower: string | undefined
  borrowerAddress: string | undefined
  loan?: TokenAmount | undefined
  asset: string
  isSelfOnboard?: boolean
}

export const DepositArrow = () => (
  <SvgIcon
    sx={{
      fontSize: "11px",
      transform: "rotate(180deg)",
      "& path": { fill: COLORS.white },
    }}
  >
    <Arrow />
  </SvgIcon>
)

export const MobileMarketCard = ({
  marketItem,
  buttonText,
  buttonIcon,
  showBorrower = true,
  adsCard,
}: {
  marketItem: LenderMobileMarketItem
  buttonText?: string
  buttonIcon?: boolean
  showBorrower?: boolean
  adsCard?: boolean
}) => {
  const getDepositLine = () => {
    if (marketItem.loan) {
      if (marketItem.loan?.raw.isZero()) {
        return "0"
      }
      if (
        Number(
          formatTokenWithCommas(marketItem.loan, {
            fractionDigits: 2,
          }),
        ) < 0.00001
      ) {
        return "< 0.00001"
      }
      return formatTokenWithCommas(marketItem.loan, {
        fractionDigits: 2,
      })
    }

    return "0"
  }

  return (
    <Box
      sx={{
        width: "100%",
        backgroundColor: COLORS.white,
        padding: "12px",
        borderRadius: "14px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <Box sx={{ display: "flex", gap: "6px", alignItems: "center" }}>
          <MarketStatusChip status={marketItem.status} withPeriod={false} />

          {!adsCard && (
            <Typography variant="mobText4">{`${formatBps(
              marketItem.apr,
            )}%`}</Typography>
          )}
        </Box>

        <MarketTypeChip {...marketItem.term} />
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "2px",
        }}
      >
        <Typography variant="mobText2">{marketItem.name}</Typography>

        <Typography variant="mobText2">
          {marketItem.capacityLeft && marketItem.capacityLeft.gt(0)
            ? formatTokenWithCommas(marketItem.capacityLeft, {
                withSymbol: false,
                fractionDigits: 2,
              })
            : "0"}{" "}
          {marketItem.asset}
        </Typography>
      </Box>

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        {showBorrower && (
          <Link
            href={`${ROUTES.lender.profile}/${marketItem.borrowerAddress}`}
            style={{ display: "flex", textDecoration: "none" }}
          >
            <Box
              sx={{
                display: "flex",
                gap: "6px",
                alignItems: "center",
                padding: "2px 8px 2px 6px",
                borderRadius: "12px",
                bgcolor: COLORS.whiteSmoke,
                marginTop: "2px",
              }}
            >
              {marketItem.borrower && marketItem.borrower[0].startsWith("0") ? (
                <SvgIcon
                  sx={{
                    fontSize: "12px",
                    "& circle": { fill: "#4CA6D9", opacity: 1 },
                    "& path": { fill: COLORS.white },
                  }}
                >
                  <Avatar />
                </SvgIcon>
              ) : (
                <Box
                  sx={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    bgcolor: "#4CA6D9",

                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Typography
                    variant="mobText4"
                    sx={{
                      fontSize: "6px",
                      lineHeight: "6px",
                      color: COLORS.white,
                    }}
                  >
                    {marketItem.borrower && marketItem.borrower[0]}
                  </Typography>
                </Box>
              )}

              <Typography variant="mobText4">{marketItem.borrower}</Typography>
            </Box>
          </Link>
        )}

        <Typography variant="mobText4" color={COLORS.santasGrey}>
          available to lend
        </Typography>
      </Box>

      <Divider />

      {adsCard && (
        <>
          <Box sx={{ display: "flex", alignItems: "center", mt: "14px" }}>
            <Typography variant="mobText4" sx={{ mr: "4px" }}>
              Base APR
            </Typography>

            <Box
              sx={{
                padding: "0 6px",
                borderRadius: "12px",
                backgroundColor: COLORS.whiteSmoke,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography variant="text4">10%</Typography>
            </Box>

            <Typography variant="mobText4" sx={{ mr: "4px", ml: "10px" }}>
              20x Multiplier
            </Typography>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                backgroundColor: COLORS.whiteSmoke,
                padding: "2px 8px 2px 3px",
                borderRadius: "20px",
                mr: "4px",
              }}
            >
              <SvgIcon>
                <Ethena />
              </SvgIcon>

              <Typography variant="text4">Ethena Points</Typography>
            </Box>

            <TooltipButton
              value="Lenders may receive additional incentives distributed by external
            partners or protocol initiatives. These incentives are optional,
            variable, and not part of the core lending terms. Wildcat does not
            guarantee the program and accepts no liability."
            />
          </Box>

          <Box
            sx={{
              marginTop: "14px",
              display: "flex",
              flexDirection: "column",
              gap: "4px",
              padding: "10px",
              borderRadius: "8px",
              background:
                "radial-gradient(74.21% 105.42% at 50.11% 14.6%, rgba(58, 58, 58, 0.70) 3.13%, rgba(28, 28, 28, 0.70) 100%), #111",
            }}
          >
            <Box
              sx={{
                width: "100%",
                display: "flex",
                gap: "6px",
              }}
            >
              <Typography
                variant="mobText3"
                fontWeight={600}
                color={COLORS.white}
              >
                1 million weekly of
              </Typography>

              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  backgroundColor: "#383737",
                  padding: "2px 8px 2px 3px",
                  borderRadius: "20px",
                }}
              >
                <SvgIcon>
                  <Ethereal />
                </SvgIcon>

                <Typography variant="mobText4" color={COLORS.white}>
                  Ethereal Points
                </Typography>
              </Box>
            </Box>

            <Typography
              variant="mobText3"
              color={COLORS.white}
              sx={{ opacity: 0.8 }}
            >
              Receive pro-rate share of 1 million Ethereal points
            </Typography>
          </Box>

          {/* <Typography */}
          {/*  variant="text4" */}
          {/*  color={COLORS.santasGrey} */}
          {/*  sx={{ px: "5px", marginTop: "8px", marginBottom: "14px" }} */}
          {/* > */}
          {/*  Lenders may receive additional incentives distributed by external */}
          {/*  partners or protocol initiatives. These incentives are optional, */}
          {/*  variable, and not part of the core lending terms. Wildcat does not */}
          {/*  guarantee the program and accepts no liability. */}
          {/* </Typography> */}

          <Divider sx={{ marginTop: "14px" }} />
        </>
      )}

      <Box
        sx={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          marginTop: "14px",
        }}
      >
        <Box sx={{ display: "flex", gap: "2px", alignItems: "center" }}>
          {/* {marketItem.loan && ( */}
          {/*  <SvgIcon */}
          {/*    sx={{ */}
          {/*      fontSize: "10px", */}
          {/*      "& path": { fill: COLORS.santasGrey }, */}
          {/*    }} */}
          {/*  > */}
          {/*    <Profile /> */}
          {/*  </SvgIcon> */}
          {/* )} */}

          <Typography
            variant="mobText4"
            color={
              marketItem.loan && !marketItem.loan.raw.isZero()
                ? COLORS.blackRock
                : COLORS.santasGrey
            }
          >
            {/* eslint-disable-next-line no-nested-ternary */}
            {getDepositLine()} {marketItem.asset} deposited
          </Typography>
        </Box>

        <Box sx={{ display: "flex", gap: "6px" }}>
          <Link
            href={`${ROUTES.lender.market}/${marketItem.id}`}
            style={{ textDecoration: "none" }}
          >
            <Button
              variant="outlined"
              size="small"
              color="secondary"
              sx={{
                borderRadius: "8px",
                padding: "6px 14px",
                minWidth: "fit-content !important",
              }}
            >
              More
            </Button>
          </Link>
          {buttonText && (
            <Link
              href={`${ROUTES.lender.market}/${marketItem.id}`}
              style={{ textDecoration: "none" }}
            >
              <Button
                variant="contained"
                size="small"
                sx={{
                  minWidth: "fit-content !important",
                  height: "100%",
                  display: "flex",
                  gap: "2px",
                  borderRadius: "8px",
                  padding: "6px 14px",
                }}
              >
                {buttonText}

                {buttonIcon && <DepositArrow />}
              </Button>
            </Link>
          )}
        </Box>
      </Box>
    </Box>
  )
}
