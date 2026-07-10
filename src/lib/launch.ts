/**
 * July 28 launch constants — single source of truth for every CTA on
 * the site (announcement card, hero). Fill in the real URLs here and
 * they update everywhere at once.
 */

// TODO(#58/#60): swap in the live webinar/briefing registration URL before ship.
export const BRIEFING_URL = "#";

// TODO: swap in the live launch-event RSVP URL before ship.
export const LIVE_EVENT_URL = "#";

// TODO(#38): swap for the real newsletter signup if one is wired before ship.
export const UPDATES_URL =
  "mailto:hello@axiom-foundation.org?subject=Axiom%20launch%20updates";

// Public launch — July 28, 2026.
// TODO(⛳): set the actual event start time once scheduled. Midnight UTC
// is a placeholder — it makes the countdown hit zero at 8pm ET on July 27.
export const LAUNCH_UTC = Date.UTC(2026, 6, 28, 0, 0, 0);
