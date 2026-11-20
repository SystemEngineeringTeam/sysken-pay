import { describe, expect, it } from "vitest";
import { barcodeModules } from "./barcode";
import { display, fromHash, isValid, normalize } from "./code";

const CODE = "SP7Q2KX9MDRA4TW8YZ";

// 移植前の Go 実装（app/ui/barcode の Modules）が同じ文字列に対して出力していたバーの並び（1=黒）。
// 部室のリーダーで読めていた符号と、ライブラリが同じものを作ることの確認用
const GO_MODULES =
  "11010010000110111010001110111011011101101110110100011101100111001010110001110111000101101110010110010111011000101100010001100010111010100011000110010011101101110001011101000110111010011001110110100011101100010101000011001100011101011";

describe("バーコード（JsBarcode の Code128B）", () => {
  it("Go 実装と同じバーの並びを作る", () => {
    expect(barcodeModules(CODE)).toBe(GO_MODULES);
  });

  it("Code128 の規格どおりの例と一致する", () => {
    // "A" = スタートB + 値33 + チェック(104+33=137 → 137%103=34) + ストップ
    expect(barcodeModules("A")).toBe("11010010000" + "10100011000" + "10001011000" + "1100011101011");
  });
});

describe("支払い用文字列", () => {
  it("形が正しいものだけを通す", () => {
    expect(isValid(CODE)).toBe(true);
    for (const bad of [
      "SP7Q2KX9MDRA4TW8Y", // 短い
      "SP7Q2KX9MDRA4TW8YZZ", // 長い
      "XX7Q2KX9MDRA4TW8YZ", // 先頭が SP でない
      "SP0Q2KX9MDRA4TW8YZ", // 0 は使わない
      "SP1Q2KX9MDRA4TW8YZ", // 1 は使わない
      "SPOQ2KX9MDRA4TW8YZ", // O は使わない
      "SPIQ2KX9MDRA4TW8YZ", // I は使わない
      "4901234567894", // 商品の JAN コード
    ]) {
      expect(isValid(bad)).toBe(false);
    }
  });

  it("SP のあとを4文字ずつ区切って表示する", () => {
    expect(display(CODE)).toBe("SP 7Q2K X9MD RA4T W8YZ");
  });

  it("空白・ハイフン・小文字を取り除く", () => {
    expect(normalize("sp 7q2k-x9md ra4t w8yz")).toBe(CODE);
    expect(normalize(display(CODE))).toBe(CODE);
  });
});

describe("URL のフラグメント", () => {
  it("支払い用文字列を取り出す", () => {
    expect(fromHash(`#a=${CODE}`)).toBe(CODE);
    expect(fromHash(`#x=1&a=${CODE}`)).toBe(CODE);
    expect(fromHash(`#a=${encodeURIComponent("SP 7Q2K X9MD RA4T W8YZ")}`)).toBe(CODE);
    expect(fromHash("#a=sp7q2kx9mdra4tw8yz")).toBe(CODE);
  });

  it("無い・壊れている・形が違うときは null", () => {
    for (const h of ["", "#", "#a=", "#a=SP0000000000000000", "#a=%E0%A4%A", `?a=${CODE}`]) {
      expect(fromHash(h)).toBeNull();
    }
  });
});
