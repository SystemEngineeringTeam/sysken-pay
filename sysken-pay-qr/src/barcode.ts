import JsBarcode from "jsbarcode";

// 1モジュール3ピクセル、高さ300、左右の余白10モジュール。保存用カード（幅1080）に拡大せずに貼るため
export const BARCODE_OPTIONS = {
  format: "CODE128B",
  width: 3,
  height: 300,
  margin: 0,
  marginLeft: 30,
  marginRight: 30,
  displayValue: false,
  background: "#FFFFFF",
  lineColor: "#000000",
} as const;

// 支払い用文字列の Code128（コードセット B）の画像を canvas に描いて返す
export const makeBarcode = (code: string): HTMLCanvasElement => {
  const canvas = document.createElement("canvas");
  JsBarcode(canvas, code, BARCODE_OPTIONS);
  return canvas;
};

// バーの並び（1=黒）。テストと、リーダーで読めた符号との照合に使う
export const barcodeModules = (code: string): string => {
  const out: { encodings?: { data: string }[] } = {};
  JsBarcode(out, code, { format: BARCODE_OPTIONS.format });
  return (out.encodings ?? []).map((e) => e.data).join("");
};
