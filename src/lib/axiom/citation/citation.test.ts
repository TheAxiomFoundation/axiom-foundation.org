import { describe, it, expect } from "vitest";
import { parseCitation, _internalParsers } from "./index";

describe("parseCitation — US Code", () => {
  it("parses a plain USC section", () => {
    expect(parseCitation("26 USC 32")).toEqual({
      jurisdiction: "us",
      docType: "statute",
      citationPath: "us/statute/26/32",
      displayLabel: "26 U.S.C. § 32",
    });
  });

  it("parses USC with section sign and dots", () => {
    expect(parseCitation("26 U.S.C. § 32")).toEqual({
      jurisdiction: "us",
      docType: "statute",
      citationPath: "us/statute/26/32",
      displayLabel: "26 U.S.C. § 32",
    });
  });

  it("parses USC with a single subsection", () => {
    const out = parseCitation("26 USC § 32(b)");
    expect(out?.citationPath).toBe("us/statute/26/32/b");
    expect(out?.displayLabel).toBe("26 U.S.C. § 32(b)");
  });

  it("parses USC with a deep subsection trail", () => {
    const out = parseCitation("26 USC § 32(b)(1)(A)");
    expect(out?.citationPath).toBe("us/statute/26/32/b/1/A");
    expect(out?.displayLabel).toBe("26 U.S.C. § 32(b)(1)(A)");
  });

  it("parses USC with alphanumeric section suffix", () => {
    expect(parseCitation("26 USC 36B")?.citationPath).toBe(
      "us/statute/26/36B"
    );
  });
});

describe("parseCitation — CFR sections", () => {
  it("parses a plain CFR section", () => {
    expect(parseCitation("7 CFR 273.9")).toEqual({
      jurisdiction: "us",
      docType: "regulation",
      citationPath: "us/regulation/7/273/9",
      displayLabel: "7 CFR § 273.9",
    });
  });

  it("parses CFR with dotted C.F.R.", () => {
    expect(parseCitation("7 C.F.R. § 273.9")?.citationPath).toBe(
      "us/regulation/7/273/9"
    );
  });

  it("parses CFR with deep subsections", () => {
    const out = parseCitation("7 CFR 273.9(c)(1)(ii)(A)");
    expect(out?.citationPath).toBe("us/regulation/7/273/9/c/1/ii/A");
    expect(out?.displayLabel).toBe("7 CFR § 273.9(c)(1)(ii)(A)");
  });
});

describe("parseCitation — CFR parts and subparts", () => {
  it("parses a bare CFR part", () => {
    expect(parseCitation("7 CFR Part 273")).toEqual({
      jurisdiction: "us",
      docType: "regulation",
      citationPath: "us/regulation/7/273",
      displayLabel: "7 CFR Part 273",
    });
  });

  it("parses CFR part + subpart", () => {
    expect(parseCitation("7 CFR 273 Subpart A")?.citationPath).toBe(
      "us/regulation/7/273/subpart-a"
    );
    expect(parseCitation("7 CFR Part 273, Subpart A")?.citationPath).toBe(
      "us/regulation/7/273/subpart-a"
    );
  });
});

describe("parseCitation — Colorado", () => {
  it("parses C.R.S. sections with decimal subsections", () => {
    expect(parseCitation("C.R.S. § 26-2-703(2.5)")).toEqual({
      jurisdiction: "us-co",
      docType: "statute",
      citationPath: "us-co/statute/crs/26-2-703/2.5",
      displayLabel: "C.R.S. § 26-2-703(2.5)",
    });
  });

  it("parses undotted CRS with nested subsections", () => {
    expect(parseCitation("CRS 26-2-703(2.5)(a)")?.citationPath).toBe(
      "us-co/statute/crs/26-2-703/2.5/a"
    );
  });

  it("parses CCR section with subsection", () => {
    expect(parseCitation("9 CCR 2503-6 § 3.605.2(A)")).toEqual({
      jurisdiction: "us-co",
      docType: "regulation",
      citationPath: "us-co/regulation/9-CCR-2503-6/3.605.2/A",
      displayLabel: "9 CCR 2503-6 § 3.605.2(A)",
    });
  });

  it("parses a bare CCR instrument", () => {
    expect(parseCitation("9 CCR 2503-6")?.citationPath).toBe(
      "us-co/regulation/9-CCR-2503-6"
    );
  });
});

