import { CreateCustomMlaInput } from "../interface"

const paragraphs = [
  "MASTER LOAN AGREEMENT (TEST ONLY)",
  "This one-page agreement is a test document and has no legal effect. It is made on {{lender.timeSigned}} between {{borrower.name}} (the Borrower) and the holder of wallet {{lender.address}} (the Lender).",
  "1. Facility. The Borrower makes a credit facility available through the market at {{market.address}}. The Lender lends on these terms by depositing into that market.",
  "2. Interest. Interest accrues at {{market.apr}} a year, as the market contract sets it.",
  "3. Withdrawals. Withdrawals are processed in cycles of {{market.withdrawalBatchDuration}}, as the market contract provides.",
  "4. Governing law. This agreement is governed by the laws of England and Wales.",
]

/// A one-page custom MLA for tests, in the shape POST /api/mla/templates/custom
/// accepts: the HTML and plain text of a borrower's copy of the market MLA,
/// placeholders included. Tests replace `borrowerId` with a real
/// organisation; the zero id matches no borrower, so posting this unchanged is
/// refused. The application never reads template text from a file: the
/// MlaTemplate table is the source.
export const dummyCustomMla: CreateCustomMlaInput = {
  chainId: 11155111,
  borrowerId: "00000000-0000-0000-0000-000000000000",
  name: "Test Custom MLA",
  version: "1",
  description: "One-page test agreement; no legal effect.",
  html: [
    '<html><head><meta content="text/html; charset=UTF-8" http-equiv="content-type"><style>body { font-family: Arial, sans-serif; }</style></head><body>',
    ...paragraphs.map((paragraph) => `<p><span>${paragraph}</span></p>`),
    "</body></html>",
  ].join("\n"),
  plaintext: paragraphs.join("\n\n"),
}
