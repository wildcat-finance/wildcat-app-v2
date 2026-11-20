import { Box, Typography } from "@mui/material"

import { BorrowerOrganisation } from "@/app/api/borrowers/interface"
import { NETWORKS_BY_ID } from "@/config/network"
import { COLORS } from "@/theme/colors"
import { trimAddress } from "@/utils/formatters"

/// Each of an organisation's wallets with its network, e.g.
/// "Sepolia 0x0000...16c8". Names are not unique, so this is what tells two
/// organisations apart.
export const describeOrganisationWallets = (
  registrations: BorrowerOrganisation["registrations"],
) =>
  registrations
    .map(
      ({ chainId, address }) =>
        `${
          NETWORKS_BY_ID[chainId as keyof typeof NETWORKS_BY_ID]?.name ??
          `Chain ${chainId}`
        } ${trimAddress(address)}`,
    )
    .join(" · ")

/// An organisation in an admin pick list: its name and alias, and below them
/// the wallets it borrows with.
export const BorrowerOrganisationOption = ({
  organisation,
}: {
  organisation: BorrowerOrganisation
}) => (
  <Box sx={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
    <Typography variant="text3">
      {organisation.alias
        ? `${organisation.name} (${organisation.alias})`
        : organisation.name}
    </Typography>
    <Typography
      variant="text4"
      color={COLORS.santasGrey}
      sx={{ whiteSpace: "normal", wordBreak: "break-word" }}
    >
      {describeOrganisationWallets(organisation.registrations)}
    </Typography>
  </Box>
)
