import { CreateCustomMlaInput } from "../interface"

/// A one-page custom MLA for tests, in the shape POST /api/mla/templates/custom
/// accepts: plain prose as a borrower would supply it. Tests replace
/// `borrowerId` with a real organisation; the zero id matches no borrower, so
/// posting this unchanged is refused. The application never reads template
/// text from a file: the MlaTemplate table is the source.
export const dummyCustomMla: CreateCustomMlaInput = {
  chainId: 11155111,
  borrowerId: "00000000-0000-0000-0000-000000000000",
  name: "Test Custom MLA",
  version: "1",
  description: "One-page test agreement; no legal effect.",
  text: [
    "MASTER LOAN AGREEMENT (TEST ONLY)",
    "",
    "This one-page agreement is a test document and has no legal effect.",
    "",
    "1. Facility. The Borrower makes a credit facility available to Lenders through the market identified in the execution details below. Each Lender who signs this agreement and deposits into that market lends on these terms.",
    "",
    "2. Interest. Interest accrues at the annual rate set in the market contract and is paid in accordance with the market contract.",
    "",
    "3. Withdrawals. Lenders withdraw through the market contract. Withdrawals are processed in batches as the market contract provides.",
    "",
    "4. Governing law. This agreement is governed by the laws of England and Wales.",
  ].join("\n"),
}
