import { describe, expect, it } from "vitest";
import { toPhoneRegisterState } from "../../services/phoneRegisterState";

describe("toPhoneRegisterState", () => {
  it("学籍番号があれば取り出す", () => {
    expect(toPhoneRegisterState({ userId: "24K01234", justRegistered: true })).toEqual({
      userId: "24K01234",
      justRegistered: true,
    });
  });

  it("justRegistered が無ければ false", () => {
    expect(toPhoneRegisterState({ userId: "24K01234" })).toEqual({
      userId: "24K01234",
      justRegistered: false,
    });
  });

  it.each([null, undefined, "24K01234", {}, { userId: "" }, { userId: "  " }, { userId: 123 }])(
    "形が違えば null（%o）",
    (state) => {
      expect(toPhoneRegisterState(state)).toBeNull();
    },
  );
});
