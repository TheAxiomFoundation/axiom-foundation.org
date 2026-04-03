import { describe, expect, it, vi } from "vitest";

import { transformRuleToViewerDoc } from "./atlas-utils";
import type { Rule } from "@/lib/supabase";

vi.mock("@/lib/supabase", () => ({
  supabaseArch: { from: vi.fn() },
  supabase: { from: vi.fn() },
}));

const mockRule = (overrides: Partial<Rule> = {}): Rule => ({
  id: "test-id",
  jurisdiction: "us-co",
  doc_type: "regulation",
  parent_id: null,
  level: 0,
  ordinal: null,
  heading: null,
  body: null,
  effective_date: null,
  repeal_date: null,
  source_url: null,
  source_path: null,
  citation_path: null,
  rac_path: null,
  has_rac: false,
  created_at: "",
  updated_at: "",
  ...overrides,
});

describe("transformRuleToViewerDoc Colorado citations", () => {
  it("formats Colorado regulation citations", () => {
    const doc = transformRuleToViewerDoc(
      mockRule({
        jurisdiction: "us-co",
        doc_type: "regulation",
        citation_path: "us-co/regulation/9-CCR-2503-6/3.606.1/I",
      }),
      []
    );

    expect(doc.citation).toBe("9 CCR 2503-6 § 3.606.1(I)");
  });

  it("formats Colorado statute citations", () => {
    const doc = transformRuleToViewerDoc(
      mockRule({
        jurisdiction: "us-co",
        doc_type: "statute",
        citation_path: "us-co/statute/crs/26-2-703/2.5",
      }),
      []
    );

    expect(doc.citation).toBe("C.R.S. § 26-2-703(2.5)");
  });
});
