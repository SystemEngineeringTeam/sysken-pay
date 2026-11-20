import { useCallback, useEffect, useRef, useState } from "react";
import {
  HriRepositoryImpl,
  type IssuedHri,
} from "../adapter/repository/HriRepositoryImpl";
import { toPhoneRegisterErrorMessage } from "../services/phoneRegisterErrorMessage";
import { buildQrUrl, getQrEndpoint, QR_DISPLAY_SECONDS } from "../services/qrUrl";

type Phase = "scan" | "creating" | "showing" | "expired";

/**
 * スマホ登録の流れ（docs/phone-payment.md の「発行」）
 *   scan（学生証を読む）→ creating → showing（QR を表示。残り時間を数える）→ expired（QR を消す）
 * 支払い用文字列は QR の URL の中にだけ持ち、表示が終わったら捨てる。
 */
export const usePhoneRegister = () => {
  const [phase, setPhase] = useState<Phase>("scan");
  const [userName, setUserName] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const clear = useCallback(() => {
    setQrUrl(null);
    setUserName("");
    setRemaining(0);
  }, []);

  const start = useCallback(async (userId: string) => {
    if (creatingRef.current) return; // 読み取りの二重送信を防ぐ
    creatingRef.current = true;
    setError(null);
    // 発行すると古いバーコードが使えなくなるので、QR を作れないときは発行より先に断る
    const endpoint = getQrEndpoint();
    if (endpoint === null) {
      setError("QR の行き先が設定されていません。フロントの .env の VITE_QR_ENDPOINT を設定してください。");
      creatingRef.current = false;
      return;
    }
    setPhase("creating");
    try {
      const issued: IssuedHri = await HriRepositoryImpl.issue(userId);
      setUserName(issued.user_name);
      setQrUrl(buildQrUrl(endpoint, issued.hri));
      setRemaining(QR_DISPLAY_SECONDS);
      setPhase("showing");
    } catch (e) {
      setError(toPhoneRegisterErrorMessage(e));
      setPhase("scan");
    } finally {
      creatingRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    clear();
    setError(null);
    setPhase("scan");
  }, [clear]);

  // 残り時間を1秒ごとに減らす
  useEffect(() => {
    if (phase !== "showing") return;
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // 時間になったら QR を消す
  useEffect(() => {
    if (phase === "showing" && remaining <= 0) {
      setQrUrl(null);
      setPhase("expired");
    }
  }, [phase, remaining]);

  return { phase, userName, qrUrl, remaining, error, start, reset };
};
