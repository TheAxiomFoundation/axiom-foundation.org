/**
 * July 28 launch constants — single source of truth for every CTA on
 * the site (announcement card, hero). Fill in the real URLs here and
 * they update everywhere at once.
 */

// "Join the launch event" — the virtual briefing / webinar.
// TODO(#58/#60): swap in the live webinar registration URL before ship.
export const LAUNCH_EVENT_URL = "#";

// "Get updates" — MailChimp signup.
// TODO(#38): swap in the MailChimp signup URL before ship; the mailto
// is the interim fallback so the button is never dead.
export const UPDATES_URL =
  "mailto:hello@axiom-foundation.org?subject=Axiom%20launch%20updates";

// Public launch — July 28, 2026.
// TODO(⛳): set the actual event start time once scheduled. Midnight UTC
// is a placeholder — it makes the countdown hit zero at 8pm ET on July 27.
export const LAUNCH_UTC = Date.UTC(2026, 6, 28, 0, 0, 0);
