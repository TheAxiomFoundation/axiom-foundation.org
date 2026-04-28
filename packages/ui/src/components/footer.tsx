import { resolveHref, type RenderLinkComponent } from "./link-utils";

export interface FooterProps {
  /** Base URL for generating absolute links (e.g. "https://axiom-foundation.org") */
  baseUrl?: string;
  /** Custom link renderer for framework integration (e.g. Next.js Link) */
  renderLink?: RenderLinkComponent;
  /** Logo image src. Defaults to "/logos/axiom-foundation.svg". */
  logoSrc?: string;
}

const LINK_CLASS =
  "link-quiet text-[0.9rem] text-[var(--color-ink-secondary)] inline-block";

const DEFAULT_LOGO = "/logos/axiom-foundation.svg";

export function Footer({ baseUrl = "", renderLink: LinkComponent, logoSrc }: FooterProps = {}) {
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
              The world&apos;s rules, encoded.
            </p>
            <p className="text-[0.8rem] text-[var(--color-ink-muted)] mt-4 leading-relaxed max-w-[280px]">
              An open, machine-readable archive of statutes, regulations, and
              policy rules.
            </p>
          </div>

          <div>
            <h3 className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)] mb-4">
              Project
            </h3>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              <li>{renderFooterLink("/about", "About")}</li>
              <li>{renderFooterLink("https://app.axiom-foundation.org", "Axiom platform")}</li>
              <li>{renderFooterLink("https://github.com/TheAxiomFoundation/rulespec", "RuleSpec")}</li>
              <li>{renderFooterLink("https://github.com/TheAxiomFoundation/axiom-encode", "Encoder")}</li>
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[0.65rem] tracking-[0.22em] uppercase text-[var(--color-ink-muted)] mb-4">
              Connect
            </h3>
            <ul className="flex flex-col gap-2.5 list-none p-0 m-0">
              <li>{renderFooterLink("https://github.com/TheAxiomFoundation", "GitHub")}</li>
              <li>{renderFooterLink("mailto:hello@axiom-foundation.org", "Contact")}</li>
              <li>{renderFooterLink("/privacy", "Privacy")}</li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 pt-6 border-t border-[var(--color-rule-subtle)]">
          <p className="font-mono text-[0.7rem] tracking-[0.08em] text-[var(--color-ink-muted)] m-0">
            &copy; {year} Axiom Foundation &middot; A 501(c)(3) nonprofit
          </p>
          <p className="font-mono text-[0.7rem] tracking-[0.18em] uppercase text-[var(--color-ink-muted)] m-0">
            <span className="text-[var(--color-accent)]" aria-hidden="true">∀</span>{" "}
            Open infrastructure for encoded law
          </p>
        </div>
      </div>
    </footer>
  );
}
