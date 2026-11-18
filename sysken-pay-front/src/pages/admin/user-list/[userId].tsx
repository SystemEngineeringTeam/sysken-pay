import type { JSX } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import type { ConfirmAction } from "../../../components/ui/ConfirmDialog";
import { MemberRepositoryImpl } from "../../../adapter/repository/MemberRepositoryImpl";
import { useMembers } from "../../../hooks/useMembers";
import { useUserStore } from "../../../store/useUserStore";
import { formatYen } from "../../../services/memberList";
import { toMemberErrorMessage } from "../../../services/memberErrorMessage";
import type { PhoneRegisterState } from "../../../services/phoneRegisterState";
import styles from "./[userId].module.scss";

type Dialog = "refund" | "stop" | "resume" | null;

/**
 * ユーザーの詳細（docs/phone-payment.md の「退部・卒業」）
 * - 返金：残高ちょうどを現金で返す（止めた人にもできる）
 * - 利用停止：残高が残っていれば「返金しますか？」と出す。いなければ止めるだけ（残高は残す）
 * - 止めた人は「利用を再開」で戻せる（そのあとバーコードを発行し直す）
 */
export default function UserDetailPage(): JSX.Element {
  const navigate = useNavigate();
  const { userId = "" } = useParams();
  const { members, loading, error: listError, reload } = useMembers();
  const setScannedUser = useUserStore((s) => s.setScannedUser);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const m = members.find((x) => x.user_id === userId);
  const stopped = m?.status === "stopped";

  // 操作を1つ行って、一覧を読み直す
  const run = async (action: () => Promise<string>, kind: "refund" | "stop" | "resume") => {
    setBusy(true);
    try {
      setMessage({ text: await action(), tone: "ok" });
    } catch (e) {
      setMessage({ text: toMemberErrorMessage(kind, e), tone: "error" });
    } finally {
      setBusy(false);
      setDialog(null);
      await reload();
    }
  };

  const refund = () =>
    run(async () => `${formatYen(await MemberRepositoryImpl.refund(userId))} を返金しました`, "refund");

  const stop = (withRefund: boolean) =>
    run(async () => {
      let refunded = 0;
      if (withRefund) refunded = await MemberRepositoryImpl.refund(userId);
      const remaining = await MemberRepositoryImpl.stop(userId);
      if (refunded > 0) return `${formatYen(refunded)} を返金して、利用停止しました`;
      if (remaining > 0) return `利用停止しました（残高 ${formatYen(remaining)} は残しています）`;
      return "利用停止しました";
    }, "stop");

  const resume = async () => {
    setBusy(true);
    try {
      await MemberRepositoryImpl.resume(userId);
      // 再開したら、そのまま支払い用バーコードを発行し直す
      const state: PhoneRegisterState = { userId };
      navigate("/admin/phone-register", { state });
    } catch (e) {
      setMessage({ text: toMemberErrorMessage("resume", e), tone: "error" });
      setDialog(null);
    } finally {
      setBusy(false);
    }
  };

  const reissue = () => {
    const state: PhoneRegisterState = { userId };
    navigate("/admin/phone-register", { state });
  };

  const rename = () => {
    if (!m) return;
    setScannedUser({ user_id: m.user_id, user_name: m.user_name });
    navigate("/admin/user-update/name");
  };

  const back = () => navigate("/admin/user-list");

  if (!m) {
    return (
      <div className={styles.container}>
        <Header title="ユーザー詳細" />
        <p className={styles.notFound}>
          {loading ? "読み込んでいます…" : listError ?? "このユーザーは見つかりませんでした"}
        </p>
        <ArrowButton variant="prev" onClick={back}>
          戻る
        </ArrowButton>
      </div>
    );
  }

  let dialogView: JSX.Element | null = null;
  if (dialog === "refund") {
    dialogView = (
      <ConfirmDialog
        title={`${formatYen(m.balance)} を返金しますか？`}
        busy={busy}
        actions={[
          { label: "やめる", onClick: () => setDialog(null), variant: "plain" },
          { label: "現金を渡した", onClick: () => void refund() },
        ]}
      >
        <p>
          現金箱から <strong>{formatYen(m.balance)}</strong> を渡してから押してください。
        </p>
        <p>残高は 0 円になります。</p>
      </ConfirmDialog>
    );
  } else if (dialog === "stop") {
    const actions: ConfirmAction[] =
      m.balance > 0
        ? [
            { label: "やめる", onClick: () => setDialog(null), variant: "plain" },
            { label: "止めるだけ", onClick: () => void stop(false), variant: "danger" },
            { label: "返金して止める", onClick: () => void stop(true) },
          ]
        : [
            { label: "やめる", onClick: () => setDialog(null), variant: "plain" },
            { label: "利用停止する", onClick: () => void stop(false), variant: "danger" },
          ];
    dialogView = (
      <ConfirmDialog title="利用停止しますか？" busy={busy} actions={actions}>
        <p>支払い用バーコードが使えなくなります。</p>
        {m.balance > 0 && (
          <p>
            残高が <strong>{formatYen(m.balance)}</strong> 残っています。
            <br />
            本人がいれば「返金して止める」、いなければ「止めるだけ」（残高は残ります）
          </p>
        )}
      </ConfirmDialog>
    );
  } else if (dialog === "resume") {
    dialogView = (
      <ConfirmDialog
        title="利用を再開しますか？"
        busy={busy}
        actions={[
          { label: "やめる", onClick: () => setDialog(null), variant: "plain" },
          { label: "再開する", onClick: () => void resume() },
        ]}
      >
        <p>再開したら、続けて支払い用バーコードを発行します。</p>
      </ConfirmDialog>
    );
  }

  return (
    <div className={styles.container}>
      <Header title="ユーザー詳細" />

      {message && (
        <p className={`${styles.message} ${message.tone === "ok" ? styles.messageOk : styles.messageError}`} role="status">
          {message.text}
        </p>
      )}

      <div className={styles.body}>
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <span className={`${styles.status} ${stopped ? styles.statusStopped : styles.statusActive}`}>
              {stopped ? "利用停止中" : "使用中"}
            </span>
            {m.unrefunded && <span className={styles.unrefunded}>未返金</span>}
          </div>
          <p className={styles.name}>{m.user_name}</p>
          <p className={styles.id}>{m.user_id}</p>
          <div className={styles.balanceBox}>
            <span className={styles.balanceLabel}>残高</span>
            <span className={styles.balance}>{formatYen(m.balance)}</span>
          </div>
          <p className={styles.meta}>
            バーコード：{m.has_payment_card ? "あり" : "なし"}
            {m.stopped_at && <> ／ 停止：{m.stopped_at.slice(0, 10)}</>}
          </p>
        </section>

        <section className={styles.actions}>
          <button
            type="button"
            className={`${styles.action} ${styles.primary}`}
            onClick={() => setDialog("refund")}
            disabled={m.balance <= 0}
          >
            返金
            <span className={styles.sub}>{m.balance > 0 ? `${formatYen(m.balance)} を返す` : "残高 0 円"}</span>
          </button>
          {stopped ? (
            <button type="button" className={`${styles.action} ${styles.outline}`} onClick={() => setDialog("resume")}>
              利用を再開
              <span className={styles.sub}>再入部したとき</span>
            </button>
          ) : (
            <>
              <button type="button" className={`${styles.action} ${styles.danger}`} onClick={() => setDialog("stop")}>
                利用停止
                <span className={styles.sub}>退部・卒業したとき</span>
              </button>
              <button type="button" className={`${styles.action} ${styles.outline}`} onClick={reissue}>
                バーコード再発行
                <span className={styles.sub}>スマホを替えたとき</span>
              </button>
              <button type="button" className={`${styles.action} ${styles.outline}`} onClick={rename}>
                名前を変える
              </button>
            </>
          )}
        </section>
      </div>

      {dialogView}

      <ArrowButton variant="prev" onClick={back}>
        戻る
      </ArrowButton>
    </div>
  );
}
