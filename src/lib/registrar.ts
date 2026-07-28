import { gql } from "@apollo/client"
import {
  getDeploymentAddress,
  getSubgraphClient,
  type SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import {
  decodeEventLog,
  type Hash,
  parseAbiItem,
  type PublicClient,
  toEventSelector,
  type TransactionReceipt,
} from "viem"

const RESOLVE_TIMEOUT_MS = 5_000

const BORROWER_ADDED_EVENT = parseAbiItem(
  "event BorrowerAdded(address borrower)",
)
const BORROWER_ADDED_ABI = [BORROWER_ADDED_EVENT] as const
const BORROWER_ADDED_TOPIC = toEventSelector(BORROWER_ADDED_EVENT)

type RegistrationChange = {
  isRegistered: boolean
  blockNumber: number
  blockLogIndex: number
  transactionHash: string
}

type RegisteredBorrowerResult = {
  borrower: string
  isRegistered: boolean
  changes: RegistrationChange[]
}

type RegistrarPublicClient = Pick<PublicClient, "getTransactionReceipt">

const BORROWER_REGISTRATIONS_QUERY = gql`
  query BorrowerRegistrations($archController: String!, $borrowers: [Bytes!]!) {
    registeredBorrowers(
      where: {
        archController: $archController
        borrower_in: $borrowers
        isRegistered: true
      }
    ) {
      borrower
      isRegistered
      changes(first: 10, orderBy: blockNumber, orderDirection: desc) {
        isRegistered
        blockNumber
        blockLogIndex
        transactionHash
      }
    }
  }
`

async function withTimeout<T>(promise: Promise<T>, label: string) {
  let timer: NodeJS.Timeout | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error(`${label} timed out after ${RESOLVE_TIMEOUT_MS}ms`),
            ),
          RESOLVE_TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    if (timer !== undefined) clearTimeout(timer)
  }
}

const containsBorrowerAddedLog = (
  receipt: TransactionReceipt,
  archController: string,
  borrower: string,
) =>
  receipt.logs.some((log) => {
    if (
      log.address.toLowerCase() !== archController ||
      log.topics[0] !== BORROWER_ADDED_TOPIC
    ) {
      return false
    }

    try {
      const event = decodeEventLog({
        abi: BORROWER_ADDED_ABI,
        data: log.data,
        topics: log.topics,
        strict: true,
      })
      return event.args.borrower.toLowerCase() === borrower
    } catch {
      return false
    }
  })

async function resolveViaSubgraph(
  chainId: SupportedChainId,
  borrowers: string[],
  publicClient: RegistrarPublicClient,
) {
  const resolved = new Map<string, string>()
  const archController = getDeploymentAddress(
    chainId,
    "WildcatArchController",
  ).toLowerCase()
  const { data } = await getSubgraphClient(chainId).query<{
    registeredBorrowers: RegisteredBorrowerResult[]
  }>({
    query: BORROWER_REGISTRATIONS_QUERY,
    variables: { archController, borrowers },
    fetchPolicy: "no-cache",
  })
  const registrations = data?.registeredBorrowers ?? []
  const receipts = new Map<string, TransactionReceipt>()

  // Safe transactions may batch several registrations, so receipts are shared.
  // eslint-disable-next-line no-restricted-syntax
  for (const registration of registrations) {
    if (registration.isRegistered) {
      const borrower = registration.borrower.toLowerCase()
      const latest = registration.changes
        .filter((change) => change.isRegistered)
        .sort(
          (a, b) =>
            b.blockNumber - a.blockNumber || b.blockLogIndex - a.blockLogIndex,
        )[0]

      if (latest) {
        let receipt = receipts.get(latest.transactionHash)
        if (!receipt) {
          // eslint-disable-next-line no-await-in-loop
          receipt = await publicClient.getTransactionReceipt({
            hash: latest.transactionHash as Hash,
          })
          receipts.set(latest.transactionHash, receipt)
        }

        // The subgraph result is a hint, not an authority. Verify that the receipt
        // emitted BorrowerAdded(borrower) from this chain's ArchController before
        // accepting the transaction sender.
        if (containsBorrowerAddedLog(receipt, archController, borrower)) {
          resolved.set(borrower, receipt.from.toLowerCase())
        } else {
          // eslint-disable-next-line no-console
          console.warn(
            `registeredBy: tx ${latest.transactionHash} on chain ${chainId} has ` +
              `no ArchController BorrowerAdded log for ${borrower}; leaving unresolved`,
          )
        }
      }
    }
  }

  return resolved
}

/// Resolve the account that submitted the registerBorrower transaction for each
/// borrower, from the sender of the transaction behind the most recent
/// BorrowerRegistrationChange in the Wildcat subgraph.
///
/// Best-effort and bounded: callers set registeredOnChain inside user-facing
/// requests, so resolution is capped by a short timeout and any failure simply
/// leaves registeredBy unset for the one-shot backfill script to sweep.
///
/// Returns lowercase borrower -> lowercase tx `from`. If the ArchController
/// owner is a Safe, `from` is the executor/relayer; that is acceptable.
export async function resolveRegisteredByMany(
  chainId: SupportedChainId,
  borrowers: string[],
  publicClient: RegistrarPublicClient,
) {
  if (borrowers.length === 0) return new Map<string, string>()

  return withTimeout(
    resolveViaSubgraph(
      chainId,
      borrowers.map((borrower) => borrower.toLowerCase()),
      publicClient,
    ),
    `registeredBy resolution on chain ${chainId}`,
  )
}

/// Single-borrower variant that never throws: registrar resolution must not
/// break the flow that triggered it.
export async function tryResolveRegisteredBy(
  chainId: SupportedChainId,
  borrower: string,
  publicClient: RegistrarPublicClient,
) {
  try {
    const resolved = await resolveRegisteredByMany(
      chainId,
      [borrower],
      publicClient,
    )
    return resolved.get(borrower.toLowerCase())
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn(
      `Failed to resolve registeredBy for ${borrower} on chain ${chainId}:`,
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}
