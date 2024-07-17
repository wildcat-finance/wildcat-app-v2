import * as React from "react"

import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  SvgIcon,
  Typography,
} from "@mui/material"
import { useTranslation } from "react-i18next"

import {} from "@/app/[locale]/borrower/market/[address]/components/MarketHeader/style"
import { BorrowModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/BorrowModal"
import { CapacityModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/CapacityModal"
import { RepayModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/RepayModal"
import { StatementModal } from "@/app/[locale]/borrower/market/[address]/components/Modals/StatementModal"
import DocsIcon from "@/assets/icons/docs_icon.svg"
import { TransactionBlock } from "@/components/TransactionBlock"
import { formatTokenWithCommas } from "@/utils/formatters"

import { MarketTransactionsProps } from "./interface"
import {
  ElseButtonContainer,
  ElseButtonText,
  MarketTxContainer,
  MarketTxUpperButtonsContainer,
  MenuItemButton,
} from "./style"

export const MarketTransactions = ({
  market,
  marketAccount,
  holdTheMarket,
}: MarketTransactionsProps) => {
  const { t } = useTranslation()
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const handleClose = () => {
    setAnchorEl(null)
  }

  const disableRepay = market.isClosed || market.totalDebts.raw.isZero()
  const disableBorrow =
    market.isClosed ||
    market?.isDelinquent ||
    market.isIncurringPenalties ||
    (marketAccount && marketAccount.market.borrowableAssets.raw.isZero())

  return (
    <>
      {holdTheMarket && (
        <Box sx={MarketTxUpperButtonsContainer}>
          {/* <Button variant="outlined" color="secondary" size="small"> */}
          {/*  {t("borrowerMarketDetails.buttons.kyc")} */}
          {/* </Button> */}
          {/* <Button variant="outlined" color="secondary" size="small"> */}
          {/*  {t("borrowerMarketDetails.buttons.mla")} */}
          {/* </Button> */}
          <CapacityModal marketAccount={marketAccount} />
          <Button variant="outlined" color="secondary" size="small">
            {t("borrowerMarketDetails.buttons.apr")}
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
              setAnchorEl(event.currentTarget)
            }}
            sx={ElseButtonContainer}
          >
            <Typography variant="text4" sx={ElseButtonText}>
              ...
            </Typography>
          </Button>
          <Menu
            slotProps={{
              paper: {
                sx: { width: "220px", marginTop: "12px", marginLeft: "24px" },
              },
            }}
            disableScrollLock
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleClose}
          >
            <MenuItem
              onClick={() => {
                setIsOpen(!isOpen)
                handleClose()
              }}
            >
              <Button sx={MenuItemButton}>
                <SvgIcon fontSize="medium">
                  <DocsIcon />
                </SvgIcon>
                <Typography variant="text2">Statement</Typography>
              </Button>
            </MenuItem>
          </Menu>
          <StatementModal isOpen={isOpen} setIsOpen={setIsOpen} />
        </Box>
      )}

      {holdTheMarket && <Divider sx={{ margin: "32px 0" }} />}

      <Box sx={MarketTxContainer}>
        <TransactionBlock
          title={t("borrowerMarketDetails.transactions.toRepay.title")}
          tooltip={t("borrowerMarketDetails.transactions.toRepay.tooltip")}
          amount={formatTokenWithCommas(market.outstandingDebt)}
          asset={market.underlyingToken.symbol}
        >
          <RepayModal
            marketAccount={marketAccount}
            disableRepayBtn={disableRepay}
          />
        </TransactionBlock>

        <TransactionBlock
          title={t("borrowerMarketDetails.transactions.toBorrow.title")}
          tooltip={t("borrowerMarketDetails.transactions.toBorrow.tooltip")}
          amount={formatTokenWithCommas(marketAccount.market.borrowableAssets)}
          asset={market.underlyingToken.symbol}
        >
          <BorrowModal
            market={market}
            marketAccount={marketAccount}
            disableBorrowBtn={disableBorrow}
          />
        </TransactionBlock>
      </Box>
    </>
  )
}
