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
 * スマホ登録・バーコード再発行（docs/phone-payment.md の「発行」）
 * 学生証を読む → 支払い用バーコードを発行して、2分だけ QR を出す（過ぎたら消す）。
 * 作り直し（スマホを無くした・機種変更）も同じ画面で行う。
 * ユーザー登録から続けて来たときは、学生証を読み直さずにすぐ QR を出す。
 */
export default function PhoneRegisterPage(): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();
  const passed = toPhoneRegisterState(location.state);
  const { phase, userName, qrUrl, remaining, error, start, reset } = usePhoneRegister();

  // ほかの画面から学籍番号を渡されたら、そのまま QR を作る（1回だけ）
  const startedRef = useRef(false);
  useEffect(() => {
    if (!passed || startedRef.current) return;
    startedRef.current = true;
    void start(passed.userId);
  }, [passed, start]);

  const backToMenu = () => navigate("/admin/user-menu");

  return (
    <div className={styles.container}>
      {/* ユーザー登録から続けて来たときは「ユーザー登録」、管理メニューから来たときは「バーコード再発行」 */}
      <Header title={passed?.justRegistered ? "ユーザー登録" : "バーコード再発行"} />
      {passed?.justRegistered && phase !== "expired" && (
        <p className={styles.registered}>ユーザー登録が終わりました。続けて、スマホに支払い用バーコードを入れます</p>
      )}

      {(phase === "scan" || phase === "creating") && (
        <div className={styles.content}>
          <BarcodeReader
            mode="member"
            onScan={start}
            placeholder="学生証をかざしてください"
            error={error}
          />
          {phase === "creating" && <p className={styles.info}>QR を作っています…</p>}
        </div>
      )}

      {phase === "showing" && qrUrl && (
        <div className={styles.showing}>
          <QrCode value={qrUrl} label="スマホ登録用の QR コード" />
          <div className={styles.side}>
            <p className={styles.name}>{userName} さん</p>
            <p className={styles.guide}>スマホのカメラで読み取ってください（インターネットにつないだ状態で）</p>
            <p className={styles.remaining}>
              残り <span className={styles.time}>{formatRemaining(remaining)}</span>
            </p>
            <Button size="md" onClick={backToMenu}>
              終わる
            </Button>
          </div>
        </div>
      )}

      {phase === "expired" && (
        <div className={styles.content}>
          <div className={styles.expired}>
            <p className={styles.expiredTitle}>QR を消しました（2分）</p>
            <p className={styles.guide}>
              スマホで読み取って画像を保存できていれば、そのまま使えます。できていなければ、もう一度学生証を読み取ってください（前のバーコードは使えなくなります）。
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
