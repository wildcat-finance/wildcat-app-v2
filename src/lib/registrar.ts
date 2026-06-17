import { gql } from "@apollo/client"
import {
  getDeploymentAddress,
  getSubgraphClient,
  SupportedChainId,
} from "@wildcatfi/wildcat-sdk"
import { providers } from "ethers"
import { hexZeroPad, keccak256, toUtf8Bytes } from "ethers/lib/utils"

const RESOLVE_TIMEOUT_MS = 5_000

const BORROWER_ADDED_TOPIC = keccak256(toUtf8Bytes("BorrowerAdded(address)"))

type RegistrationChange = {
  blockNumber: number
  blockLogIndex: number
  transactionHash: string
}

type RegisteredBorrowerResult = {
  borrower: string
  changes: RegistrationChange[]
}

const BORROWER_REGISTRATIONS_QUERY = gql`
  query BorrowerRegistrations($archController: String!, $borrowers: [Bytes!]!) {
    registeredBorrowers(
      where: { archController: $archController, borrower_in: $borrowers }
    ) {
      borrower
      changes(first: 10, orderBy: blockNumber, orderDirection: desc) {
        blockNumber
        blockLogIndex
        transactionHash
      }
    }
  }
`

async function withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
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

async function resolveViaSubgraph(
  chainId: SupportedChainId,
  borrowers: string[],
  provider: providers.JsonRpcProvider,
): Promise<Map<string, string>> {
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
  // Safe transactions batch several registrations, so receipts are shared.
  const receipts = new Map<string, providers.TransactionReceipt>()
  // eslint-disable-next-line no-restricted-syntax
  for (const registration of registrations) {
    const borrower = registration.borrower.toLowerCase()
    // Do NOT filter changes on isRegistered: handleBorrowerRemoved writes
    // isRegistered: true on the change entity (known subgraph bug). The callers'
    // gate provides correctness instead - this only runs for borrowers with
    // registeredOnChain = true and registeredBy still unset, and for a
    // currently-registered borrower the latest change is necessarily the
    // registering add.
    const latest = registration.changes
      .slice()
      .sort(
        (a, b) =>
          b.blockNumber - a.blockNumber || b.blockLogIndex - a.blockLogIndex,
      )[0]
    if (latest) {
      let receipt = receipts.get(latest.transactionHash)
      if (!receipt) {
        // eslint-disable-next-line no-await-in-loop
        receipt = await provider.getTransactionReceipt(latest.transactionHash)
        if (receipt) receipts.set(latest.transactionHash, receipt)
      }
      // The subgraph result is a verified hint, not a trusted source: the
      // receipt must contain a BorrowerAdded(borrower) log emitted by this
      // chain's ArchController. Registrations are routed through the admin
      // Safe (often batching several borrowers per transaction), so the outer
      // tx.to proves nothing - only the logs do.
      const emittedAdd = receipt?.logs.some(
        (log) =>
          log.address.toLowerCase() === archController &&
          log.topics[0] === BORROWER_ADDED_TOPIC &&
          log.data === hexZeroPad(borrower, 32),
      )
      if (!emittedAdd) {
        console.warn(
          `registeredBy: tx ${latest.transactionHash} on chain ${chainId} has ` +
            `no ArchController BorrowerAdded log for ${borrower}; leaving unresolved`,
        )
      } else if (receipt?.from) {
        resolved.set(borrower, receipt.from.toLowerCase())
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
  provider: providers.JsonRpcProvider,
): Promise<Map<string, string>> {
  if (borrowers.length === 0) return new Map()
  const lowered = borrowers.map((borrower) => borrower.toLowerCase())
  return withTimeout(
    resolveViaSubgraph(chainId, lowered, provider),
    `registeredBy resolution on chain ${chainId}`,
  )
}

/// Single-borrower variant that never throws: registrar resolution must not
/// break the flow that triggered it.
export async function tryResolveRegisteredBy(
  chainId: SupportedChainId,
  borrower: string,
  provider: providers.JsonRpcProvider,
): Promise<string | undefined> {
  try {
    const resolved = await resolveRegisteredByMany(
      chainId,
      [borrower],
      provider,
    )
    return resolved.get(borrower.toLowerCase())
  } catch (err) {
    console.warn(
      `Failed to resolve registeredBy for ${borrower} on chain ${chainId}:`,
      err instanceof Error ? err.message : err,
    )
    return undefined
  }
}
