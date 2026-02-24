"use client";

import { useRouter } from "next/navigation";
import { DocumentViewer } from "@/components/atlas/document-viewer";
import type { ViewerDocument } from "@/lib/atlas-utils";

export function RulePageClient({ document }: { document: ViewerDocument }) {
  const router = useRouter();

  return (
    <div className="relative z-1 min-h-[calc(100vh-200px)]">
      <DocumentViewer
        document={document}
        onBack={() => router.push("/atlas")}
      />
    </div>
  );
}
