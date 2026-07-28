import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PostArticle } from "@/components/blog/post-article";
import { getDraftPreview } from "@/lib/ghost";

/**
 * Share-link draft previews: /blog/preview/<post-uuid> renders a post
 * in any status exactly as /blog/<slug> will once published. The uuid
 * (from the Ghost editor or Admin API) is the capability — unguessable
 * and revoked by deleting the post. Never indexed, never cached.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Draft preview — Axiom Foundation",
  robots: { index: false, follow: false },
};

export default async function BlogPreviewPage({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  const post = await getDraftPreview(uuid);
  if (!post) notFound();

  return (
    <div className="relative z-1 pt-32 pb-24 px-8">
      <div className="max-w-[720px] mx-auto mb-10">
        <p className="m-0 rounded-[4px] border border-[var(--color-accent)] bg-[var(--color-paper-elevated)] px-4 py-3 font-mono text-[0.72rem] tracking-[0.12em] uppercase text-[var(--color-accent)]">
          {post.status === "published"
            ? "Preview — this post is published"
            : "Draft preview — not published"}
        </p>
      </div>
      <PostArticle post={post} />
    </div>
  );
}
