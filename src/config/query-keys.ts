// Build query keys, trimming only trailing `undefined` items.
export const k = <T extends readonly unknown[]>(
  ...args: T
): readonly unknown[] => {
  const arr = [...args]
  while (arr.length && arr[arr.length - 1] === undefined) arr.pop()
  return arr
}

const BORROWER_QUERY_KEYS = {
  // GET_ALL_LENDERS
  GET_ALL_LENDERS: (chainId: number) =>
    k(["borrower", "GET_ALL_LENDERS", chainId]),
  // GET_ALL_MARKETS
  GET_ALL_MARKETS: (
    chainId: number,
    marketFilter?: string,
    shouldSkipRecords?: boolean,
    variables?: unknown,
  ) =>
    k([
      "borrower",
      "GET_ALL_MARKETS",
      chainId,
      marketFilter,
      shouldSkipRecords,
      variables,
    ]),
  // GET_BASIC_BORROWER_DATA_KEY
  GET_BASIC_BORROWER_DATA: (chainId: number, borrowerAddress?: string) =>
    k(["borrower", "GET_BASIC_BORROWER_DATA", chainId, borrowerAddress]),
  // BORROWER_PROFILE_KEY
  GET_PROFILE: (chainId: number, borrowerAddress?: string) =>
    k(["borrower", "GET_PROFILE", chainId, borrowerAddress]),
  // CALCULATE_MARKET_ADDRESS_KEY
  CALCULATE_MARKET_ADDRESS: (chainId: number, salt: string) =>
    k(["borrower", "CALCULATE_MARKET_ADDRESS", chainId, salt]),
  // GET_BORROWER_HOOKS_DATA
  GET_HOOKS_DATA: (chainId: number, borrowerAddress?: string) =>
    k(["borrower", "GET_HOOKS_DATA", chainId, borrowerAddress]),
  // GET_BORROWER_HOOKS_DATA_WITH_SUBGRAPH
  GET_HOOKS_DATA_WITH_SUBGRAPH: (chainId: number, borrowerAddress?: string) =>
    k(["borrower", "GET_HOOKS_DATA_WITH_SUBGRAPH", chainId, borrowerAddress]),
  // GET_BORROWER_MARKETS
  GET_OWN_MARKETS: (
    chainId: number,
    borrowerAddress?: string,
    marketFilter?: string,
    shouldSkipRecords?: boolean,
    variables?: unknown,
  ) =>
    k([
      "borrower",
      "GET_OWN_MARKETS",
      chainId,
      borrowerAddress,
      marketFilter,
      shouldSkipRecords,
      variables,
    ]),
  // GET_BORROWER_MARKET_ACCOUNT_LEGACY_KEY
  GET_BORROWER_MARKET_ACCOUNT_LEGACY: (
    chainId: number,
    borrowerAddress?: string,
    marketAddress?: string,
    market?: unknown,
  ) =>
    k([
      "borrower",
      "GET_BORROWER_MARKET_ACCOUNT_LEGACY",
      chainId,
      borrowerAddress,
      marketAddress,
      market,
    ]),
  // GET_BORROWER_PROFILE_KEY
  // @TODO this is a duplicate of GET_PROFILE - double check that the fact the function
  // casts to BorrowerProfileInput instead of BorrowerProfile is not a problem for deduplication
  GET_BORROWER_PROFILE: (chainId: number, borrowerAddress?: string) =>
    k(["borrower", "GET_BORROWER_PROFILE", chainId, borrowerAddress]),
  // GET_CONTROLLER_KEY
  GET_CONTROLLER: (chainId: number, address?: string) =>
    k(["borrower", "GET_CONTROLLER", chainId, address]),
  GET_IS_REGISTERED_BORROWER: (chainId: number, address?: string) =>
    k(["borrower", "GET_IS_REGISTERED_BORROWER", chainId, address]),
  // GET_LENDERS_BY_MARKET_KEY
  GET_LENDERS_BY_MARKET: (chainId: number, marketAddress?: string) =>
    k(["borrower", "GET_LENDERS_BY_MARKET", chainId, marketAddress]),
  // GET_MLA_TEMPLATES_KEY
  GET_MLA_TEMPLATES: (chainId: number) =>
    k(["borrower", "GET_MLA_TEMPLATES", chainId]),
  // GET_MLA_TEMPLATE_KEY
  GET_MLA_TEMPLATE: (chainId: number, id?: number) =>
    k(["borrower", "GET_MLA_TEMPLATE", chainId, id]),
  // GET_POLICY_KEY
  GET_POLICY: (chainId: number, policyAddress?: string) =>
    k(["borrower", "GET_POLICY", chainId, policyAddress]),
  // GET_WITHDRAWALS_KEY
  GET_WITHDRAWALS: (
    chainId: number,
    kind: "initial" | "update",
    marketAddress?: string,
    updateQueryKeys?: unknown,
  ) =>
    k([
      "borrower",
      "GET_WITHDRAWALS",
      chainId,
      marketAddress,
      kind,
      updateQueryKeys,
    ]),
  // PREVIEW_MLA_KEY
  PREVIEW_MLA: {
    FROM_FORM: (
      chainId: number,
      marketAddress?: string,
      borrowerProfile?: unknown,
      asset?: unknown,
    ) =>
      k([
        "borrower",
        "PREVIEW_MLA",
        chainId,
        marketAddress,
        borrowerProfile,
        asset,
      ]),
    FROM_MARKET: (
      chainId: number,
      marketAddress?: string,
      borrowerProfile?: unknown,
      mlaTemplateId?: number,
      timeSigned?: number,
    ) =>
      k([
        "borrower",
        "PREVIEW_MLA",
        chainId,
        marketAddress,
        borrowerProfile,
        mlaTemplateId,
        timeSigned,
      ]),
  },
  // USE_BORROWER_INVITE_EXISTS_KEY
  GET_INVITE_EXISTS: (chainId: number, address?: string) =>
    k(["borrower", "GET_INVITE_EXISTS", chainId, address]),
  // USE_BORROWER_INVITE_KEY
  GET_INVITE: (chainId: number, address?: string, hasToken?: boolean) =>
    k(["borrower", "GET_INVITE", chainId, address, hasToken]),
} as const

