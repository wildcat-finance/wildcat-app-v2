import { Box, Dialog, Typography } from "@mui/material"
import { useTranslation } from "react-i18next"

import { TxModalFooter } from "@/components/TxModalComponents/TxModalFooter"
import { TxModalHeader } from "@/components/TxModalComponents/TxModalHeader"
import { COLORS } from "@/theme/colors"

import { TerminateModalProps } from "./interface"
import {
  MiddleContentContainer,
  RepayContainer,
  TerminateMarketTextContainer,
  TerminateModalDialog,
  TerminateModalRepatTextContainer,
} from "./style"

export const TerminateModal = ({ isOpen, setIsOpen }: TerminateModalProps) => {
  const { t } = useTranslation()

  const needToRepay = 0

  const rows = [
    { name: "WithDrawal Request", value: "0.3 ETH" },
    { name: "Remaining Loan", value: "0.3 ETH" },
    { name: "Remaining Interest", value: "0.3 ETH" },
    { name: "Protocol Fees", value: "0.3 ETH" },
  ]
  return (
    <Dialog fullWidth PaperProps={TerminateModalDialog} open={isOpen}>
      {needToRepay ? (
        <TxModalHeader
          title="Terminate Market"
          arrowOnClick={() => {
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

      {needToRepay ? (
        <Box sx={MiddleContentContainer}>
          <Box sx={TerminateModalRepatTextContainer}>
            <Typography color={COLORS.blueRibbon} variant="text3">
              You should repay remaining debt before market termination. <br />
              Learn more about this
            </Typography>
          </Box>
          <Box sx={RepayContainer}>
            {rows.map((item) => (
              <Box sx={{ display: "flex", gap: "4px" }}>
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

      {needToRepay ? (
        <TxModalFooter
          mainBtnText="Repay"
          mainBtnOnClick={() => {
            setIsOpen(!isOpen)
          }}
          disableMainBtn
          secondBtnText="Approve"
          secondBtnOnClick={() => {
            setIsOpen(!isOpen)
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
