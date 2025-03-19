import * as React from "react"
import { ReactNode } from "react"

import { Box, IconButton, SvgIcon, Typography } from "@mui/material"

import { SaleChip } from "@/app/[locale]/sale/components/SaleChip"
import Clock from "@/assets/icons/clock_icon.svg"
import LinkedIn from "@/assets/icons/linkedin_icon.svg"
import Docs from "@/assets/icons/policies_icon.svg"
import Site from "@/assets/icons/site_icon.svg"
import X from "@/assets/icons/x_icon.svg"
import { LinkGroup } from "@/components/LinkComponent"
import { TooltipButton } from "@/components/TooltipButton"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

const ContainerStyle = {
  width: "100%",
  display: "flex",
  justifyContent: "space-between",
  paddingBottom: "12px",
  borderBottom: `1px solid ${COLORS.athensGrey}`,
}

const HeaderStyle = {
  display: "flex",
  alignItems: "center",
  marginTop: "54px",
}

const CircleStyle = {
  width: "24px",
  height: "24px",
  borderRadius: "50%",
  backgroundColor: COLORS.athensGrey,
  marginRight: "10px",
}

const SaleChipContainerStyle = {
  display: "flex",
  gap: "6px",
  alignItems: "center",
  marginBottom: "12px",
}

const ActiveBadgeStyle = {
  width: "fit-content",
  padding: "2px 8px",
  backgroundColor: "#D1FAE6",
  borderRadius: "26px",
  display: "flex",
  alignItems: "center",
  gap: "4px",
}

const GreenDotStyle = {
  width: "6px",
  height: "6px",
  borderRadius: "50%",
  backgroundColor: "#28CA7C",
}

const IconContainerStyle = {
  display: "flex",
  gap: "6px",
}

const IconButtonStyle = {
  height: "28px",
  width: "28px",
  backgroundColor: COLORS.whiteSmoke,
  borderRadius: "8px",
  "&:hover": {
    backgroundColor: COLORS.athensGrey,
  },
}

const GridContainerStyle = {
  width: "100%",
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "36px",
  marginTop: "32px",
}

const BalanceSectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "24px",
}

const ParamsItemContainerStyle = {
  display: "flex",
  gap: "2px",
}

const ParamBoxStyle = {
  width: "fit-content",
  padding: "4px 8px",
  display: "flex",
  gap: "6px",
  backgroundColor: COLORS.whiteSmoke,
  borderRadius: "8px",
  alignItems: "center",
  marginBottom: "16px",
}

const SettingsSectionStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "12px",
  marginTop: "24px",
}

const ParamItemBoxStyle = {
  display: "flex",
  gap: "6px",
}

const ParamsItem = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <Box sx={ContainerStyle}>
    <Typography variant="text3" color={COLORS.santasGrey}>
      {title}
    </Typography>
    {children}
  </Box>
)

export type DetailsSectionProps = {
  address: string
}

export const DetailsSection = ({ address }: DetailsSectionProps) => (
  <>
    <Box>
      <Box sx={HeaderStyle}>
        <Box sx={CircleStyle} />

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
          <Box sx={SaleChipContainerStyle}>
            <Box sx={ActiveBadgeStyle}>
              <Box sx={GreenDotStyle} />
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
            Any description of token we need here to seem transparent and useful
          </Typography>
        </Box>

        <Box sx={{ width: "100%" }}>
          <Box sx={{ ...ParamBoxStyle, backgroundColor: COLORS.whiteSmoke }}>
            <SvgIcon
              sx={{
                "& path": {
                  fill: COLORS.greySuit,
                },
              }}
            >
              <Docs />
            </SvgIcon>

            <Typography variant="text2">{trimAddress(address)}</Typography>

            <LinkGroup linkValue={address} copyValue={address} />
          </Box>

          <Box sx={IconContainerStyle}>
            <IconButton sx={IconButtonStyle}>
              <Site />
            </IconButton>

            <IconButton sx={IconButtonStyle}>
              <LinkedIn />
            </IconButton>

            <IconButton sx={IconButtonStyle}>
              <X />
            </IconButton>
          </Box>
        </Box>
      </Box>
    </Box>

    <Box sx={GridContainerStyle}>
      <Box>
        <Typography variant="title3">Balances</Typography>

        <Box sx={BalanceSectionStyle}>
          <ParamsItem title="End Weight">
            <Box sx={ParamsItemContainerStyle}>
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
            <Box sx={ParamsItemContainerStyle}>
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

        <Box sx={BalanceSectionStyle}>
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

        <Box sx={SettingsSectionStyle}>
          <ParamsItem title="Owner Rights">
            <Box sx={ParamItemBoxStyle}>
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
)
