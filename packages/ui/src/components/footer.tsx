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
  "text-[0.85rem] text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-ink)] transition-colors duration-150";

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

  return (
    <footer className="relative z-10 py-16 px-8 border-t border-[var(--color-rule)]">
      <div className="max-w-[1280px] mx-auto text-center">
        <div className="flex justify-center mb-4">
          <img
            src={resolvedLogoSrc}
            alt="Axiom Foundation"
            className="h-9 w-auto"
          />
        </div>
        <p className="text-[0.9rem] text-[var(--color-ink-muted)] mb-6">
          The world&apos;s rules, encoded.
        </p>
        <div className="flex justify-center gap-8">
          {renderFooterLink("/about", "About")}
          {renderFooterLink("https://github.com/TheAxiomFoundation", "GitHub")}
          {renderFooterLink("mailto:hello@axiom-foundation.org", "Contact")}
          {renderFooterLink("/privacy", "Privacy")}
        </div>
      </div>
    </footer>
  );
}
