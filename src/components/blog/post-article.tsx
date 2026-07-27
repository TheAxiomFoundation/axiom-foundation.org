import Link from "next/link";
import type { BlogPost } from "@/lib/ghost";

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

/** One blog post, fully rendered — shared by the published post page
 *  and the draft preview route so a preview IS the eventual page. */
export function PostArticle({ post }: { post: BlogPost }) {
  const date = formatDate(post.publishedAt);
  const byline = [post.authors.join(", "), date].filter(Boolean).join(" · ");

  return (
    <article className="max-w-[720px] mx-auto">
      <header className="mb-12">
        <p className="m-0 mb-6 font-mono text-[0.72rem] tracking-[0.14em] uppercase">
          <Link
            href="/blog"
            className="text-[var(--color-ink-muted)] no-underline hover:text-[var(--color-accent)] transition-colors"
          >
            &larr; Blog
          </Link>
        </p>
        <h1 className="heading-page mb-6 text-balance">{post.title}</h1>
        {byline ? (
          <p className="m-0 font-mono text-[0.72rem] tracking-[0.12em] uppercase text-[var(--color-ink-muted)]">
            {byline}
            {post.readingTime ? <> &middot; {post.readingTime} min</> : null}
          </p>
        ) : null}
      </header>
      {post.featureImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.featureImage}
          alt=""
          className="mb-12 w-full rounded-[4px] border border-[var(--color-rule)]"
        />
      ) : null}
      {/* Post HTML is authored in our own Ghost instance — first-party
          trusted content, same trust model as the codebase's copy. */}
      <div
        className="blog-prose"
        dangerouslySetInnerHTML={{ __html: post.html }}
      />
    </article>
  );
}