const ADMIN_QUERY_KEYS = {
  // GET_ALL_BORROWER_INVITATIONS_KEY
  GET_ALL_BORROWER_INVITATIONS: (
    chainId: number,
    isAdmin?: boolean,
    address?: string,
  ) => k(["admin", "GET_ALL_BORROWER_INVITATIONS", chainId, isAdmin, address]),
  // GET_ALL_BORROWER_PROFILES_KEY
  GET_ALL_BORROWER_PROFILES: (
    chainId: number,
    isAdmin?: boolean,
    address?: string,
  ) => k(["admin", "GET_ALL_BORROWER_PROFILES", chainId, isAdmin, address]),
} as const

const USER_QUERY_KEYS = {
  // HAS_SIGNED_SLA_KEY
  HAS_SIGNED_SLA: (chainId: number, address?: string) =>
    k(["user", "HAS_SIGNED_SLA", chainId, address]),
  // SHOULD_REDIRECT_KEY
  SHOULD_REDIRECT: (chainId: number, address?: string, pathname?: string) =>
    k(["user", "SHOULD_REDIRECT", chainId, address, pathname]),
  // USE_REGISTERED_BORROWERS_KEY
  GET_BORROWER_NAMES: (chainId: number) =>
    k(["user", "GET_BORROWER_NAMES", chainId]),
} as const

const TOKEN_QUERY_KEYS = {
  // TOKEN_METADATA_KEY
  TOKEN_METADATA: (chainId: number, tokenAddress?: string) =>
    k(["token", "TOKEN_METADATA", chainId, tokenAddress]),
  // TOKEN_LIST_SEARCH_KEY
  TOKEN_LIST_SEARCH: (chainId: number, query?: string) =>
    k(["token", "TOKEN_LIST_SEARCH", chainId, query]),
} as const

