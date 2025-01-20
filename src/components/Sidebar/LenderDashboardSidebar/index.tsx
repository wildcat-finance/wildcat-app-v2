import { Box, SvgIcon } from "@mui/material"

import Markets from "@/assets/icons/markets_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  LenderMarketDashboardSections,
  setMarketSection,
  setScrollTarget,
} from "@/store/slices/lenderDashboardSlice/lenderDashboardSlice"
import { COLORS } from "@/theme/colors"

import {
  DashboardButton,
  DashboardPageAccordion,
  DashboardSectionAccordion,
} from "../DashboardSidebarComponents"

export const LenderDashboardSidebar = () => {
  const dispatch = useAppDispatch()

  const marketSection = useAppSelector(
    (state) => state.lenderDashboard.marketSection,
  )

  const handleChangeMarketSection = (
    selectedMarketSection: LenderMarketDashboardSections,
  ) => {
    dispatch(setMarketSection(selectedMarketSection))
  }

  const handleScrollToTable = (target: string) => {
    dispatch(setScrollTarget(target))
  }

  return (
    <Box
      sx={{
        height: "100%",
        width: "267px",
        borderRight: `1px solid ${COLORS.blackRock006}`,
        padding: "42px 16px 0px",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <DashboardPageAccordion
        label="Markets"
        open
        icon={
          <SvgIcon sx={{ marginRight: "10px" }}>
            <Markets />
          </SvgIcon>
        }
      >
        <DashboardSectionAccordion
          label="Your Markets"
          open={marketSection === LenderMarketDashboardSections.ACTIVE}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.ACTIVE)
          }
        >
          <DashboardButton
            label="Deposited"
            onClick={() => handleScrollToTable("deposited")}
          />
          <DashboardButton
            label="Non-Deposited"
            onClick={() => handleScrollToTable("non-deposited")}
          />
          {/* <DashboardButton */}
          {/*  label="Outstanding Withdrawals" */}
          {/*  onClick={() => handleScrollToTable("outstanding")} */}
          {/* /> */}
        </DashboardSectionAccordion>

        <DashboardSectionAccordion
          label="Your Terminated Markets"
          open={marketSection === LenderMarketDashboardSections.TERMINATED}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.TERMINATED)
          }
        >
          <DashboardButton
            label="Previously Active"
            onClick={() => handleScrollToTable("prev-active")}
          />
          <DashboardButton
            label="Never Active"
            onClick={() => handleScrollToTable("never-active")}
          />
        </DashboardSectionAccordion>

        <DashboardSectionAccordion
          label="Other Markets"
          open={marketSection === LenderMarketDashboardSections.OTHER}
          onClick={() =>
            handleChangeMarketSection(LenderMarketDashboardSections.OTHER)
          }
        >
          <DashboardButton
            label="Self-Onboard"
            onClick={() => handleScrollToTable("self-onboard")}
          />
          <DashboardButton
            label="Onboard by Borrower"
            onClick={() => handleScrollToTable("manual")}
          />
        </DashboardSectionAccordion>
      </DashboardPageAccordion>
    </Box>
  )
}
