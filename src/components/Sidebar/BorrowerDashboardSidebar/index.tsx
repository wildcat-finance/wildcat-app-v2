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
  setMarketSection,
  setScrollTarget,
  setSection,
} from "@/store/slices/borrowerDashboardSlice/borrowerDashboardSlice"
import { COLORS } from "@/theme/colors"

export const AccordionArrow = ({ open }: { open: boolean }) => (
  <SvgIcon
    fontSize="small"
    sx={{ rotate: open ? "180deg" : "", "& path": { fill: COLORS.santasGrey } }}
  >
    <Arrow />
  </SvgIcon>
)

export const DashboardButton = ({
  label,
  amount,
  onClick,
}: {
  label: string
  amount?: number
  onClick?: () => void
}) => (
  <Box
    onClick={onClick}
    sx={{
      width: "100%",
      display: "flex",
      gap: "5px",
      alignItems: "center",
      cursor: "pointer",
    }}
  >
    <Typography variant="text3">{label}</Typography>
    <Typography variant="text3" color={COLORS.santasGrey}>
      {amount}
    </Typography>
  </Box>
)

export const DashboardSectionAccordion = ({
  open,
  label,
  amount,
  onClick,
  children,
  hideIndicator,
}: {
  open: boolean
  label: string
  amount?: number
  onClick?: () => void
  children?: ReactNode
  hideIndicator?: boolean
}) => (
  <Box>
    <Box
      onClick={onClick}
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
      }}
    >
      {!hideIndicator && (
        <Box
          sx={{
            width: "4px",
            height: "4px",
            borderRadius: "50%",
            backgroundColor: open ? COLORS.ultramarineBlue : "transparent",
            marginRight: "10px",
          }}
        />
      )}
      <Typography variant="text3" sx={{ marginRight: "6px" }}>
        {label}
      </Typography>
      <Typography variant="text3" color={COLORS.santasGrey}>
        {amount}
      </Typography>
    </Box>

    {open && (
      <Box
        sx={{
          width: "100%",
          paddingLeft: "40px",
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "10px",
        }}
      >
        {children}
      </Box>
    )}
  </Box>
)

export const DashboardPageAccordion = ({
  open,
  label,
  amount,
  onClick,
  children,
  icon,
  hideAccordionButton,
}: {
  open: boolean
  label: string
  amount?: number
  onClick?: () => void
  children?: ReactNode
  icon?: ReactNode
  hideAccordionButton?: boolean
}) => (
  <Box
    sx={{
      width: "100%",
      marginBottom: open ? "16px" : "4px",
    }}
  >
    <Box
      onClick={onClick}
      sx={{
        width: "100%",
        padding: "6px 12px",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        backgroundColor: open ? COLORS.whiteSmoke : "transparent",
        borderRadius: "8px",
        transition: "background-color 0.1s ease-in-out",
        cursor: "pointer",

        "&:hover": {
          backgroundColor: COLORS.whiteSmoke,
        },
      }}
    >
      <Box sx={{ display: "flex", width: "100%", alignItems: "center" }}>
        {icon}
        <Typography variant="text2" sx={{ marginRight: "6px" }}>
          {label}
        </Typography>
        <Typography variant="text2" color={COLORS.santasGrey}>
          {amount}
        </Typography>
      </Box>

      {!hideAccordionButton && <AccordionArrow open={open} />}
    </Box>
    {open && (
      <Box
        sx={{
          width: "100%",
          paddingLeft: "14px",
          marginTop: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "14px",
        }}
      >
        {children}
      </Box>
    )}
  </Box>
)

export const BorrowerDashboardSidebar = () => {
  const dispatch = useAppDispatch()

  const section = useAppSelector((state) => state.borrowerDashboard.section)
  const marketSection = useAppSelector(
    (state) => state.borrowerDashboard.marketSection,
  )

  const handleChangeSection = (selectedSection: BorrowerDashboardSections) => {
    dispatch(setSection(selectedSection))
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

      <DashboardPageAccordion
        label="Policies"
        open={section === BorrowerDashboardSections.POLICIES}
        onClick={() => handleChangeSection(BorrowerDashboardSections.POLICIES)}
        hideAccordionButton
        icon={
          <SvgIcon sx={{ marginRight: "10px" }}>
            <Policies />
          </SvgIcon>
        }
      />
    </Box>
  )
}
