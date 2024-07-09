import { useState } from "react"

import { Box, Dialog, Link, SvgIcon, Typography } from "@mui/material"
import { TokenAmount } from "@wildcatfi/wildcat-sdk"
import { BigNumber } from "ethers"
import { usePathname } from "next/navigation"
import { useTranslation } from "react-i18next"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { EtherscanBaseUrl } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { formatTokenWithCommas } from "@/utils/formatters"

import { TerminateModalProps } from "./interface"
import {
  ContentContainer,
  MiddleContentContainer,
  RepayContainer,
  TerminateMarketTextContainer,
  TerminateModalDialog,
  TerminateModalRepatTextContainer,
} from "./style"
import LinkIcon from "../../../../../../../../assets/icons/link_icon.svg"
import { useGetMarket } from "../../../hooks/useGetMarket"
import { useGetWithdrawals } from "../../../hooks/useGetWithdrawals"

const LinkToEthescan = ({ sx }: { sx?: object }) => (
  <Box
    sx={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "6px",
      ...sx,
    }}
  >
    <Link
      href={`${EtherscanBaseUrl}/address/`}
      target="_blank"
      style={{ display: "flex", justifyContent: "center" }}
    >
      <SvgIcon>
        <LinkIcon />
      </SvgIcon>
    </Link>

    <Typography variant="text3">View on Ethescan</Typography>
  </Box>
)

