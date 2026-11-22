import { describe, expect, it } from "vitest";
import { parseRoute, sectionOf } from "./route";

describe("parseRoute", () => {
  it("商品", () => {
    expect(parseRoute("")).toEqual({ name: "items" });
    expect(parseRoute("#/items")).toEqual({ name: "items" });
    expect(parseRoute("#/items/new")).toEqual({ name: "itemNew" });
    expect(parseRoute("#/items/4901777018884")).toEqual({ name: "item", jan: "4901777018884" });
  });
  it("ユーザー", () => {
    expect(parseRoute("#/users")).toEqual({ name: "users" });
    expect(parseRoute("#/users/24K00001")).toEqual({ name: "user", id: "24K00001" });
    expect(parseRoute("#/users/24K00001/edit")).toEqual({ name: "userEdit", id: "24K00001" });
    expect(parseRoute("#/users/24K00001/issue")).toEqual({ name: "userIssue", id: "24K00001" });
  });
  it("管理者の許可", () => {
    expect(parseRoute("#/admins")).toEqual({ name: "admins" });
    expect(sectionOf({ name: "admins" })).toBe("admins");
  });
  it("不正な形は一覧に戻す", () => {
    expect(parseRoute("#/users/%E0%A4%A")).toEqual({ name: "users" });
    expect(parseRoute("#/users/a/b/c")).toEqual({ name: "users" });
    expect(parseRoute("#/zzz")).toEqual({ name: "items" });
  });
  it("区分", () => {
    expect(sectionOf({ name: "userIssue", id: "x" })).toBe("users");
    expect(sectionOf({ name: "itemNew" })).toBe("items");
  });
});
