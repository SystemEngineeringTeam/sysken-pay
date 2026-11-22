import { useState, useEffect, useRef, type JSX } from "react";
import { useNavigate } from "react-router-dom";
import { useCartStore } from "../store/useCartStore";
import { useBalanceStore } from "../store/useBalanceStore";
import { useUserStore } from "../store/useUserStore";
import { ItemRepositoryImpl } from "../adapter/repository/ItemRepositoryImpl";
import { UserRepositoryImpl } from "../adapter/repository/UserRepositoryImpl";
import { HriRepositoryImpl } from "../adapter/repository/HriRepositoryImpl";
import { PurchaseRepositoryImpl } from "../adapter/repository/PurchaseRepositoryImpl";
import { toPurchaseErrorMessage } from "../services/purchaseErrorMessage";
import {
  CART_EMPTY_ON_PAY,
  insufficientBalanceMessage,
  STUDENT_ID_NOT_ACCEPTED,
  isStudentId,
  looksLikePaymentCode,
  toPaymentScanErrorMessage,
} from "../services/paymentScan";
import { PRODUCT_DISABLED, PRODUCT_NOT_REGISTERED, toProductScanErrorMessage } from "../services/productScanErrorMessage";
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

/** エラーを出す位置。bottom＝下のボタンの上（ふだん）、top＝見出しの下（下に合計などがある画面） */
type ErrorPosition = "bottom" | "top";

function useErrorWithAutoReset(position: ErrorPosition = "bottom") {
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const ErrorMessage = (): JSX.Element | null =>
    error ? <p className={`${styles.error} ${position === "top" ? styles.top : ""}`}>{error}</p> : null;

  return { setError, ErrorMessage };
}

/** 残高の画面に渡す、持ち主の名前と残高 */
export type BalanceView = {
  userName: string;
  balance: number;
};

