# RCF lender APR curve

The lender market page shows the relationship between utilization and lender APR
for revolving credit markets. The headline and marker use the SDK's current APR
display, including its integer rounding. The line spans zero to full utilization:

`commitment APR + utilization × utilization APR + active penalty APR`

Commitment APR applies to all deposited capital. Protocol interest is paid
separately, so the chart does not subtract it from lender APR. Existing creation
and market-detail tooltip copy now describes the same commitment basis.

The chart updates with market data; it is not historical data or a forecast of
future rates. A pending APR reduction is not plotted before it takes effect.
The subtitle and horizontal axis explicitly name the drawn share of deposits:
deposit capacity being nearly full does not mean that capital has been borrowed.
Missing metrics display an unavailable state, and closed markets display their
closed state. Zero utilization, full utilization and a zero utilization APR remain
valid displays. Tick labels near either endpoint are omitted to avoid collisions;
the exact utilization remains in the subtitle and accessible figure description.

RCF and periodic terms are independent. On the desktop transaction page, the
first indicator shares a grid row with the deposit/withdrawal cards. If both apply,
the PTH diagram stays first and the APR curve sits below it, separated by a thin
rule. Both participate in layout and scrolling. Other sections and mobile use
the same order in a shared indicator column. Standard non-periodic markets show
neither indicator.

Tests cover the APR endpoints, penalties, flat rates, SDK rounding, unavailable
data and market closure. Rendering tests cover each PTH/RCF combination, finite
SVG coordinates for flat rates, and refreshed values and marker positions.
