import { CreateMlaTemplateInput } from "../interface"

/// A one-page custom MLA for tests, in the shape POST /api/mla/templates
/// accepts. Tests replace `borrowerId` with a real organisation; the zero id
/// matches no borrower, so posting this unchanged is refused. The application
/// never reads template text from a file: the MlaTemplate table is the source.
export const dummyCustomMla: CreateMlaTemplateInput & { borrowerId: string } = {
  chainId: 11155111,
  borrowerId: "00000000-0000-0000-0000-000000000000",
  name: "Test Custom MLA",
  version: "1.0",
  description: "One-page test agreement; no legal effect.",
  plaintext: [
    "MASTER LOAN AGREEMENT (CUSTOM, TEST ONLY)",
    "",
    "This one-page agreement is a test document and has no legal effect.",
    "",
    "Borrower: {{borrower.name}}, a {{borrower.entityKind}} organised in {{borrower.jurisdiction}}, with its registered address at {{borrower.physicalAddress}}, acting through the account {{borrower.address}}.",
    "",
    "Market: {{market.name}} ({{market.address}}) on {{network.name}} (chain {{network.chainId}}), lending {{asset.symbol}} ({{asset.address}}).",
    "",
    "Terms: annual interest rate {{market.apr}}; reserve ratio {{market.reserveRatio}}; delinquency fee {{market.delinquencyFee}}; grace period {{market.delinquencyGracePeriod}}; withdrawal cycle {{market.withdrawalBatchDuration}}; capacity {{market.capacity}}.",
    "",
    "Lender: {{lender.address}}, signing on {{lender.timeSigned}}.",
    "",
    "The borrower signed on {{borrower.timeSigned}}. Each party signs the keccak256 hash of this text as filled in for it.",
  ].join("\n"),
  borrowerFields: [
    { source: "borrower.name", placeholder: "[Borrower Name]" },
    { source: "borrower.entityKind", placeholder: "[Entity Kind]" },
    { source: "borrower.jurisdiction", placeholder: "[Jurisdiction]" },
    { source: "borrower.physicalAddress", placeholder: "[Registered Address]" },
    { source: "borrower.address", placeholder: "[Borrower Account]" },
    { source: "market.name", placeholder: "[Market Name]" },
    { source: "market.address", placeholder: "[Market Address]" },
    { source: "network.name", placeholder: "[Network]" },
    { source: "network.chainId", placeholder: "[Chain ID]" },
    { source: "asset.symbol", placeholder: "[Asset Symbol]" },
    { source: "asset.address", placeholder: "[Asset Address]" },
    { source: "market.apr", placeholder: "[APR]" },
    { source: "market.reserveRatio", placeholder: "[Reserve Ratio]" },
    { source: "market.delinquencyFee", placeholder: "[Delinquency Fee]" },
    {
      source: "market.delinquencyGracePeriod",
      placeholder: "[Grace Period]",
    },
    {
      source: "market.withdrawalBatchDuration",
      placeholder: "[Withdrawal Cycle]",
    },
    { source: "market.capacity", placeholder: "[Capacity]" },
    { source: "borrower.timeSigned", placeholder: "[Borrower Signing Date]" },
  ],
  lenderFields: [
    { source: "lender.address", placeholder: "[Lender Address]" },
    { source: "lender.timeSigned", placeholder: "[Lender Signing Date]" },
  ],
}