describe("parseCitation — generic state statutes", () => {
  it("parses NY Tax Law", () => {
    expect(parseCitation("N.Y. Tax Law § 606")?.citationPath).toBe(
      "us-ny/statute/tax/606"
    );
  });

  it("parses California Unemployment Insurance Code", () => {
    expect(
      parseCitation("Cal. Unemp. Ins. Code § 2655")?.citationPath
    ).toBe("us-ca/statute/unemp-ins/2655");
  });

  it("parses D.C. Code with hyphenated section", () => {
    expect(parseCitation("D.C. Code § 47-1801")?.citationPath).toBe(
      "us-dc/statute/code/47-1801"
    );
  });
});

describe("parseCitation — UK", () => {
  it("parses a bare UKSI", () => {
    expect(parseCitation("UKSI 2013/376")?.citationPath).toBe(
      "uk/legislation/uksi/2013/376"
    );
  });

  it("parses UKSI with regulation", () => {
    expect(parseCitation("UKSI 2013/376 reg 22")?.citationPath).toBe(
      "uk/legislation/uksi/2013/376/regulation/22"
    );
  });

  it("parses UKSI regulation with subsections", () => {
    expect(
      parseCitation("UKSI 2013/376 regulation 22(3)(a)")?.citationPath
    ).toBe("uk/legislation/uksi/2013/376/regulation/22/3/a");
  });

  it("parses UKPGA with section", () => {
    expect(parseCitation("UKPGA 2012 c.5 s 3")?.citationPath).toBe(
      "uk/legislation/ukpga/2012/5/section/3"
    );
  });
});

describe("parseCitation — Canada", () => {
  it("parses RSC with Supp annotation", () => {
    expect(
      parseCitation("RSC 1985, c 1 (5th Supp)")?.citationPath
    ).toBe("canada/statute/rsc-1985/c-1-5th-supp");
  });

  it("parses RSC with section and subsections", () => {
    expect(
      parseCitation("RSC 1985, c 1 (5th Supp), s 3(1)")?.citationPath
    ).toBe("canada/statute/rsc-1985/c-1-5th-supp/3/1");
  });

  it("recognises the Income Tax Act shortcut", () => {
    expect(parseCitation("Income Tax Act")?.citationPath).toBe(
      "canada/statute/rsc-1985/c-1-5th-supp"
    );
    expect(parseCitation("Income Tax Act s 3(1)")?.citationPath).toBe(
      "canada/statute/rsc-1985/c-1-5th-supp/3/1"
    );
  });
});

describe("parseCitation — direct citation_path slug", () => {
  it("accepts a bare slug", () => {
    expect(parseCitation("us/statute/26/32")?.citationPath).toBe(
      "us/statute/26/32"
    );
  });

  it("tolerates a /axiom/ route prefix", () => {
    expect(
      parseCitation("/axiom/us/statute/26/32/b/1")?.citationPath
    ).toBe("us/statute/26/32/b/1");
  });

  it("rejects slugs whose second segment is not a known doc type", () => {
    expect(parseCitation("us/bananas/26/32")).toBeNull();
  });
});

describe("parseCitation — misc", () => {
  it("returns null for empty input", () => {
    expect(parseCitation("")).toBeNull();
    expect(parseCitation("   ")).toBeNull();
  });

  it("returns null for gibberish", () => {
    expect(parseCitation("hello world")).toBeNull();
  });
});

describe("_internalParsers", () => {
  it("exposes the parser list ordered with specific parsers first", () => {
    const parsers = _internalParsers();
    expect(parsers.length).toBeGreaterThan(5);
    expect(parsers[0].name).toBe("us-federal-usc");
    expect(parsers[parsers.length - 1].name).toBe("direct-citation-path");
  });
});