export const TerminateModal = ({ isOpen, setIsOpen }: TerminateModalProps) => {
  const { t } = useTranslation()

  const fullPath = usePathname()
  const address = fullPath.slice(fullPath.lastIndexOf("/") + 1)

  const [mainButtonDisabled, setMainButtonDisabled] = useState(true)

  const { data: market } = useGetMarket({ address })
  const { data: withdrawals } = useGetWithdrawals(market)

  const getValues = () => {
    const values = []
    if (market) {
      // withdrawals
      const expiredTotalAmount = withdrawals.expiredWithdrawalsTotalOwed
      const activeTotalAmount = withdrawals.activeWithdrawalsTotalOwed
      const totalAmount = expiredTotalAmount.add(activeTotalAmount)
      values.push({
        name: "Withdrawal Request",
        value: formatTokenWithCommas(totalAmount, { withSymbol: true }),
      })

      // TODO get remaining loan and interest
      values.push(
        { name: "Remaining Loan", value: "0.3 ETH" },
        { name: "Remaining Interest", value: "0.3 ETH" },
      )

      // protocol fees
      if (market?.totalProtocolFeesAccrued)
        values.push({
          name: "Protocol Fees",
          value: formatTokenWithCommas(market?.totalProtocolFeesAccrued, {
            withSymbol: true,
          }),
        })
      else
        values.push({
          name: "Protocol Fees",
          value: formatTokenWithCommas(
            new TokenAmount(BigNumber.from(0), market.underlyingToken),
            { withSymbol: true },
          ),
        })
    }
    return values
  }

  const rows = getValues()

  const isLoading = 0
  const error = 1
  const success = 0

  if (isLoading)
    return (
      <Dialog fullWidth PaperProps={TerminateModalDialog} open={isOpen}>
        <TxModalHeader
          title=""
          arrowOnClick={null}
          crossOnClick={() => {
            setIsOpen(!isOpen)
          }}
        />
        <Box sx={ContentContainer}>
          <Box sx={{ ...TerminateMarketTextContainer, width: "240px" }}>
            <Typography align="center" variant="text2">
              Just wait a bit ..
            </Typography>
            <Typography
              align="center"
              variant="text3"
              color={COLORS.santasGrey}
            >
              Transaction in process or any other message. You can close the
              window.
            </Typography>
          </Box>
          <LinkToEthescan />
        </Box>
      </Dialog>
    )

  if (error)
    return (
      <Dialog fullWidth PaperProps={TerminateModalDialog} open={isOpen}>
        <TxModalHeader
          title=""
          arrowOnClick={null}
          crossOnClick={() => {
            setIsOpen(!isOpen)
          }}
        />
        <Box sx={ContentContainer}>
          <Box sx={{ ...TerminateMarketTextContainer, width: "240px" }}>
            <Typography align="center" variant="text2">
              Oops! Something goes wrong
            </Typography>
            <Typography
              align="center"
              variant="text3"
              color={COLORS.santasGrey}
            >
              Explanatory message about the problem.
            </Typography>
          </Box>
          <LinkToEthescan />
          <TxModalFooter
            mainBtnText="Try Again"
            mainBtnOnClick={() => {
              setIsOpen(!isOpen)
            }}
          />
        </Box>
      </Dialog>
    )

  if (success)
    return (
      <Dialog fullWidth PaperProps={TerminateModalDialog} open={isOpen}>
        <TxModalHeader
          title=""
          arrowOnClick={null}
          crossOnClick={() => {
            setIsOpen(!isOpen)
          }}
        />
        <Box sx={ContentContainer}>
          <Box sx={{ ...TerminateMarketTextContainer, width: "240px" }}>
            <Typography align="center" variant="text2">
              Success!
            </Typography>
            <Typography
              align="center"
              variant="text3"
              color={COLORS.santasGrey}
            >
              Any other message. You can close the window.
            </Typography>
          </Box>
          <LinkToEthescan />
        </Box>
      </Dialog>
    )

  return (
    <Dialog fullWidth PaperProps={TerminateModalDialog} open={isOpen}>
      {rows.length ? (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={() => {
            setMainButtonDisabled(true)
            setIsOpen(!isOpen)
          }}
          crossOnClick={null}
        />
      ) : (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={null}
          crossOnClick={() => {
            setIsOpen(!isOpen)
          }}
        />
      )}

      {rows.length ? (
        <Box sx={MiddleContentContainer}>
          <Box sx={TerminateModalRepatTextContainer}>
            <Typography color={COLORS.blueRibbon} variant="text3">
              You should repay remaining debt before market termination. <br />
              Learn more about this
            </Typography>
          </Box>
          <Box sx={RepayContainer}>
            {rows.map((item) => (
              <Box key={item.name} sx={{ display: "flex", gap: "4px" }}>
                <Typography color={COLORS.santasGrey} variant="text3">
                  {item.name}
                </Typography>
                <Box
                  sx={{
                    flex: 1,
                    borderBottom: "1px dashed",
                    borderColor: COLORS.iron,
                  }}
                />
                <Typography variant="text3" noWrap>
                  {item.value}
                </Typography>
              </Box>
            ))}
            <Box sx={{ display: "flex", gap: "4px", marginTop: "8px" }}>
              <Typography variant="text1">Total</Typography>
              <Box
                sx={{
                  flex: 1,
                  borderBottom: "1px dashed",
                  borderColor: COLORS.iron,
                }}
              />
              <Typography variant="text1" noWrap>
                1 ETH
              </Typography>
            </Box>
          </Box>
        </Box>
      ) : (
        <Box sx={TerminateMarketTextContainer}>
          <>
            <Typography align="center" variant="text2">
              Are you sure to terminate market?
            </Typography>
            <Typography
              align="center"
              variant="text3"
              color={COLORS.santasGrey}
            >
              Describing of termination consequences e.g. this <br /> change is
              irreversible.
            </Typography>
          </>
        </Box>
      )}

      {rows.length ? (
        <TxModalFooter
          mainBtnText="Repay"
          mainBtnOnClick={() => {
            setIsOpen(!isOpen)
          }}
          disableMainBtn={mainButtonDisabled}
          secondBtnText="Approved"
          disableSecondBtn={!mainButtonDisabled}
          secondBtnOnClick={() => {
            setMainButtonDisabled(!mainButtonDisabled)
          }}
        />
      ) : (
        <TxModalFooter
          mainBtnText="Terminate"
          mainBtnOnClick={() => {
            setIsOpen(!isOpen)
          }}
        />
      )}
    </Dialog>
  )
}
