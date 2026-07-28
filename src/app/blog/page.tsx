import Link from "next/link";
import type { Metadata } from "next";
import { Reveal } from "@/components/landing/reveal";
import { getBlogPosts } from "@/lib/ghost";

export const metadata: Metadata = {
  title: "Blog — Axiom Foundation",
  description:
    "News and writing from the Axiom Foundation — encoding the world's rules as open, executable, cited infrastructure.",
};

const dateFormat = new Intl.DateTimeFormat("en-US", {
  year: "numeric",
  month: "long",
  day: "numeric",
  timeZone: "UTC",
});

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : dateFormat.format(date);
}

export default async function BlogPage() {
  const posts = await getBlogPosts();

  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[960px] mx-auto">
        <Reveal className="mb-16 max-w-[760px]">
          <h1 className="heading-page mb-7">Blog</h1>
          <p className="font-body text-[1.35rem] text-[var(--color-ink-secondary)] leading-[1.65] text-pretty">
            News and writing from the foundation.
          </p>
        </Reveal>

        {posts.length === 0 ? (
          <Reveal className="border-t border-[var(--color-rule)] py-12">
            <p className="m-0 font-body text-[1.05rem] text-[var(--color-ink-muted)]">
              No posts yet — check back soon.
            </p>
          </Reveal>
        ) : (
          <ol className="m-0 list-none p-0">
            {posts.map((post) => {
              const date = formatDate(post.publishedAt);
              return (
                <Reveal
                  as="li"
                  key={post.slug}
                  className="border-t border-[var(--color-rule)] py-10 grid gap-3 md:grid-cols-[220px_minmax(0,1fr)] md:gap-12"
                >
                  <p className="m-0 font-mono text-[0.72rem] tracking-[0.12em] uppercase text-[var(--color-ink-muted)] md:pt-1.5">
                    {date}
                    {post.readingTime ? (
                      <>
                        {" "}
                        &middot; {post.readingTime} min
                      </>
                    ) : null}
                  </p>
                  <div>
                    <h2 className="m-0 mb-3 font-display text-[1.4rem] font-light tracking-[0.02em] leading-snug">
                      <Link
                        href={`/blog/${post.slug}`}
                        className="text-[var(--color-ink)] no-underline hover:text-[var(--color-accent)] transition-colors"
                      >
                        {post.title}
                      </Link>
                    </h2>
                    {post.excerpt ? (
                      <p className="m-0 font-body text-[1.02rem] text-[var(--color-ink-secondary)] leading-relaxed text-pretty">
                        {post.excerpt}
                      </p>
                    ) : null}
                  </div>
                </Reveal>
              );
            })}
          </ol>
        )}
      </div>
    </div>
  );
}
