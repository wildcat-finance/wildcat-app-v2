# PTH market withdrawal cycle

The lender market page shows a live phase diagram in the reserved right-hand
column for periodic-term markets. Its centre aligns with the deposit/withdraw
cards when they are visible, including after notice dismissal or card resizing.
Other desktop sections centre it within the page. On mobile it sits beneath the
market header and notices. It omits the reference design's heading and footer.

The right arc represents the open request window; the left arc represents the
closed interval. Each arc represents one phase, not an equal amount of time.
The labels show their respective durations. A solid path and moving marker show
elapsed progress within the active phase, whose chip expands to show a countdown.
The next part of that arc has a subtle marching-dot animation. Reduced-motion
preferences disable the animation and chip transitions.

Timing uses the existing periodic-window arithmetic and live clock. Before the
first window, the centre counts down to that opening. Market closure stops the
cycle; term closure or observed repayment changes the display to unrestricted
request timing. These are request windows, not payout guarantees.

The borrower penalty banner has an accessible close control on the market page.
Dismissal applies to the displayed market during the current page visit and does
not change deposit acknowledgements or warning checks in transaction dialogs.

Verification covers exact opening/closing boundaries, repeated cycles, first
opening, progress in unequal phases, term closure, repayment, market closure,
and non-periodic markets. Browser review includes desktop/mobile layout and
banner dismissal.
