import type { components } from "../types/api-schema";

export type ChargeAmount = components["schemas"]["PostChargeRequest"]["amount"];

/**
 * チャージできる金額。バックエンド（domain/object/charge の allowedAmounts）と OpenAPI の enum に合わせる。
 * OpenAPI 側を変えると、ここが型エラーになって食い違いに気づける。
 */
export const CHARGE_AMOUNTS = [500, 1000, 2000] as const satisfies readonly ChargeAmount[];

export const isChargeAmount = (value: number): value is ChargeAmount =>
  (CHARGE_AMOUNTS as readonly number[]).includes(value);

/** 画面に出す「500円・1,000円・2,000円」の文 */
export const chargeAmountsLabel = CHARGE_AMOUNTS.map((a) => `${a.toLocaleString()}円`).join("・");
