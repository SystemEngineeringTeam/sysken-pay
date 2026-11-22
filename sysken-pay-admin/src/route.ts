// URL のハッシュ（#/items など）を、開く画面に直す。画面に依存しない。
export type Route =
  | { name: "items" }
  | { name: "itemNew" }
  | { name: "item"; jan: string }
  | { name: "users" }
  | { name: "userNew" }
  | { name: "user"; id: string }
  | { name: "userEdit"; id: string }
  | { name: "userIssue"; id: string }
  | { name: "admins" };

const decode = (s: string): string | null => {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
};

export const parseRoute = (hash: string): Route => {
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const [a, b, c] = parts;
  if (a === "admins") return { name: "admins" };
  if (a === "users") {
    if (parts.length === 1) return { name: "users" };
    if (b === "new" && parts.length === 2) return { name: "userNew" };
    const id = decode(b);
    if (id && parts.length === 2) return { name: "user", id };
    if (id && parts.length === 3 && c === "edit") return { name: "userEdit", id };
    if (id && parts.length === 3 && c === "issue") return { name: "userIssue", id };
    return { name: "users" };
  }
  if (a === "items" && parts.length === 2) {
    if (b === "new") return { name: "itemNew" };
    const jan = decode(b);
    if (jan) return { name: "item", jan };
  }
  return { name: "items" };
};

/** ナビで強調する区分 */
export const sectionOf = (r: Route): "items" | "users" | "admins" => (r.name === "admins" ? "admins" : r.name.startsWith("user") ? "users" : "items");
