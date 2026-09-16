import { EXPORT_SCHEMA_VERSION } from "./version"

export const dataDictionary = `# Wildcat export data dictionary

Schema version: ${EXPORT_SCHEMA_VERSION}

## Reading this export

Each market's data files cover deployment through the pinned snapshot. Date filters apply only to statements. In a multi-market ZIP, each market has its own data/ and statements/ folders. Amounts from different assets must not be added without an explicit conversion.

- All dates and timestamps are UTC. Daily rows end at the last block at or before 23:59:59 UTC, or the final snapshot if earlier. Their opening boundary is the previous row's snapshot; the first opens at deployment. Rates and accrued earnings use these actual block timestamps, not an assumed 86,400 seconds. Month and year summaries aggregate the corresponding daily intervals. Statement balance headlines always describe the final snapshot, even when historical activity dates are selected.
- Transactions and recorded interest are assigned to their recording block's date. An interest update can describe an accrual period ending before its recording time. Both timestamps are retained.
- Decimal amounts are exact strings. An amount and its corresponding _raw integer satisfy amount = raw / 10^asset_decimals. Native gas fees use 18 decimals. Scaled token units also use asset_decimals but require multiplication by scale_factor_ray / 10^27 to obtain asset value. Ray values are integers scaled by 10^27.
- Arithmetic uses integers and the contract's rounding. APRs are annualised on a fixed 365-day basis where annualisation is needed, and displayed as percentages, not fractions. Period APRs are rounded once to six decimal places, half up. End-of-day configured rates use two places; protocol fee APR uses six. 1 basis point is 0.01 percentage points.
- A zero is a measured zero. Empty flow fields on failed calls mean no successful movement. Other empty optional fields mean not applicable or unavailable, as described below. Period APRs are empty when the elapsed interval is zero. Do not interpret that as a zero rate. Snapshot state remains valid.
- CSV uses quoted RFC 4180 fields and LF line endings. Text that could be interpreted as a spreadsheet formula is prefixed with an apostrophe. Import addresses, hashes and raw integers as text to avoid spreadsheet precision loss. Arrays and objects inside CSV cells are JSON.

## Accounting and rate definitions

Market-token value = totalSupply(), including interest and unfunded queued tokens.
Total lender obligation = market-token value + funded, unclaimed withdrawal assets.
Total debt obligation = total lender obligation + outstanding protocol fees.
Outstanding loan balance = max(total debt obligation - assets held, 0).

Lender earnings accrued = closing total lender obligation - opening total lender obligation + withdrawals paid (including forced buybacks) - deposits received.
This is economic lender earnings during the actual interval, including interest not yet emitted in an update and contract base-unit rounding. It is not a tax allocation or a sum of recorded interest events. Token transfers between holders and funding a withdrawal batch do not create new earnings. A small signed rounding adjustment can appear even with a zero interest rate.
Protocol fees accrued = closing outstanding protocol fees - opening outstanding protocol fees + fees collected.

Recorded lender interest = base interest + penalty interest from updates recorded during the period. Recorded fees are the fees emitted by those updates. These can include growth from an earlier period and omit growth since the latest update. Do not add accrued and recorded amounts: they are alternative reporting views.

Period-average base, penalty and protocol fee APRs integrate the applicable rates over the actual row interval. Penalty time follows the contract's grace timer, including any period after liquidity recovers while that timer unwinds. The lender period-average APR is base plus penalty; the borrower period-average APR additionally includes protocol fees. All combined rates are calculated before rounding, so displayed components can differ from their displayed sum by one last decimal place.
Lender growth APR = (closing scale factor / opening scale factor - 1) * 365 * 86400 / elapsed seconds * 100. It reflects actual token-value growth and intra-period compounding; it is distinct from the average configured rate and from any particular lender's cash earnings.

## Shared identity fields

| Field | Meaning |
| --- | --- |
| market_address | Wildcat market contract address; primary market identity. |
| market_symbol, market_name | On-chain token symbol and market name; labels, not identifiers. |
| chain_id | EVM chain ID. |
| asset_address, asset_symbol, asset_decimals | Underlying asset contract identity, display label and decimal precision. |
| block_number | Block that recorded the transaction or event. |
| timestamp_utc | Timestamp of the recording block, including for interest accrual records. |
| tx_hash | Transaction hash. |
| tx_index | Transaction's zero-based index within its block. |
| log_index | Event's zero-based index within its block. |
| tx_from, tx_to | Top-level transaction sender and recipient, not necessarily the affected lender. tx_to can be empty for contract creation. |
| method | Decoded market method where recognised; otherwise selector. A routed call includes its top-level target. |

## transactions.csv

One row per included transaction. Shared fields above apply.

| Field (and _raw partner where listed) | Meaning |
| --- | --- |
| status | success, success_asset_transfer_only, or failed. Asset-transfer-only rows have underlying transfers without a decoded market event. |
| deposited, deposited_raw | Assets deposited for newly minted market tokens. |
| borrowed, borrowed_raw | Assets drawn by the borrower. |
| repaid, repaid_raw | Assets repaid to the market. |
| withdrawal_queued, withdrawal_queued_raw | Token value requested for withdrawal when queued; not an asset cash outflow. |
| withdrawal_executed, withdrawal_executed_raw | Assets paid on executed withdrawals or forced buybacks, including principal and interest. |
| fees_collected, fees_collected_raw | Assets transferred out as protocol fee collections. |
| escrowed_out, escrowed_out_raw | Direct sanctioned asset transfers to escrow; companion events do not duplicate ordinary withdrawals. |
| untracked_asset_in, untracked_asset_in_raw | Underlying asset inflows not explained by deposit or repayment events. |
| untracked_asset_out, untracked_asset_out_raw | Underlying asset outflows not explained by the other cash-out categories. |
| market_tokens_transferred, market_tokens_transferred_raw | Non-mint/non-burn market-token transfer values. These are not underlying-asset cash flows and must not be added to deposits or withdrawals. |
| gas_used | Receipt gas used, integer. |
| gas_price_wei | Effective transaction gas price in wei per gas. |
| tx_fee_native, tx_fee_native_raw | Total top-level transaction gas cost in native currency and wei: gas_used * gas_price_wei. It is not an allocation to this market for a multi-market transaction. |
| events | Semicolon-separated decoded market event names in this transaction. |
| summary | Human-readable summary of classified movements or failure. |

Asset balance reconciles from cumulative deposited + repaid + untracked_asset_in - borrowed - withdrawal_executed - fees_collected - escrowed_out - untracked_asset_out.

## events.csv

One row per supported market-contract event, including administrative events. Shared identity fields apply. Event amount fields do not always represent money moving.

| Field | Meaning |
| --- | --- |
| event | ABI event name. |
| participant, counterparty | Relevant addresses extracted from that event; empty when not applicable. Refer to details_json for exact parameter roles. |
| token_address, token_symbol | Relevant token where applicable; empty for events without a token interpretation. |
| amount, amount_raw | Event-specific amount in token units/raw units, where applicable. For example, Approval is an allowance, not a transfer. |
| scaled_amount_raw | Event-specific scaled token quantity, when applicable. |
| expiry | Withdrawal batch expiry as Unix seconds, when applicable. |
| tx_status | Receipt status for the transaction that emitted the event. |
| details_json | All named decoded ABI parameters, preserving integers as strings. Authoritative interpretation for administrative values, allowances and event-specific roles. |

## interest_accrual.csv

One row per InterestAndFeesAccrued event. Shared identity fields and timestamp_utc identify when the update was recorded. No synthetic events are inserted between updates.

| Field | Meaning |
| --- | --- |
| period_start_utc, period_end_utc | Actual accrual interval described by the event, which can precede its recording time. |
| period_seconds | period_end_utc minus period_start_utc in seconds; can be zero. |
| base_interest_ray | Base growth increment for this accrual interval, in ray units. Not an annual rate. |
| delinquency_fee_ray | Penalty growth increment for this accrual interval, in ray units. |
| protocol_fees, protocol_fees_raw | Protocol fees emitted by this update. |
| scale_factor_before_ray, scale_factor_after_ray | Token-value scale factor immediately before and after this accrual. |
| base_interest_assets, base_interest_assets_raw | Base interest from scaled supply times the base scale increment, with contract ray rounding. |
| penalty_interest_assets, penalty_interest_assets_raw | Penalty interest from scaled supply times the penalty scale increment, with contract ray rounding. |
| scaled_total_supply_raw | Supply exposed to this accrual before the update. |
| is_delinquent | Liquidity delinquency state used for this accrual. |
| annual_interest_bips | Base annual rate recovered from the interval's growth; zero for a zero-second interval. |
| delinquency_fee_bips | Configured annual penalty rate in basis points, whether active or not. |
| protocol_fee_bips | Protocol fee share of base interest, in basis points. 500 means 5% of base interest, not 5% APR. |

## daily_series.csv

One row per market per UTC date. Shared market and asset identity fields apply. All balance values refer to the row's closing block.

| Field (and _raw partner where listed) | Meaning |
| --- | --- |
| date_utc | UTC date represented by this row. |
| snapshot_block, snapshot_timestamp_utc | Actual closing block and its timestamp. |
| period_start_timestamp_utc | Previous daily snapshot timestamp, or deployment timestamp for the first row. |
| period_elapsed_seconds | Actual closing timestamp minus opening timestamp. |
| is_partial_day | true for a deployment day starting after midnight or a final snapshot before day end. Normal last-block timing can differ slightly from wall-clock midnight. |
| pending_batch_preview_json | Verified pending-batch payment preview at year-end/final snapshots when needed; empty otherwise. Contains expiry, scaledTotalAmountRaw, scaledAmountBurnedRaw, normalizedAmountPaidRaw, additionalScaledAmountBurnedRaw and additionalNormalizedAmountPaidRaw. Additional values reconcile the preview against emitted payments. |
| scale_factor_ray | Closing currentState() scale factor including pending accrual. |
| scaled_total_supply_raw | Closing scaled token supply, including any previewed pending-batch burn. |
| normalized_unclaimed_withdrawals_raw | Funded withdrawal assets not yet collected, including previewed funding. |
| market_token_value, market_token_value_raw | totalSupply(), including interest and unfunded queued tokens. |
| total_lender_obligation, total_lender_obligation_raw | Market-token value plus funded, unclaimed withdrawals. |
| outstanding_protocol_fees, outstanding_protocol_fees_raw | Accrued protocol fees not yet collected. |
| total_debt_obligation, total_debt_obligation_raw | Total lender obligation plus outstanding protocol fees. |
| total_assets_held, total_assets_held_raw | Underlying assets held by the market. |
| outstanding_loan_balance, outstanding_loan_balance_raw | max(total_debt_obligation - total_assets_held, 0). |
| capacity, capacity_raw | Configured maximum token supply in asset units. |
| borrowed_during_day, borrowed_during_day_raw | Borrowed assets in transactions after the opening block through the closing block. |
| repaid_during_day, repaid_during_day_raw | Repaid assets over the same interval. |
| cumulative_borrowed, cumulative_borrowed_raw | Total borrowed assets since deployment through the closing block. |
| cumulative_repaid, cumulative_repaid_raw | Total repaid assets since deployment through the closing block. |
| lender_earnings_accrued, lender_earnings_accrued_raw | Economic lender earnings across the actual interval, using the obligation-and-flow identity above; includes contract rounding. |
| protocol_fees_accrued, protocol_fees_accrued_raw | Fees accruing across the actual interval, using the outstanding-fee-and-collection identity above. |
| lender_interest_recorded, lender_interest_recorded_raw | Sum of base and penalty interest in updates recorded between the row's block boundaries. |
| protocol_fees_recorded, protocol_fees_recorded_raw | Fees in updates recorded between the row's block boundaries. |
| base_rate_bips_seconds | Exact integral of configured base basis points times seconds. |
| penalty_rate_bips_seconds | Exact integral of active penalty basis points times seconds. |
| protocol_fee_rate_bips_squared_seconds | Exact integral of base basis points times protocol-fee-share basis points times seconds. |
| base_apr_bips_eod, base_apr_pct_eod | Base rate at the closing block, in basis points and percent. |
| effective_apr_bips_eod, effective_apr_pct_eod | Closing base rate plus active penalty rate. |
| protocol_fee_apr_pct_eod | Closing base APR multiplied by the closing protocol fee share. |
| base_apr_pct_period | base_rate_bips_seconds / period_elapsed_seconds / 100. |
| penalty_apr_pct_period | penalty_rate_bips_seconds / period_elapsed_seconds / 100. |
| effective_lender_apr_pct_period | Average base plus penalty rate over the interval, rounded once. |
| protocol_fee_apr_pct_period | protocol_fee_rate_bips_squared_seconds / period_elapsed_seconds / 1,000,000. |
| borrower_all_in_apr_pct_period | Average base plus penalty plus protocol fee rate, rounded once. |
| lender_growth_apr_pct_period | Annualised actual scale-factor growth across the interval; formula above. |
| penalty_apr_bips_nominal, penalty_apr_pct_nominal | Configured penalty rate, even when inactive. |
| protocol_fee_bips_eod | Closing fee share of base interest in basis points. |
| reserve_ratio_bips_eod | Required reserve ratio at the closing block, in basis points. |
| is_delinquent_eod | Contract liquidity-delinquency flag at the closing block. |
| penalty_active_eod | Whether the closing delinquency timer exceeds the grace period. |
| time_delinquent_seconds_eod | Closing accumulated delinquency timer; decreases while liquidity is healthy. |
| grace_period_seconds, grace_period_hours | Configured delinquency grace period, in seconds and hours. |
| withdrawal_cycle_seconds, withdrawal_cycle_hours | Configured withdrawal batching duration, in seconds and hours. |
| market_closed_eod | Whether the market is closed at the closing block. |
| accrual_events | Number of accrual updates recorded between this row's block boundaries. Zero does not mean zero interest. |

## manifest.json

- schema_version identifies field names and meanings; pipeline_version identifies the calculation/cache implementation. generated_at_utc is export generation time, not the snapshot time.
- scope is full_market. snapshot_block, snapshot_block_hash, snapshot_timestamp_utc and chain_id pin the chain state. filters_applied lists markets, statement types, entered position addresses, date bounds, date_scope (statements_only) and statement format. Empty date bounds mean full available history.
- Each markets entry identifies its address, name, symbol, borrower, version, asset, asset_name, asset_symbol, asset_decimals and deployment/removal/closure information. Missing closure/removal values mean none observed. total_supply_raw, total_lender_obligation_raw, outstanding_protocol_fees_raw, total_assets_raw and total_debts_raw are closing state quantities. parameters_at_snapshot gives configured rates, reserve ratio, grace/batch duration, capacity and scale factor.
- aggregates contains full-history lender deposits/withdrawals, borrowing/repayments, base_interest_recorded, penalty_interest_recorded and protocol_fees_recorded with raw partners. lender_earnings_accrued and protocol_fees_accrued sum the actual daily intervals. active_lender_count counts current token holders; distinct_lender_count includes historical holders. net_lender_flow_raw is deposits less paid withdrawals. open_withdrawal_claims_raw is funded but unclaimed assets. protocol_fees_recorded_by_year_raw groups fees by recording year.
- delinquency_episodes contains onset/cure timestamps, blocks and transaction hashes, penalty_end_utc, duration_hours, grace_period_hours, penalty_triggered, penalty_interest_assets and its raw partner, reserve_ratio_bips and is_open. Empty end fields mean the event has not occurred by the snapshot. These episode summaries retain their event-based accounting conventions.
- reconciliation preserves the asset balance, scaled supply, preview adjustments, unclaimed withdrawals, total supply and total debt checks. Raw quantities use asset units or scaled units as their names specify. differenceRaw is expected minus actual asset balance; passed is true only after the exporter checks its identities. event_count and transaction_count report emitted row counts. cross_checks compares RPC and explorer log sets and records closure events. These checks concern the declared coverage, not every possible routed failure.
- excluded_v1_markets lists requested markets excluded by version. excluded_transfers lists foreign-token candidates excluded from all accounting, with their identity and amount evidence. Token identity is determined by contract address, never symbol.
- rpc_providers identifies the blockchain sources. reverted_tx_coverage is direct_only: failed direct market transactions are included; there is no completeness claim for failed routed/internal attempts. Successful routed activity is included through market events and underlying-asset transfers. No arbitrary execution traces are collected.
- position_summaries is populated for requested addresses. market_address and address identify each position. deposits, principal_acquired_by_transfer, active_principal, pending_withdrawal_principal, principal_still_invested, principal_returned, principal_transferred_out, market_tokens_transferred_out, current_value, pending_withdrawal_value, total_position_value, payouts and earnings have raw partners. Principal is allocated proportionally, not FIFO/LIFO or tax cost basis. current_value is active tokens; pending_withdrawal_value includes funded claims and unfunded queued value. total_position_value is their sum. earnings = total_position_value + payouts + market_tokens_transferred_out - deposits - principal_acquired_by_transfer. scaled_balance_raw is active scaled token balance. annual_earnings_raw measures each year's change in cumulative economic earnings using actual year-end snapshot state.

## Changes from schema 1.0

- outstanding_principal / _raw becomes market_token_value / _raw. borrowed_outstanding / _raw is removed; use outstanding_loan_balance / _raw for the remaining loan obligation.
- base_apr_pct_time_weighted, penalty_apr_pct_realised, effective_lender_apr_pct_realised, protocol_fee_apr_pct and borrower_all_in_apr_pct become explicitly named _period fields and now integrate actual snapshot intervals. This intentionally changes the former posting-period convention and its reference APR expectations.
- realized_lender_apr_pct_period becomes lender_growth_apr_pct_period; its scale-growth definition is unchanged.
- Manifest event-total names change from base_interest_accrued, penalty_interest_accrued and protocol_fees_accrued to their _recorded equivalents. New accrued fields use boundary-state calculations. protocol_fees_by_year_raw becomes protocol_fees_recorded_by_year_raw.
- interest_accrual.csv adds timestamp_utc (recording time) and protocol_fee_bips. Accrual period timestamps remain separate.
- Old names are not duplicated as aliases. Update downstream CSV/JSON readers when adopting schema 2.0. Previously downloaded bundles retain their original schema.
`
