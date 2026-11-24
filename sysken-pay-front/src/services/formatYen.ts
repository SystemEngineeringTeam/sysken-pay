/** 金額を「¥1,230」の形にする */
export const formatYen = (amount: number): string => `¥${amount.toLocaleString("ja-JP")}`;
