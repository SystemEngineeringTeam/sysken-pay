package barcode

import (
	"bytes"
	"image/png"
	"strings"
	"testing"
)

func toBits(mods []bool) string {
	var b strings.Builder
	for _, m := range mods {
		if m {
			b.WriteByte('1')
		} else {
			b.WriteByte('0')
		}
	}
	return b.String()
}

// 期待値は python-barcode（Code128）で作った並び。読み取り機が読める正しい Code128 になっているかの確認。
// python-barcode は数字が4つ以上続くとコードセット C に切り替えるので、比べるのは数字が続かない文字列だけ
// （数字が続く場合はデコードして確かめる: TestModulesRoundTrip）
func TestModulesMatchesReference(t *testing.T) {
	tests := map[string]string{
		"SP7Q2KX9MDRA4TW8YZ": "11010010000110111010001110111011011101101110110100011101100111001010110001110111000101101110010110010111011000101100010001100010111010100011000110010011101101110001011101000110111010011001110110100011101100010101000011001100011101011",
		"SPZZZZZZZZZZZZZZZZ": "11010010000110111010001110111011011101100010111011000101110110001011101100010111011000101110110001011101100010111011000101110110001011101100010111011000101110110001011101100010111011000101110110001011101100010100100011001100011101011",
	}
	for text, want := range tests {
		mods, err := Modules(text)
		if err != nil {
			t.Fatalf("%s: %v", text, err)
		}
		if got := toBits(mods); got != want {
			t.Errorf("%s:\n got  %s\n want %s", text, got, want)
		}
	}
}

func TestPatternsWidth(t *testing.T) {
	for i, p := range code128Patterns {
		sum := 0
		for _, c := range p {
			sum += int(c - '0')
		}
		want := 11
		if i == stop {
			want = 13
		}
		if sum != want {
			t.Errorf("pattern %d width = %d, want %d", i, sum, want)
		}
	}
}

func TestModulesRejectsUnsupported(t *testing.T) {
	for _, s := range []string{"", "あ", "SP\n"} {
		if _, err := Modules(s); err == nil {
			t.Errorf("%q: エラーにならなかった", s)
		}
	}
}

func TestPNGSize(t *testing.T) {
	b, err := PNG("SP7Q2KX9MDRA4TW8YZ", 3, 200)
	if err != nil {
		t.Fatal(err)
	}
	img, err := png.Decode(bytes.NewReader(b))
	if err != nil {
		t.Fatal(err)
	}
	mods, _ := Modules("SP7Q2KX9MDRA4TW8YZ")
	if w := img.Bounds().Dx(); w != (len(mods)+QuietZone*2)*3 {
		t.Errorf("width = %d", w)
	}
	if h := img.Bounds().Dy(); h != 200 {
		t.Errorf("height = %d", h)
	}
	// 左端は余白（白）
	if r, _, _, _ := img.At(0, 0).RGBA(); r != 0xffff {
		t.Error("左端が白になっていない")
	}
}

// decode は Modules の結果を読み戻す（スタート B・チェック文字・ストップを確かめる）
func decode(t *testing.T, mods []bool) string {
	t.Helper()
	lookup := map[string]int{}
	for v, p := range code128Patterns {
		lookup[p] = v
	}
	// 黒白の連続した幅に直す
	var widths []byte
	for i := 0; i < len(mods); {
		j := i
		for j < len(mods) && mods[j] == mods[i] {
			j++
		}
		widths = append(widths, byte('0'+j-i))
		i = j
	}
	var values []int
	for i := 0; i+6 <= len(widths); i += 6 {
		p := string(widths[i : i+6])
		if i+7 == len(widths) {
			p = string(widths[i:])
		}
		v, ok := lookup[p]
		if !ok {
			t.Fatalf("unknown pattern %s", p)
		}
		values = append(values, v)
	}
	if values[0] != startB || values[len(values)-1] != stop {
		t.Fatalf("start/stop = %d/%d", values[0], values[len(values)-1])
	}
	data := values[1 : len(values)-2]
	sum := startB
	var b strings.Builder
	for i, v := range data {
		sum += v * (i + 1)
		b.WriteByte(byte(v + 32))
	}
	if sum%103 != values[len(values)-2] {
		t.Fatalf("checksum mismatch")
	}
	return b.String()
}

func TestModulesRoundTrip(t *testing.T) {
	for _, text := range []string{"SP23456789ABCDEFGH", "SP7Q2KX9MDRA4TW8YZ", "SP2222222222222222", "SPZZZZZZZZZZZZZZZZ"} {
		mods, err := Modules(text)
		if err != nil {
			t.Fatal(err)
		}
		if got := decode(t, mods); got != text {
			t.Errorf("decode = %q, want %q", got, text)
		}
	}
}
