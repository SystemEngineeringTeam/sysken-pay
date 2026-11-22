import { describe, expect, it } from "vitest";
import { parseStudentId, toUpn, toUserId } from "./studentId";

describe("parseStudentId", () => {
  it("大文字にそろえ、前後の空白は無視する", () => {
    expect(parseStudentId(" x24042 ")).toBe("X24042");
  });
  it("決まった形でなければ null（一般化しない）", () => {
    for (const bad of ["", "X2404", "X240421", "Z24042", "X14042", "24042", "20X24042", "x24042xx@aitech.ac.jp", "24K01234"]) {
      expect(parseStudentId(bad), bad).toBeNull();
    }
  });
});

describe("toUserId", () => {
  it("先頭に 20 を付ける（既存の 20K23099 の形に合わせる）", () => {
    expect(toUserId("X24042")).toBe("20X24042");
    expect(toUserId("k23099")).toBe("20K23099");
    expect(toUserId("nope")).toBeNull();
  });
  it("できた user.id は、サーバーの形（数字2桁・英字・数字）に合う", () => {
    expect(toUserId("E24001")).toMatch(/^\d{2}[A-Za-z]\d+$/);
  });
});

describe("toUpn", () => {
  it("学部の文字を 2 つ足して小文字にする", () => {
    expect(toUpn("X24042")).toBe("x24042xx@aitech.ac.jp");
    expect(toUpn("K23099")).toBe("k23099kk@aitech.ac.jp");
    expect(toUpn("bad")).toBeNull();
  });
});
