import { ReactNode } from "react"

import { Box, SvgIcon, Typography } from "@mui/material"

import Arrow from "@/assets/icons/downArrow_icon.svg"
import Markets from "@/assets/icons/markets_icon.svg"
import Policies from "@/assets/icons/policies_icon.svg"
import Lenders from "@/assets/icons/profile_icon.svg"
import { useAppDispatch, useAppSelector } from "@/store/hooks"
import {
  BorrowerDashboardSections,
  BorrowerMarketDashboardSections,
  resetMarketSection,
  setMarketSection,
  setScrollTarget,
  setSection,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"

import {
  DashboardButton,
  DashboardPageAccordion,
  DashboardSectionAccordion,
} from "../DashboardSidebarComponents"

export const BorrowerDashboardSidebar = () => {
  const dispatch = useAppDispatch()

  const section = useAppSelector((state) => state.borrowerDashboard.section)
  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )
  const showFullFunctionality = useAppSelector(
    (state) => state.borrowerDashboard.showFullFunctionality,
  )

  const handleChangeSection = (selectedSection: BorrowerDashboardSections) => {
    dispatch(setSection(selectedSection))
    dispatch(resetMarketSection())
  }

  const handleChangeMarketSection = (
    selectedMarketSection: BorrowerMarketDashboardSections,
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
        open={section === BorrowerDashboardSections.MARKETS}
        onClick={() => handleChangeSection(BorrowerDashboardSections.MARKETS)}
        icon={
          <SvgIcon sx={{ marginRight: "10px" }}>
            <Markets />
          </SvgIcon>
        }
      >
        <DashboardSectionAccordion
          label="Your Markets"
          open={marketSection === BorrowerMarketDashboardSections.ACTIVE}
          onClick={() =>
            handleChangeMarketSection(BorrowerMarketDashboardSections.ACTIVE)
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
          open={marketSection === BorrowerMarketDashboardSections.TERMINATED}
          onClick={() =>
            handleChangeMarketSection(
              BorrowerMarketDashboardSections.TERMINATED,
            )
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
          open={marketSection === BorrowerMarketDashboardSections.OTHER}
          onClick={() =>
            handleChangeMarketSection(BorrowerMarketDashboardSections.OTHER)
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

      {showFullFunctionality && (
        <DashboardPageAccordion
          label="Lenders"
          open={section === BorrowerDashboardSections.LENDERS}
          onClick={() => handleChangeSection(BorrowerDashboardSections.LENDERS)}
          icon={
            <SvgIcon sx={{ marginRight: "10px" }}>
              <Lenders />
            </SvgIcon>
          }
        >
          <DashboardSectionAccordion
            label="Active Lenders"
            open={false}
            hideIndicator
            onClick={() => handleScrollToTable("active")}
          />
          <DashboardSectionAccordion
            label="Deleted Lenders"
            open={false}
            hideIndicator
            onClick={() => handleScrollToTable("deleted")}
          />
        </DashboardPageAccordion>
      )}

      {showFullFunctionality && (
        <DashboardPageAccordion
          label="Policies"
          open={section === BorrowerDashboardSections.POLICIES}
          onClick={() =>
            handleChangeSection(BorrowerDashboardSections.POLICIES)
          }
          hideAccordionButton
          icon={
            <SvgIcon sx={{ marginRight: "10px" }}>
              <Policies />
            </SvgIcon>
          }
        />
      )}
    </Box>
  )
}
