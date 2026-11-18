import { useState, useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useBalanceStore } from "../store/useBalanceStore";
import { useUserStore } from "../store/useUserStore";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import { UserRepositoryImpl } from "../adapter/repository/UserRepositoryImpl";
import { toUserScanErrorMessage } from "../services/userScanErrorMessage";
import { PRODUCT_NOT_REGISTERED, toProductScanErrorMessage } from "../services/productScanErrorMessage";
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
      if (!isMountedRef.current) return;
      if (!data?.item_id) {
        setError(PRODUCT_NOT_REGISTERED);
        return;
      }
      addItem(data);
      navigate("/buy/list");
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(toProductScanErrorMessage(e));
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}

/**
 * 学生証を読み取り、登録済みのユーザーかを確かめてから残高を取得し、nextPath へ進む。
 * 残高 API は未登録の学籍番号でも 0 円を返すので、必ず先にユーザー取得 API で存在を確かめる。
 */
export function useUserScan(nextPath: string = "/charge/select") {
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
      navigate(nextPath);
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(toUserScanErrorMessage(e));
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}
