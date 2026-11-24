/** 利用停止した人（退部・卒業）が読み取ったときに出す文（API は 403） */
export const USER_STOPPED_MESSAGE = "利用停止されています。役員に伝えてください。";

/**
 * 管理者画面で、利用停止した人を読み取ったときに出す文。
 * 利用の再開は PC の管理サイトでしかできない（API の resume は adminOnly で、管理者バーコードの Session では通らない）
 */
export const ADMIN_USER_STOPPED_MESSAGE = "このユーザーは利用停止しています。PC の管理サイトで利用を再開してください。";
