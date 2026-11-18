// Package barcode は支払い用バーコードの画像（Code128）を作る。
// 外部ライブラリを増やさないため、Code128 の符号化と PNG の書き出しを自前で行う。
package barcode

import (
	"bytes"
	"errors"
	"image"
	"image/color"
	"image/png"
)

// ErrUnsupported は Code128（コードセット B）で表せない文字が含まれていることを表す
var ErrUnsupported = errors.New("barcode: unsupported character")

// code128Patterns は値 0〜106 の「バー・スペースの幅」（モジュール数）。
// 0〜102 はデータ、103〜105 はスタート（A/B/C）、106 はストップ。
var code128Patterns = [...]string{
	"212222", "222122", "222221", "121223", "121322", "131222", "122213", "122312", "132212", "221213",
	"221312", "231212", "112232", "122132", "122231", "113222", "123122", "123221", "223211", "221132",
	"221231", "213212", "223112", "312131", "311222", "321122", "321221", "312212", "322112", "322211",
	"212123", "212321", "232121", "111323", "131123", "131321", "112313", "132113", "132311", "211313",
	"231113", "231311", "112133", "112331", "132131", "113123", "113321", "133121", "313121", "211331",
	"231131", "213113", "213311", "213131", "311123", "311321", "331121", "312113", "312311", "332111",
	"314111", "221411", "431111", "111224", "111422", "121124", "121421", "141122", "141221", "112214",
	"112412", "122114", "122411", "142112", "142211", "241211", "221114", "413111", "241112", "134111",
	"111242", "121142", "121241", "114212", "124112", "124211", "411212", "421112", "421211", "212141",
	"214121", "412121", "111143", "111341", "131141", "114113", "114311", "411113", "411311", "113141",
	"114131", "311141", "411131", "211412", "211214", "211232", "2331112",
}

const (
	startB = 104
	stop   = 106
	// QuietZone はバーコードの左右に空ける白の幅（モジュール数）。規格では10以上
	QuietZone = 10
)

// Modules は text を Code128（コードセット B）で符号化し、左から順に
// 「黒なら true」のモジュールの並びを返す（左右の余白は含まない）。
func Modules(text string) ([]bool, error) {
	if text == "" {
		return nil, ErrUnsupported
	}
	values := make([]int, 0, len(text)+3)
	values = append(values, startB)
	sum := startB
	for i := 0; i < len(text); i++ {
		c := text[i]
		if c < 32 || c > 126 {
			return nil, ErrUnsupported
		}
		v := int(c) - 32
		values = append(values, v)
		sum += v * (i + 1)
	}
	values = append(values, sum%103, stop)

	var mods []bool
	for _, v := range values {
		black := true
		for _, w := range code128Patterns[v] {
			for n := 0; n < int(w-'0'); n++ {
				mods = append(mods, black)
			}
			black = !black
		}
	}
	return mods, nil
}

// PNG は text のバーコード画像を PNG で返す。
// scale は1モジュールの幅（ピクセル）、height は高さ（ピクセル）。左右に QuietZone の白を付ける。
func PNG(text string, scale, height int) ([]byte, error) {
	mods, err := Modules(text)
	if err != nil {
		return nil, err
	}
	if scale < 1 || height < 1 {
		return nil, errors.New("barcode: invalid size")
	}
	width := (len(mods) + QuietZone*2) * scale
	img := image.NewGray(image.Rect(0, 0, width, height))
	for i := range img.Pix {
		img.Pix[i] = 0xff
	}
	for i, black := range mods {
		if !black {
			continue
		}
		x0 := (QuietZone + i) * scale
		for x := x0; x < x0+scale; x++ {
			for y := 0; y < height; y++ {
				img.SetGray(x, y, color.Gray{Y: 0})
			}
		}
	}
	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}
