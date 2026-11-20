// 保存用のカード画像（縦長 1080x1920）を canvas に描く。
// 色はラズパイの画面と同じ（sysken-pay-front/src/styles/scss/_design-primitive.scss）
const COLOR = {
  // 画像の背景（カードの後ろ）。ラズパイの画面の背景色（$white-10）
  bg: "#FFFDFB",
  blue: "#5398E1",
  blueLight: "#6FAAE8",
  white: "#FFFFFF",
  gray70: "#636A74",
  gray100: "#454A53",
};
const FONT = '"Noto Sans JP", "Hiragino Sans", "Hiragino Kaku Gothic ProN", system-ui, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, monospace';
// スマホの画面に近い縦長（9:16）
const W = 1080;
const H = 1920;

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// 幅に収まるまで文字を小さくして書く
const fitText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  size: number,
  weight: number,
  family: string,
) => {
  let s = size;
  do {
    ctx.font = `${weight} ${s}px ${family}`;
    s -= 2;
  } while (ctx.measureText(text).width > maxWidth && s > 20);
  ctx.fillText(text, x, y);
};

type CardInput = {
  name: string;
  code: string; // バーコードの下に出す文字（IssueCode.display の結果）
  barcode: HTMLCanvasElement;
  mascot: HTMLImageElement | null;
};

export const drawCard = ({ name, code, barcode, mascot }: CardInput): string => {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas is not available");
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // 背景
  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, W, H);

  // 見出し
  ctx.fillStyle = COLOR.blue;
  ctx.font = `800 88px ${FONT}`;
  ctx.fillText("シス研Pay", W / 2, 210);
  ctx.fillStyle = COLOR.gray100;
  ctx.font = `700 56px ${FONT}`;
  ctx.fillText("支払い用バーコード", W / 2, 300);

  // カード（青）
  const card = { x: 60, y: 390, w: 960, h: 1220, r: 56 };
  ctx.save();
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r);
  const grad = ctx.createLinearGradient(card.x, card.y, card.x + card.w, card.y + card.h);
  grad.addColorStop(0, COLOR.blueLight);
  grad.addColorStop(1, COLOR.blue);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.clip();

  // 背景の飾り（薄い丸）
  ctx.fillStyle = "rgba(255, 255, 255, 0.08)";
  ctx.beginPath();
  ctx.arc(card.x + card.w - 40, card.y + 80, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(card.x + 60, card.y + card.h - 40, 200, 0, Math.PI * 2);
  ctx.fill();

  // マスコット（カードの下の真ん中からのぞく。画像の下端をカードの下端に合わせる）
  if (mascot) {
    const mw = 420;
    const mh = (mascot.height / mascot.width) * mw;
    ctx.drawImage(mascot, card.x + (card.w - mw) / 2, card.y + card.h - mh, mw, mh);
  }
  ctx.restore();

  // カードの左上の文字
  ctx.textAlign = "left";
  ctx.fillStyle = COLOR.white;
  ctx.font = `800 44px ${FONT}`;
  ctx.fillText("シス研Pay", card.x + 56, card.y + 92);
  ctx.textAlign = "center";

  // バーコードの白い枠（読み取りやすいよう、まわりを広く白くする）
  const box = { x: card.x + 50, y: card.y + 140, w: card.w - 100, h: 500, r: 36 };
  ctx.fillStyle = COLOR.white;
  roundRect(ctx, box.x, box.y, box.w, box.h, box.r);
  ctx.fill();

  // バーコードは拡大せずに貼る（ぼやけると読めなくなるため）
  ctx.imageSmoothingEnabled = false;
  const bx = Math.round(box.x + (box.w - barcode.width) / 2);
  const by = box.y + 50;
  ctx.drawImage(barcode, bx, by);

  // SP の文字
  ctx.fillStyle = COLOR.gray100;
  fitText(ctx, code, W / 2, by + barcode.height + 96, box.w - 80, 56, 700, MONO);

  // 名前（渡されていなければ書かない）
  if (name) {
    ctx.fillStyle = COLOR.white;
    fitText(ctx, name, W / 2, box.y + box.h + 120, card.w - 120, 60, 700, FONT);
  }

  // カードの下の案内
  ctx.fillStyle = COLOR.gray70;
  ctx.font = `700 40px ${FONT}`;
  ctx.fillText("支払いのときは、この画面をリーダーにかざしてください", W / 2, 1720, W - 80);
  ctx.font = `500 34px ${FONT}`;
  ctx.fillText("読み取りにくいときは、画面を明るくしてください", W / 2, 1790, W - 80);

  return canvas.toDataURL("image/png");
};

