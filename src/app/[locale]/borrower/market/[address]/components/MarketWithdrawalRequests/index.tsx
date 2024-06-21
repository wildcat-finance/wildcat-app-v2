import {
  Box,
  Divider,
  IconButton,
  Link,
  SvgIcon,
  Typography,
} from "@mui/material"
import { DataGrid, GridColDef } from "@mui/x-data-grid"
import { useTranslation } from "react-i18next"

import { Accordion } from "@/components/Accordion"
import { AddressButtons } from "@/components/Header/HeaderButton/ProfileDialog/style"
import { EtherscanBaseUrl } from "@/config/network"
import { trimAddress } from "@/utils/formatters"

import {
  AccordionSummaryTotalStyle,
  MarketWithdrawalRequestsContainer,
  MarketWithdrawalRequetstCell,
} from "./style"
import Copy from "../../../../../../../assets/icons/copy_icon.svg"
import LinkIcon from "../../../../../../../assets/icons/link_icon.svg"

export const MarketWithdrawalRequests = () => {
  const { t } = useTranslation()
  const rows = [
    {
      id: "1",
      lender: "Wildcat",
      transactionId: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      dateSubmitted: "12-Jul-2023",
      claimable: "Yes",
      amount: "1 ETH",
    },
    {
      id: "2",
      lender: "Wildcat",
      transactionId: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      dateSubmitted: "12-Jul-2023",
      claimable: "Yes",
      amount: "1 ETH",
    },
    {
      id: "3",
      lender: "Wildcat",
      transactionId: "0xaedfd7255f30b651c687831b47d73b179a8adc89",
      dateSubmitted: "12-Jul-2023",
      claimable: "Yes",
      amount: "1 ETH",
    },
  ]
  const columns: GridColDef[] = [
    {
      sortable: false,
      field: "lender",
      headerName: "Lender",
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">{value}</Typography>
          <Link
            href={`${EtherscanBaseUrl}/address/${value}`}
            target="_blank"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <IconButton disableRipple sx={AddressButtons}>
              <SvgIcon fontSize="medium">
                <LinkIcon />
              </SvgIcon>
            </IconButton>
          </Link>
        </Box>
      ),
    },
    {
      sortable: false,
      field: "transactionId",
      headerName: "Transaction ID",
      minWidth: 200,
      headerAlign: "left",
      align: "left",
      renderCell: ({ value }) => (
        <Box sx={MarketWithdrawalRequetstCell}>
          <Typography variant="text3">{trimAddress(value)}</Typography>
          <IconButton disableRipple sx={AddressButtons} onClick={() => {}}>
            <SvgIcon fontSize="medium">
              <Copy />
            </SvgIcon>
          </IconButton>
          <Link
            href={`${EtherscanBaseUrl}/address/${value}`}
            target="_blank"
            style={{ display: "flex", justifyContent: "center" }}
          >
            <IconButton disableRipple sx={AddressButtons}>
              <SvgIcon fontSize="medium">
                <LinkIcon />
              </SvgIcon>
            </IconButton>
          </Link>
        </Box>
      ),
    },
    {
      sortable: false,
      field: "dateSubmitted",
      headerName: "Date Submitted",
      minWidth: 150,
      headerAlign: "center",
      align: "center",
    },
    {
      sortable: false,
      field: "claimable",
      headerName: "Claimable",
      flex: 1,
      headerAlign: "left",
      align: "left",
    },
    {
      sortable: false,
      field: "amount",
      headerName: "Amount",
      minWidth: 85,
      headerAlign: "right",
      align: "right",
    },
  ]
  return (
    <Box sx={MarketWithdrawalRequestsContainer}>
      <Typography variant="title3">Open Withdrawals</Typography>
      <Accordion sx={AccordionSummaryTotalStyle} arrowRight title="Total">
        <Accordion title="Ongoing">
          <DataGrid rows={rows} columns={columns} columnHeaderHeight={40} />
        </Accordion>
        <Divider />
        <Accordion title="Outstanding from past cycles">
          <DataGrid rows={rows} columns={columns} columnHeaderHeight={40} />
        </Accordion>
      </Accordion>
    </Box>
  )
}