const LENDER_QUERY_KEYS = {
  // GET_LENDER_MARKET_ACCOUNT_KEY
  GET_MARKET_ACCOUNT: (
    chainId: number,
    marketAddress?: string,
    lenderAddress?: string,
    kind?: "initial" | "update",
  ) =>
    k([
      "lender",
      "GET_LENDER_MARKET_ACCOUNT",
      chainId,
      marketAddress,
      lenderAddress,
      kind,
    ]),
  // GET_LENDER_WITHDRAWALS_KEY
  GET_WITHDRAWALS: {
    PREFIX: (chainId: number, lenderAddress?: string, marketAddress?: string) =>
      k(["lender", "GET_WITHDRAWALS", chainId, lenderAddress, marketAddress]),
    INITIAL: (
      chainId: number,
      lenderAddress?: string,
      marketAddress?: string,
    ) =>
      k([
        "lender",
        "GET_WITHDRAWALS",
        chainId,
        lenderAddress,
        marketAddress,
        "initial",
      ]),
    UPDATE: (
      chainId: number,
      lenderAddress?: string,
      marketAddress?: string,
      updateQueryKeys?: unknown,
    ) =>
      k([
        "lender",
        "GET_WITHDRAWALS",
        chainId,
        lenderAddress,
        marketAddress,
        "update",
        updateQueryKeys,
      ]),
  },
  // GET_LENDERS_ACCOUNTS_KEY
  GET_LENDER_ACCOUNTS: {
    PREFIX: (chainId: number, lenderAddress?: string) =>
      k(["lender", "GET_OWN_LENDER_ACCOUNTS", chainId, lenderAddress]),
    INITIAL: (chainId: number, lenderAddress?: string, filters?: unknown) =>
      k([
        "lender",
        "GET_OWN_LENDER_ACCOUNTS",
        chainId,
        lenderAddress,
        "initial",
        filters,
      ]),
    UPDATE: (
      chainId: number,
      lenderAddress?: string,
      updateQueryKeys?: unknown,
    ) =>
      k([
        "lender",
        "GET_OWN_LENDER_ACCOUNTS",
        chainId,
        lenderAddress,
        "update",
        updateQueryKeys,
      ]),
  },
  // GET_SIGNED_MLA_KEY
  GET_SIGNED_MLA: (
    chainId: number,
    marketAddress?: string,
    lenderAddress?: string,
  ) => k(["lender", "GET_SIGNED_MLA", chainId, marketAddress, lenderAddress]),
} as const

const MARKET_QUERY_KEYS = {
  // GET_ALL_TOKENS_WITH_MARKETS_KEY
  GET_ALL_TOKENS_WITH_MARKETS: (chainId: number) =>
    k(["markets", "GET_ALL_TOKENS_WITH_MARKETS", chainId]),
  // GET_MARKET_ACCOUNT_KEY
  GET_MARKET_ACCOUNT: (chainId: number, marketAddress?: string) =>
    k(["markets", "GET_MARKET_ACCOUNT", chainId, marketAddress]),
  // GET_MARKET_KEY
  GET_MARKET: (chainId: number, marketAddress?: string) =>
    k(["markets", "GET_MARKET", chainId, marketAddress]),
  // GET_MARKET_LENDERS_KEY
  GET_MARKET_LENDERS: (chainId: number, marketAddress?: string) =>
    k(["markets", "GET_MARKET_LENDERS", chainId, marketAddress]),
  // GET_MARKET_MLA_KEY
  GET_MARKET_MLA: (
    chainId: number,
    marketAddress?: string,
    userAddress?: string,
    token?: string,
  ) =>
    k([
      "markets",
      "GET_MARKET_MLA",
      chainId,
      marketAddress,
      userAddress,
      token,
    ]),
  // GET_MARKET_RECORDS_KEY
  GET_MARKET_RECORDS: (
    chainId: number,
    marketAddress?: string,
    page?: number,
    pageSize?: number,
    kinds?: string[],
  ) =>
    k([
      "markets",
      "GET_MARKET_RECORDS",
      chainId,
      marketAddress,
      page,
      pageSize,
      kinds,
    ]),
} as const

export const QueryKeys = {
  Borrower: BORROWER_QUERY_KEYS,
  Admin: ADMIN_QUERY_KEYS,
  User: USER_QUERY_KEYS,
  Token: TOKEN_QUERY_KEYS,
  Lender: LENDER_QUERY_KEYS,
  Markets: MARKET_QUERY_KEYS,
} as const
