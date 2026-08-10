import {
  NON_MLA_ACKNOWLEDGEMENT_STATEMENT_VERSION,
  NON_MLA_ACKNOWLEDGEMENT_TEXT,
} from "@/config/non-mla-acknowledgement"

export const buildNonMlaAcknowledgementText = ({
  marketAddress,
  marketName,
  borrowerLegalName,
  borrowerAlias,
  networkName,
  chainId,
}: {
  marketAddress: string
  marketName: string
  borrowerLegalName: string
  borrowerAlias?: string
  networkName: string
  chainId: number
}) =>
  NON_MLA_ACKNOWLEDGEMENT_TEXT.replace("{{marketName}}", marketName)
    .replace("{{borrowerLegalName}}", borrowerLegalName)
    .replace("{{borrowerAlias}}", borrowerAlias || "N/A")
    .replace("{{marketAddress}}", marketAddress.toLowerCase())
    .replace("{{networkName}}", networkName)
    .replace("{{chainId}}", chainId.toString())
    .replace("{{statementVersion}}", NON_MLA_ACKNOWLEDGEMENT_STATEMENT_VERSION)
