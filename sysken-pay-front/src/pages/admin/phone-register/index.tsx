import type { JSX } from "react";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import Button from "../../../components/ui/Button";
import { BarcodeReader } from "../../../components/ui/BarcodeReader";
import { QrCode } from "../../../components/ui/QrCode";
import { usePhoneRegister } from "../../../hooks/usePhoneRegister";
import { formatRemaining } from "../../../services/phoneRegisterErrorMessage";
import { toPhoneRegisterState } from "../../../services/phoneRegisterState";
import styles from "./index.module.scss";

/**
 * スマホ登録（docs/phone-payment.md の「発行」）
 * 部員の学生証を読む → 支払い用バーコードを発行して、5分だけ有効な QR を出す。
 * 作り直し（スマホを無くした・機種変更）も同じ画面で行う。
 * ユーザー登録から続けて来たときは、学生証を読み直さずにすぐ QR を出す。
 */
export default function PhoneRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const passed = toPhoneRegisterState(location.state);
  const { phase, claim, remaining, openCount, error, start, reset } = usePhoneRegister();

  // ほかの画面から学籍番号を渡されたら、そのまま QR を作る（1回だけ）
  const startedRef = useRef(false);
  useEffect(() => {
    if (!passed || startedRef.current) return;
    startedRef.current = true;
    void start(passed.userId);
  }, [passed, start]);

  const backToMenu = () => navigate("/admin/menu");

  return (
    <div className={styles.container}>
      <Header title="スマホ登録" />
      {passed?.justRegistered && phase !== "expired" && (
        <p className={styles.registered}>ユーザー登録が終わりました。続けて、スマホに支払い用バーコードを入れます</p>
      )}

      {(phase === "scan" || phase === "creating") && (
        <div className={styles.content}>
          <BarcodeReader
            mode="member"
            onScan={start}
            placeholder="部員の学生証をかざしてください"
          />
          {phase === "creating" && <p className={styles.info}>QR を作っています…</p>}
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {phase === "showing" && claim && (
        <div className={styles.showing}>
          <QrCode value={claim.url} label="スマホ登録用の QR コード" />
          <div className={styles.side}>
            <p className={styles.name}>{claim.user_name} さん</p>
            <p className={styles.guide}>部室の Wi-Fi につないだスマホのカメラで読み取ってください</p>
            <p className={styles.remaining}>
              残り <span className={styles.time}>{formatRemaining(remaining)}</span>
            </p>
            <p className={openCount >= 2 ? styles.warn : styles.count}>開かれた回数：{openCount} 回</p>
            {openCount >= 2 && (
              <p className={styles.warn}>本人以外が開いていないか確かめてください</p>
            )}
            <Button size="md" onClick={backToMenu}>
              終わる
            </Button>
          </div>
        </div>
      )}

      {phase === "expired" && (
        <div className={styles.content}>
          <div className={styles.expired}>
            <p className={styles.expiredTitle}>QR の期限（5分）が切れました</p>
            <p className={styles.guide}>
              {openCount > 0
                ? `スマホで ${openCount} 回開かれています。保存できていれば、このまま使えます。`
                : "まだ開かれていません。もう一度学生証を読み取ってください。"}
            </p>
            <Button size="md" onClick={reset}>
              もう一度
            </Button>
          </div>
        </div>
      )}

      {phase !== "showing" && (
        <ArrowButton variant="prev" onClick={backToMenu}>
          戻る
        </ArrowButton>
      )}
    </div>
  );
}
