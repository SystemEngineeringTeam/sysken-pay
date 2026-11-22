// PC のカメラでバーコード（EAN-13 / EAN-8）を読む。読めたら onScan に JAN を渡す。
import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { isValidJan } from "./jan";

export type Scanner = { stop: () => void };

export const startScanner = async (video: HTMLVideoElement, onScan: (jan: string) => void): Promise<Scanner> => {
  const hints = new Map<DecodeHintType, unknown>([[DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8]]]);
  const reader = new BrowserMultiFormatReader(hints);
  const controls = await reader.decodeFromVideoDevice(undefined, video, (result) => {
    const text = result?.getText();
    if (text && isValidJan(text)) onScan(text);
  });
  return { stop: () => controls.stop() };
};
