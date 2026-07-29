"use client";

import { Suspense, useEffect } from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const TOOL_NAME = "axiom-app";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!GA_MEASUREMENT_ID || typeof window.gtag !== "function") return;
    const query = searchParams.toString();
    // Must be an explicit page_view event, not a config update: config
    // parameters persist per measurement ID, so after the initial config set
    // send_page_view: false, later config calls (even with a new page_path,
    // even with send_page_view: true) never emit a page_view hit.
    window.gtag("event", "page_view", {
      page_path: query ? `${pathname}?${query}` : pathname,
      tool_name: TOOL_NAME,
    });
  }, [pathname, searchParams]);

  return null;
}

/* v8 ignore start -- depends on production analytics env + browser scripts */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;
  const gaMeasurementId = JSON.stringify(GA_MEASUREMENT_ID);

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          window.gtag = gtag;
          gtag('js', new Date());
          gtag('config', ${gaMeasurementId}, { send_page_view: false, tool_name: '${TOOL_NAME}' });
        `}
      </Script>
      <Script id="google-analytics-engagement" strategy="afterInteractive">
        {`
          (function() {
            var TOOL_NAME = '${TOOL_NAME}';
            if (typeof window === 'undefined') return;

            var scrollFired = {};
            window.addEventListener('scroll', function() {
              if (typeof window.gtag !== 'function') return;
              var docHeight = document.documentElement.scrollHeight - window.innerHeight;
              if (docHeight <= 0) return;
              var pct = Math.floor((window.scrollY / docHeight) * 100);
              [25, 50, 75, 100].forEach(function(m) {
                if (pct >= m && !scrollFired[m]) {
                  scrollFired[m] = true;
                  window.gtag('event', 'scroll_depth', { percent: m, tool_name: TOOL_NAME });
                }
              });
            }, { passive: true });

            [30, 60, 120, 300].forEach(function(sec) {
              setTimeout(function() {
                if (typeof window.gtag !== 'function') return;
                if (document.visibilityState !== 'hidden') {
                  window.gtag('event', 'time_on_tool', { seconds: sec, tool_name: TOOL_NAME });
                }
              }, sec * 1000);
            });

            document.addEventListener('click', function(e) {
              if (typeof window.gtag !== 'function') return;
              var link = e.target && e.target.closest ? e.target.closest('a') : null;
              if (!link || !link.href) return;
              try {
                var url = new URL(link.href, window.location.origin);
                if (url.hostname && url.hostname !== window.location.hostname) {
                  window.gtag('event', 'outbound_click', {
                    url: link.href,
                    target_hostname: url.hostname,
                    tool_name: TOOL_NAME
                  });
                }
              } catch (err) {}
            });
          })();
        `}
      </Script>
      <Suspense fallback={null}>
        <GoogleAnalyticsPageView />
      </Suspense>
    </>
  );
}
/* v8 ignore stop */
