import { useCallback, useEffect, useState } from "react";
import { MemberRepositoryImpl } from "../adapter/repository/MemberRepositoryImpl";
import { toMemberErrorMessage } from "../services/memberErrorMessage";
import { useMemberStore } from "../store/useMemberStore";

/** ユーザー一覧を読み込む。画面を開いたときに1回読み、操作のあとは reload で読み直す */
export const useMembers = () => {
  const members = useMemberStore((s) => s.members);
  const setMembers = useMemberStore((s) => s.setMembers);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      setMembers(await MemberRepositoryImpl.list());
      setError(null);
    } catch (e) {
      setError(toMemberErrorMessage("list", e));
    } finally {
      setLoading(false);
    }
  }, [setMembers]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { members, loading, error, reload };
};
