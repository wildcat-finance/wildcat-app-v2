# Withdrawal schedule prototype

The periodic-term policy form presents three settings: First opening (UTC),
Repeats every, and Open for. A compact timeline shows the open and closed portions
of two full periods, then fades into a third opening at the same scale. Each full
period occupies 40% of the track, with the final 20% reserved for the continuation.
The bracket spans the first opening to the second opening, indicating one period.
This describes request eligibility, not payout timing.

For an opening at 00:00, a 15-minute period and a 5-minute window, requests are
open until 00:05 and the next window opens at 00:15. The first opening remains
the recurring schedule anchor, including when it is in the past; the diagram
illustrates the anchored period rather than claiming to show today's next window.

The form continues to store integer seconds and use its existing validation.
Changing display units preserves those values. Missing or invalid values keep
the timeline visible as a neutral grey track, without calculated times or a
colored request window. Dates appear on ticks when a period crosses
midnight anywhere across the two periods, and second precision appears when the
entered durations need it.

The fields reflow according to the available form width. A small legend keeps
state labels outside the track, preserving the actual open/closed proportions without
squeezing or stretching the window. The closing ticks are hidden when they would
collide with the opening ticks; exact times remain in the accessible figure name.
The form uses the existing input components, with matching visible and accessible
labels. The preview has no explanatory paragraphs or extra numbered steps.
The key names the open and closed states without durations. The period bracket
points down toward the track; the opening time has no tick below the track.

Local verification: TypeScript, error-level lint, both i18n gates, and the 28
existing form-validation/duration tests. Browser checks cover the 15/5-minute
example, unit switching, an invalid equal-length window, keyboard clearing,
midnight rollover, a one-minute window in a one-day period, and narrow desktop
layout. The refined layout was also checked with a 30/10-minute schedule and a
29-minute window in a 30-minute period crossing midnight, at 1920px and 1440px.
