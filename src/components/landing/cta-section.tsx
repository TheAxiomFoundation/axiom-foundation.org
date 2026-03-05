import Link from "next/link";
import { CodeIcon } from "@/components/icons";

export function CtaSection() {
  return (
    <section
      className="relative z-1 py-32 px-8"
      style={{
        background: `linear-gradient(180deg, var(--color-void) 0%, rgba(59,130,246,0.08) 50%, var(--color-void) 100%)`,
      }}
    >
      <div className="max-w-[700px] mx-auto text-center">
        <h2 className="heading-section text-[var(--color-text)] mb-6">
          Get involved
        </h2>
        <p className="font-[family-name:var(--f-body)] text-lg text-[var(--color-text-secondary)] leading-relaxed mb-12">
          Rule Atlas builds open infrastructure for AI safety in legal
          domains.
        </p>

        <div className="flex justify-center gap-6 mb-12 flex-wrap">
          <a
            href="https://github.com/RuleAtlas/rac-us"
            className="btn-primary"
          >
            <CodeIcon className="w-5 h-5" />
            Encode your jurisdiction
          </a>
          <a
            href="https://github.com/RuleAtlas/rac/issues"
            className="btn-outline"
          >
            Validate our work
          </a>
          <a href="mailto:hello@ruleatlas.org" className="btn-outline">
            Fund the mission
          </a>
        </div>

        <div className="flex justify-center gap-8 flex-wrap">
          {[
            {
              href: "https://github.com/RuleAtlas/rac",
              label: "RAC specification",
            },
            {
              href: "https://github.com/RuleAtlas/atlas",
              label: "Atlas platform",
            },
            {
              href: "https://github.com/RuleAtlas/autorac",
              label: "AutoRAC encoder",
            },
            { href: "/about", label: "About us", internal: true },
          ].map((link) =>
            link.internal ? (
              <Link
                key={link.label}
                href={link.href}
                className="font-[family-name:var(--f-mono)] text-[0.85rem] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-precision)] transition-colors duration-150"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={link.href}
                className="font-[family-name:var(--f-mono)] text-[0.85rem] text-[var(--color-text-muted)] no-underline hover:text-[var(--color-precision)] transition-colors duration-150"
              >
                {link.label}
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
}
