import { resolveHref, type RenderLinkComponent } from "./link-utils";

export interface FooterProps {
  /** Base URL for generating absolute links (e.g. "https://axiom-foundation.org") */
  baseUrl?: string;
  /** URL for the Axiom app link. Defaults to the production app subdomain. */
  appUrl?: string;
  /** Custom link renderer for framework integration (e.g. Next.js Link) */
  renderLink?: RenderLinkComponent;
  /** Logo image src. Defaults to "/logos/axiom-foundation.svg". */
  logoSrc?: string;
  /** Newsletter signup URL for the "Get updates" link. The site passes
   *  UPDATES_URL from src/lib/launch.ts so banner + footer stay in sync. */
  updatesUrl?: string;
}

const LINK_CLASS =
  "link-quiet text-[0.9rem] text-[var(--color-ink-secondary)] inline-block";

const DEFAULT_LOGO = "/logos/axiom-foundation.svg";

export function Footer({
  baseUrl = "",
  renderLink: LinkComponent,
  logoSrc,
  updatesUrl = "mailto:hello@axiom-foundation.org?subject=Axiom%20launch%20updates",
}: FooterProps = {}) {
  const resolvedLogoSrc = logoSrc
    ? logoSrc
    : baseUrl
      ? `${baseUrl}${DEFAULT_LOGO}`
      : DEFAULT_LOGO;

  function renderFooterLink(href: string, label: string) {
    const resolved = resolveHref(href, baseUrl);
    const isExternal = href.startsWith("http") || href.startsWith("mailto:");

    if (baseUrl || !LinkComponent || isExternal) {
      return (
        <a
          key={href}
          href={resolved}
          className={LINK_CLASS}
          {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {label}
        </a>
      );
    }

    return (
      <LinkComponent key={href} href={href} className={LINK_CLASS}>
        {label}
      </LinkComponent>
    );
  }

  const year = new Date().getFullYear();

  return (
    <footer className="relative z-10 px-8 border-t border-[var(--color-rule)]">
      <div className="max-w-[1280px] mx-auto py-16">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-16 mb-14">
          <div>
            <img
              src={resolvedLogoSrc}
              alt="Axiom Foundation"
              className="h-9 w-auto mb-5"
            />
            <p
              className="text-[0.95rem] text-[var(--color-ink-secondary)] leading-relaxed max-w-[280px]"
              style={{ fontFamily: "var(--f-serif)", fontStyle: "italic" }}
            >
              Computable law for all.
            </p>
            <p className="text-[0.8rem] text-[var(--color-ink-muted)] mt-4 leading-relaxed max-w-[280px]">
              Open, machine-readable encodings of the world&apos;s rules
              &mdash; starting with tax and benefit policy.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)] mb-4">
              Project
            </h3>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              <li>{renderFooterLink("/about", "About")}</li>
              <li>{renderFooterLink("/team", "Team")}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)] mb-4">
              Connect
            </h3>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              <li>{renderFooterLink("mailto:hello@axiom-foundation.org", "Contact")}</li>
              <li>{renderFooterLink(updatesUrl, "Get updates")}</li>
              <li>{renderFooterLink("/privacy", "Privacy")}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-6 border-t border-[var(--color-rule-subtle)]">
          <p className="font-mono text-[0.7rem] tracking-[0.08em] text-[var(--color-ink-muted)] m-0">
            &copy; {year} Axiom Foundation &middot; Doing the public-interest work
          </p>
          <p className="font-mono text-[0.7rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] m-0">
            <span className="glyph-axiom text-[var(--color-accent)]" aria-hidden="true">∀</span>{" "}
            Open infrastructure for encoded law
          </p>
        </div>
      </div>
    </footer>
  );
}
