import type { JSX } from "react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Header from "../../../components/layouts/Header";
import ArrowButton from "../../../components/ui/ArrowButton";
import { ConfirmDialog } from "../../../components/ui/ConfirmDialog";
import { MemberRepositoryImpl } from "../../../adapter/repository/MemberRepositoryImpl";
import type { Member } from "../../../adapter/repository/MemberRepositoryImpl";
import { useMembers } from "../../../hooks/useMembers";
import { useMemberStore } from "../../../store/useMemberStore";
import {
  MEMBER_TABS,
  countMembers,
  filterMembers,
  formatYen,
  memberBadge,
  searchMembers,
} from "../../../services/memberList";
import styles from "./index.module.scss";

const EMPTY_TEXT = {
  all: "まだユーザーが登録されていません",
  unrefunded: "未返金の人はいません",
  graduation: "卒業候補の人はいません",
  stopped: "利用停止中の人はいません",
} as const;

/**
 * ユーザー一覧（docs/phone-payment.md の「退部・卒業」）
 * - 全員：使える人だけ。タップで詳細（返金・利用停止・バーコード再発行）
 * - 未返金：止めたのに残高が残っている人。遅れて受け取りに来た人の返金に使う
 * - 卒業候補：入学から4年以上たった人。役員がチェックを付けた人だけ、まとめて利用停止する
 * - 停止中：利用停止した人。タブには出さず、全員の右下のボタンから入る（再開・返金用）
 */
export default function UserListPage(): JSX.Element {
  const navigate = useNavigate();
  const { members, loading, error, reload } = useMembers();
  const tab = useMemberStore((s) => s.tab);
  const setTab = useMemberStore((s) => s.setTab);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const counts = useMemo(() => countMembers(members), [members]);
  const shown = useMemo(() => searchMembers(filterMembers(members, tab), query), [members, tab, query]);
  const isGraduation = tab === "graduation";

  const changeTab = (next: typeof tab) => {
    setTab(next);
    setChecked(new Set());
    setMessage(null);
  };

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allChecked = shown.length > 0 && shown.every((m) => checked.has(m.user_id));
  const toggleAll = () => setChecked(allChecked ? new Set() : new Set(shown.map((m) => m.user_id)));

  const onRowClick = (m: Member) => {
    if (isGraduation) {
      toggle(m.user_id);
      return;
    }
    navigate(`/admin/user-list/${encodeURIComponent(m.user_id)}`);
  };

  // チェックした卒業候補を、1人ずつ利用停止する（残高は残す）
  const stopChecked = async () => {
    setBusy(true);
    const ids = [...checked];
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await MemberRepositoryImpl.stop(id);
      } catch {
        failed.push(id);
      }
    }
    setBusy(false);
    setConfirming(false);
    setChecked(new Set(failed));
    await reload();
    if (failed.length === 0) {
      setMessage({ text: `${ids.length} 人を利用停止しました`, tone: "ok" });
    } else {
      setMessage({
        text: `${ids.length - failed.length} 人を利用停止しました。${failed.length} 人は止められませんでした（チェックが残っています）`,
        tone: "error",
      });
    }
  };

  return (
    <div className={styles.container}>
      <Header title="ユーザー一覧" />

      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          {MEMBER_TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => changeTab(t.key)}
            >
              {t.label}
              <span className={styles.count}>{counts[t.key]}</span>
            </button>
          ))}
        </div>
        <div className={styles.search}>
          <input
            type="search"
            className={styles.searchInput}
            aria-label="名前か学籍番号で探す"
            placeholder="名前・学籍番号"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {(error || message) && (
        <p className={`${styles.message} ${error || message?.tone === "error" ? styles.messageError : styles.messageOk}`} role="status">
          {error ?? message?.text}
        </p>
      )}

      {tab === "stopped" && (
        <p className={styles.hint}>利用停止中の人です。タップして、利用の再開や返金ができます</p>
      )}

      {isGraduation && (
        <p className={styles.hint}>
          入学から4年以上の人です。卒業する人にチェック →まとめて利用停止（残高は残ります）
        </p>
      )}

      <ul className={styles.list}>
        {loading && members.length === 0 && <li className={styles.empty}>読み込んでいます…</li>}
        {!loading && shown.length === 0 && (
          <li className={styles.empty}>{query ? "見つかりませんでした" : EMPTY_TEXT[tab]}</li>
        )}
        {shown.map((m) => {
          const badge = memberBadge(m);
          return (
            <li key={m.user_id}>
              <button type="button" className={styles.row} onClick={() => onRowClick(m)}>
                {isGraduation && (
                  <span
                    className={`${styles.check} ${checked.has(m.user_id) ? styles.checkOn : ""}`}
                    aria-hidden="true"
                  >
                    {checked.has(m.user_id) ? "✓" : ""}
                  </span>
                )}
                <span className={styles.who}>
                  <span className={styles.name}>{m.user_name}</span>
                  <span className={styles.id}>{m.user_id}</span>
                </span>
                {badge && <span className={`${styles.badge} ${styles[badge.tone]}`}>{badge.label}</span>}
                <span className={styles.balance}>{formatYen(m.balance)}</span>
                {!isGraduation && <span className={styles.chevron} aria-hidden="true">›</span>}
              </button>
            </li>
          );
        })}
      </ul>

      {tab === "all" && (
        <div className={styles.bar}>
          <button type="button" className={styles.barSmall} onClick={() => changeTab("stopped")}>
            停止中の人 {counts.stopped}
            <span className={`${styles.arrow} ${styles.arrowNext}`} aria-hidden="true" />
          </button>
        </div>
      )}

      {tab === "stopped" && (
        <div className={styles.bar}>
          <button type="button" className={`${styles.barSmall} ${styles.barBlue}`} onClick={() => changeTab("all")}>
            <span className={`${styles.arrow} ${styles.arrowPrev}`} aria-hidden="true" />
            全員にもどる
          </button>
        </div>
      )}

      {isGraduation && (
        <div className={styles.bar}>
          <button type="button" className={styles.barPlain} onClick={toggleAll} disabled={shown.length === 0}>
            {allChecked ? "チェックを外す" : "すべて選ぶ"}
          </button>
          <button
            type="button"
            className={styles.barDanger}
            onClick={() => setConfirming(true)}
            disabled={checked.size === 0}
          >
            チェックした {checked.size} 人を利用停止
          </button>
        </div>
      )}

      {confirming && (
        <ConfirmDialog
          title={`${checked.size} 人を利用停止しますか？`}
          busy={busy}
          actions={[
            { label: "やめる", onClick: () => setConfirming(false), variant: "plain" },
            { label: busy ? "止めています…" : "利用停止する", onClick: () => void stopChecked(), variant: "danger" },
          ]}
        >
          <p>支払い用バーコードが使えなくなります。</p>
          <p>
            残高は<strong>残ります</strong>。受け取りに来た人は、あとで「未返金」から返金できます。
          </p>
        </ConfirmDialog>
      )}

      <ArrowButton variant="prev" onClick={() => navigate("/admin/user-menu")}>
        戻る
      </ArrowButton>
    </div>
  );
}
