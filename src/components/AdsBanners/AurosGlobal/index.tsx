import * as React from "react"

import { Box, Divider, Paper, SvgIcon, Typography } from "@mui/material"

import Ethena from "@/assets/companies-icons/ethena_icon.svg"
import Ethereal from "@/assets/companies-icons/ethereal-white_icon.svg"
import { TooltipButton } from "@/components/TooltipButton"
import { useMobileResolution } from "@/hooks/useMobileResolution"
import { COLORS } from "@/theme/colors"

export type AurosGlobalProps = {
  type: "tooltip" | "parameter"
}

export const AurosGlobal = ({ type }: AurosGlobalProps) => {
  const isMobile = useMobileResolution()

  if (type === "parameter")
    return (
      <Box
        sx={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: isMobile ? "10px" : "12px",
        }}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "4px",
            }}
          >
            <Typography
              variant={isMobile ? "mobText3" : "text3"}
              color={COLORS.santasGrey}
            >
              Rewards APR
            </Typography>

            <TooltipButton
              value="Lenders may receive additional incentives distributed by external
          partners or protocol initiatives. These incentives are optional,
          variable, and not part of the core lending terms. Wildcat does not
          guarantee the program and accepts no liability."
            />
          </Box>

          <Box
            sx={{
              width: "fit-content",
              display: "flex",
              alignItems: "center",
              gap: "3px",
            }}
          >
            <Typography variant={isMobile ? "mobText3" : "text3"}>
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
              }}
            >
              <SvgIcon>
                <Ethena />
              </SvgIcon>

              <Typography variant={isMobile ? "mobText4" : "text4"}>
                Ethena Points
              </Typography>
            </Box>
          </Box>
        </Box>

        <Box
          sx={{
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
              variant={isMobile ? "mobText3" : "text3"}
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

              <Typography
                variant={isMobile ? "mobText4" : "text4"}
                color={COLORS.white}
              >
                Ethereal Points
              </Typography>
            </Box>
          </Box>

          <Typography
            variant={isMobile ? "mobText3" : "text3"}
            color={COLORS.white}
            sx={{ opacity: 0.8 }}
          >
            Receive pro-rate share of 1 million Ethereal points
          </Typography>
        </Box>
      </Box>
    )

  if (type === "tooltip" && !isMobile)
    return (
      <Paper
        sx={{
          boxSizing: "border-box",
          padding: "12px",
          borderRadius: "8px",
          borderColor: COLORS.athensGrey,

          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        <Box
          sx={{
            maxWidth: "294px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="text3" fontWeight={600}>
              Base APR
            </Typography>

            <Typography variant="text3" fontWeight={600}>
              10%
            </Typography>
          </Box>

          <Typography variant="text3" color={COLORS.blackRock}>
            – the core lending rate earned from borrowers.
          </Typography>
        </Box>

        <Box
          sx={{
            maxWidth: "294px",
            padding: "8px",
            borderRadius: "8px",
            backgroundColor: COLORS.glitter,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* <SvgIcon> */}
          {/*    <Withdrawal /> */}
          {/* </SvgIcon> */}

          <Typography variant="text3" color={COLORS.ultramarineBlue}>
            Request withdrawal any time
          </Typography>
        </Box>

        <Divider sx={{ borderColor: COLORS.athensGrey }} />

        <Box
          sx={{
            maxWidth: "294px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <Box
            sx={{
              width: "100%",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <Typography variant="text3" fontWeight={600}>
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
              }}
            >
              <SvgIcon>
                <Ethena />
              </SvgIcon>

              <Typography variant="text4">Ethena Points</Typography>
            </Box>
          </Box>

          <Typography variant="text3" color={COLORS.blackRock}>
            – additional rewards (tokens or points) provided by the protocol or
            partners
          </Typography>
        </Box>

        <Box
          sx={{
            maxWidth: "294px",
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
            <Typography variant="text3" fontWeight={600} color={COLORS.white}>
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

              <Typography variant="text4" color={COLORS.white}>
                Ethereal Points
              </Typography>
            </Box>
          </Box>

          <Typography
            variant="text3"
            color={COLORS.white}
            sx={{ opacity: 0.8 }}
          >
            Receive pro-rate share of 1 million Ethereal points
          </Typography>
        </Box>

        <Typography
          variant="text4"
          color={COLORS.santasGrey}
          sx={{ maxWidth: "294px", px: "5px" }}
        >
          Lenders may receive additional incentives distributed by external
          partners or protocol initiatives. These incentives are optional,
          variable, and not part of the core lending terms. Wildcat does not
          guarantee the program and accepts no liability.
        </Typography>
      </Paper>
    )

  return null
}
