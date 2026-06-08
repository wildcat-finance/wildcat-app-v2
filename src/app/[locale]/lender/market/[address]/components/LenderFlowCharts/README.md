# Market Analytics Charts

`LenderFlowCharts` renders the market-level analytics cards shown in the lender market transactions view:

- Daily Deposits & Withdrawals
- Cumulative Net Flow
- Delinquency History

The flow charts use `marketDailyStats_collection` from the subgraph through `useMarketDailyFlows`.

The delinquency chart uses `delinquencyStatusChangeds` through `useMarketDelinquencyHistory`. The hook pairs each `isDelinquent: true` event with the next `isDelinquent: false` event, and treats a final unpaired start event as an active delinquency interval. Each interval is split into grace-period hours and penalty hours so the stacked horizontal ECharts bar matches the protocol state users care about.

Keep chart rendering on the shared Wildcat ECharts primitives where possible. If this view needs new chart behavior, extend the shared primitive layer instead of constructing a one-off chart in the product component.