export function useProductScan() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const { setError, ErrorMessage } = useErrorWithAutoReset();
  const { isMountedRef, isScanningRef } = useScanGuards();

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    // 学生証は使えない（商品の API にも送らない）
    if (isStudentId(barcode)) {
      setError(STUDENT_ID_NOT_ACCEPTED);
      return;
    }
    // スマホのシス研Payバーコードをかざしたら、残高を見せる（商品の API には送らない）
    if (looksLikePaymentCode(barcode)) {
      isScanningRef.current = true;
      try {
        const user = await HriRepositoryImpl.resolve(barcode);
        const balance = await UserRepositoryImpl.getBalance(user.user_id);
        if (!isMountedRef.current) return;
        const state: BalanceView = { userName: user.user_name, balance: balance.balance ?? 0 };
        navigate("/balance", { state });
      } catch (e) {
        if (!isMountedRef.current) return;
        setError(toPaymentScanErrorMessage(e));
      } finally {
        isScanningRef.current = false;
      }
      return;
    }
    isScanningRef.current = true;
    try {
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!isMountedRef.current) return;
      if (!data?.item_id) {
        setError(PRODUCT_NOT_REGISTERED);
        return;
      }
      // 無効の商品は買えない（有効にするのは管理画面。ラズパイからはさせない）
      if (data.disabled) {
        setError(PRODUCT_DISABLED);
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
 * スマホのシス研Payバーコード（支払い用バーコード）を読み取り、持ち主と残高を調べてから nextPath へ進む。
 * 支払い・チャージで使う（docs/phone-payment.md。学生証での支払いはやめた）。
 * 学生証を読んだときは API に送らず、「学生証は使えません」と案内する。
 */
export function usePaymentCardScan(nextPath: string = "/charge/select") {
  const navigate = useNavigate();
  const setBalance = useBalanceStore((state) => state.setBalance);
  const setScannedUser = useUserStore((state) => state.setScannedUser);
  const { setError, ErrorMessage } = useErrorWithAutoReset();
  const { isMountedRef, isScanningRef } = useScanGuards();

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    if (isStudentId(barcode)) {
      setError(STUDENT_ID_NOT_ACCEPTED);
      return;
    }
    isScanningRef.current = true;
    try {
      const user = await HriRepositoryImpl.resolve(barcode);
      const balance = await UserRepositoryImpl.getBalance(user.user_id);
      if (!isMountedRef.current) return;
      setBalance(balance);
      setScannedUser({ user_id: user.user_id, user_name: user.user_name });
      navigate(nextPath);
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(toPaymentScanErrorMessage(e));
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}

/** 完了画面に渡す、買った結果（シス研Payで払ったとき） */
export type PurchaseResult = {
  userName: string;
  total: number;
  balance: number;
};

/**
 * カートの画面の読み取り。
 * - 商品のバーコード → カートに足す（画面はそのまま）
 * - シス研Payバーコード → その人の残高ですぐに買って、完了画面へ進む（ボタンは押さない）
 * - 学生証 → 「学生証は使えません」
 */
export function useCartScan() {
  const navigate = useNavigate();
  const addItem = useCartStore((state) => state.addItem);
  const clearCart = useCartStore((state) => state.clearCart);
  // 下には合計を出しているので、エラーは見出しの下に出す（残高不足のときに合計が隠れないように）
  const { setError, ErrorMessage } = useErrorWithAutoReset("top");
  const { isMountedRef, isScanningRef } = useScanGuards();

  const pay = async (code: string) => {
    // 読み取った時点のカートを使う（画面の表示と同じもの）
    const cartItems = useCartStore.getState().cartItems;
    if (cartItems.length === 0) {
      setError(CART_EMPTY_ON_PAY);
      return;
    }
    let user;
    try {
      user = await HriRepositoryImpl.resolve(code);
    } catch (e) {
      if (isMountedRef.current) setError(toPaymentScanErrorMessage(e));
      return;
    }
    const total = cartItems.reduce((sum, { item, quantity }) => sum + (item.price ?? 0) * quantity, 0);
    try {
      const data = await PurchaseRepositoryImpl.createPurchase(user.user_id, {
        items: cartItems.map(({ item, quantity }) => ({ item_id: item.item_id ?? 0, quantity })),
      });
      if (!isMountedRef.current) return;
      clearCart();
      const result: PurchaseResult = { userName: user.user_name, total, balance: data.balance ?? 0 };
      navigate("/buy/complete", { state: result });
    } catch (e) {
      if (!isMountedRef.current) return;
      if (e instanceof Error && e.message === "insufficient balance") {
        // いくら足りないかを出す（残高が取れなければ、決まった文にする）
        try {
          const b = await UserRepositoryImpl.getBalance(user.user_id);
          if (isMountedRef.current) setError(insufficientBalanceMessage(b?.balance ?? 0, total));
        } catch {
          if (isMountedRef.current) setError(toPurchaseErrorMessage(e));
        }
        return;
      }
      setError(toPurchaseErrorMessage(e));
    }
  };

  const onScan = async (barcode: string) => {
    if (isScanningRef.current) return;
    if (isStudentId(barcode)) {
      setError(STUDENT_ID_NOT_ACCEPTED);
      return;
    }
    isScanningRef.current = true;
    try {
      if (looksLikePaymentCode(barcode)) {
        await pay(barcode);
        return;
      }
      const data = await ItemRepositoryImpl.getItemByJanCode(barcode);
      if (!isMountedRef.current) return;
      if (!data?.item_id) {
        setError(PRODUCT_NOT_REGISTERED);
        return;
      }
      // 無効の商品は買えない（有効にするのは管理画面。ラズパイからはさせない）
      if (data.disabled) {
        setError(PRODUCT_DISABLED);
        return;
      }
      addItem(data);
    } catch (e) {
      if (!isMountedRef.current) return;
      setError(toProductScanErrorMessage(e));
    } finally {
      isScanningRef.current = false;
    }
  };

  return { onScan, ErrorMessage };
}
