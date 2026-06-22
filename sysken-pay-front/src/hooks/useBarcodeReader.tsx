import { useState, useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useBalanceStore } from "../store/useBalanceStore";
import { useUserStore } from "../store/useUserStore";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import { UserRepositoryImpl } from "../adapter/repository/UserRepositoryImpl";
import styles from "./useBarcodeReader.module.scss";

function useScanGuards() {
  const isMountedRef = useRef(true);
  const isScanningRef = useRef(false);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return { isMountedRef, isScanningRef };
}

function useErrorWithAutoReset() {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const ErrorMessage = (): JSX.Element | null =>
    error ? <p className={styles.error}>{error}</p> : null;

  return { setError, ErrorMessage };
}

export function useProductScan() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { setError, ErrorMessage } = useErrorWithAutoReset();
  const { isMountedRef, isScanningRef } = useScanGuards();

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!data?.item_id) throw new Error("商品が見つかりませんでした。ご不明の際は担当者にご連絡ください。");
      if (!isMountedRef.current) return;
      addItem(data);
      navigate("/buy/list");
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(e instanceof Error ? e.message : "商品の取得に失敗しました");
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}

export function useUserScan() {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const { setError, ErrorMessage } = useErrorWithAutoReset();
  const { isMountedRef, isScanningRef } = useScanGuards();

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    isScanningRef.current = true;
    try {
      const user = await UserRepositoryImpl.getUser(barcode);
      const balance = await UserRepositoryImpl.getBalance(user.user_id!);
      if (!isMountedRef.current) return;
      setBalance(balance);
      setScannedUser({ user_id: user.user_id! });
      navigate("/charge/select");
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(e instanceof Error ? e.message : "ユーザーの取得に失敗しました");
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}
