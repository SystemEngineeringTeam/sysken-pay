---
name: front-safe-rollback
description: フロントエンド（sysken-pay-front）が壊れたときの復旧ワークフロー。「画面が真っ白」「ビルドが通らなくなった」「表示が崩れた」「ボタンが押せない」「元に戻したい」「ラズパイの画面がおかしい」「昨日まで動いてた」といった訴えがあったら、原因調査や修正を始める前にまずこのスキルを使う。残高がおかしい・API がエラーを返すなどバックエンドや DB が疑わしい場合は back-safe-rollback を使う。
---

# Front Safe Rollback

フロントが壊れた状態から安全に戻すスキル。最優先は「元に戻すこと」ではなく「**これ以上悪化させないこと**」。

## 大原則

1. **消さない・上書きしない。** 使ってよいのは「追加する」操作（ブランチ作成、stash、revert コミット）だけ。`git reset --hard`、`git clean`、`git checkout -- .`、force push は使わない（deny と hook でもブロックされる）
2. **作業前に必ず退避する。**
3. **1操作ごとに平易な言葉で説明する。** 何をするか・何が起きるか・やり直せるかを添える
4. **2回試して直らなかったら手を止めて**、現状・試したこと・残りの選択肢を報告する

## Step 1: 現状を凍結して把握する

```
git status
git log --oneline -15 -- .
git diff
git stash list
```

ユーザーに聞く: いつまで動いていたか / 直前に何をしたか / どの画面で何をしたら何が起きるか（スクショ・ブラウザのコンソールのエラー）。

**まずフロントの問題かを切り分ける**: ブラウザの開発者ツールの Network で API がエラー（4xx/5xx・接続できない）を返しているなら、原因はバックエンド側の可能性が高い。その場合は `back-safe-rollback` に切り替える。

## Step 2: 壊れ方を分類する

| 状況 | 見分け方 | 対応 |
|---|---|---|
| 未コミットの変更で壊れた | `git status` に変更があり、最後のコミットでは動いていた | 4-A |
| コミット済み（未push） | 壊した変更がローカルのコミットにある | 4-B |
| push 済み | GitHub にも上がっている | 4-C |
| ラズパイの画面が壊れた | 部室の端末だけおかしい | 4-D |
| 依存の更新で壊れた | `pnpm-lock.yaml` / `package.json` を変えた後から | 4-B/4-C（lockfile ごと revert） |

どのコミットから壊れたか分からないときは、`pnpm exec vitest run src/test` と `pnpm build` を手がかりに範囲を絞る（過去のコミットを見る前に Step 3 で退避する）。

## Step 3: 現状を退避する

```
git stash push -u -m "rollback前の未コミット退避 <日付>"   # 未コミット変更がある場合
git branch backup/before-rollback-<日付>
```

「今の状態は `backup/...` に保存したので、いつでもここに戻れます」と伝える。

## Step 4: 安全な手段で復旧する

- **4-A**: `git stash push -u -m "壊れた変更の退避 <日付>"`。stash は消さない
- **4-B**: `git revert <コミット>`。複数なら `git revert --no-commit <古い方>..HEAD` してから1コミットに
- **4-C**: ローカルで revert して通常の push。PR 運用なので revert も PR で出す
- **4-D: ラズパイの画面を戻す**: コードを直して入れ直すより、前に動いていたコミットで作り直す方が速い
  1. ラズパイで今のコミットを確認（`git log -1`）
  2. `git switch -c rollback/<日付> <動いていたコミット>`（今のブランチは消さない）
  3. `pnpm install --frozen-lockfile && pnpm build`
  4. `pnpm preview:pi` を再起動し、キオスクのブラウザを再読み込み
  5. `.env`（`VITE_API_URL` 等）はビルド時に埋め込まれる。`.env` を変えた後に壊れた場合は、変えた内容をユーザーに確認してもらう（Claude は `.env` を読まない）

## Step 5: 直ったことを確認する

```
pnpm exec vitest run src/test
pnpm build
```

画面の崩れなら、`front-pi-display-ui` の Step 3 の手順で 800x480 のスクショを撮って確認する。可能ならユーザー自身に部室の端末で見てもらう。

## Step 6: 平易な言葉でまとめる

- 原因（分からなければ「分からなかった」）
- 何をどこまで戻したか
- 退避した状態の場所（`backup/...` ブランチ、stash）
- 再発防止に次にやるとよいこと（テスト追加など）

退避ブランチ・stash は勝手に消さない。
