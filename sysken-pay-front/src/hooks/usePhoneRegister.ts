import { useCallback, useEffect, useRef, useState } from "react";
import {
  PaymentCardRepositoryImpl,
  type CreatedClaim,
} from "../adapter/repository/PaymentCardRepositoryImpl";
import { toPhoneRegisterErrorMessage } from "../services/phoneRegisterErrorMessage";

/** 状態を問い合わせる間隔（ミリ秒） */
export const STATUS_POLL_MS = 2000;

type Phase = "scan" | "creating" | "showing" | "expired";

/**
 * スマホ登録の流れ（docs/phone-payment.md の「発行」）
 *   scan（学生証を読む）→ creating → showing（QR を表示。残り時間と開かれた回数を更新）→ expired
 */
export const usePhoneRegister = () => {
  const [phase, setPhase] = useState<Phase>("scan");
  const [claim, setClaim] = useState<CreatedClaim | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [openCount, setOpenCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const creatingRef = useRef(false);

  const start = useCallback(async (userId: string) => {
    if (creatingRef.current) return; // 読み取りの二重送信を防ぐ
    creatingRef.current = true;
    setPhase("creating");
    setError(null);
    try {
      const created = await PaymentCardRepositoryImpl.createClaim(userId);
      setClaim(created);
      setRemaining(created.expires_in_seconds);
      setOpenCount(0);
      setPhase("showing");
    } catch (e) {
      setError(toPhoneRegisterErrorMessage(e));
      setPhase("scan");
    } finally {
      creatingRef.current = false;
    }
  }, []);

  const reset = useCallback(() => {
    setClaim(null);
    setRemaining(0);
    setOpenCount(0);
    setError(null);
    setPhase("scan");
  }, []);

  // 残り時間を1秒ごとに減らす
  useEffect(() => {
    if (phase !== "showing") return;
    const timer = setInterval(() => {
      setRemaining((r) => Math.max(0, r - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase === "showing" && remaining <= 0) setPhase("expired");
  }, [phase, remaining]);

  // 開かれた回数と、サーバーから見た残り時間を定期的に取り直す
  useEffect(() => {
    if (phase !== "showing" || !claim) return;
    const timer = setInterval(async () => {
      try {
        const st = await PaymentCardRepositoryImpl.getClaimStatus(claim.claim_id);
        setOpenCount(st.open_count);
        setRemaining(st.expired ? 0 : st.remaining_seconds);
      } catch {
        // 一時的に取れなくても表示は続ける（期限は手元のカウントダウンで判定する）
      }
    }, STATUS_POLL_MS);
    return () => clearInterval(timer);
  }, [phase, claim]);

  return { phase, claim, remaining, openCount, error, start, reset };
};
