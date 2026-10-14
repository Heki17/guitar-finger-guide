# 🎸 Guitar Finger Guide (ギター運指ガイド)

Songsterr と連携した、初心者向けのリアルタイムギター運指ガイド＆インタラクティブタブ譜プレーヤーです。
ブラウザ上で譜面再生・パート切り替え・メトロノーム・速度変更・ループを行いつつ、**リアルなギター指板イラスト上に「今押さえる指」と「次に押さえる指」をリアルタイム表示**します。

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)
![alphaTab](https://img.shields.io/badge/alphaTab-MPL--2.0-blue)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)

---

## ✨ 主な機能

1. **初心者向けリアルタイム運指ガイド**
   - **ギターイラスト一体型指板**: ヘッドストック（0フレット）・象牙色ナット・指板・フレット・弦がリアルなギターイラストとして描画されます。
   - **指番号カラーバッジ**: 1（人差し指: 青）、2（中指: 緑）、3（薬指: 黄）、4（小指: 赤）。
   - **開放弦（0）とミュート（✕）**: 指番号と同じくギターイラストの弦の上にダイレクト表示。和音演奏時に弾かない弦も自動でミュート表示。
   - **セーハ（バレーコード）検出**: Fコードなどのセーハを自動認識してバー表示。
   - **先読みガイド**: 次に押さえるコード/単音を点線バッジで予告し、「あと N 拍」のカウントダウンを表示。
   - **手の移動最小化**: 動的計画法（DP）により、無理のない手のポジション移動を自動計算。

2. **Songsterr からの直接参照・検索**
   - **曲名・アーティスト名検索**: キーワードで Songsterr の楽曲ライブラリを直接検索。
   - **URL / ID 直接指定**: ブラウザの Songsterr URL や ID を貼り付けるだけでタブ譜データを自動取得。
   - **ワンクリックおすすめ曲**: Wonderwall, Creeping Death, Smells Like Teen Spirit, Stairway to Heaven, Canon Rock など。
   - **.gp ファイルの直接ダウンロード不要**: データをクラウドから直接ストリーミング解析。

3. **充実のプレーヤー機能 (alphaTab + AlphaSynth)**
   - **シンセ音源再生**: 内蔵 SoundFont（SONiVOX）によるリアルタイム合成再生。
   - **マルチトラック＆ミキサー**: リードギター、リズムギター、ベースなどのパート切り替え、ミュート、ソロ、音量調整。
   - **テンポ変更**: 25%〜150% で自由にスピードダウン可能。
   - **メトロノーム＆カウントイン**: 再生前の1小節カウントインやメトロノーム音。
   - **区間ループ**: 譜面をマウスドラッグするだけで任意の小節・フレーズをループ練習。
   - **ローカルファイル対応**: 手持ちの Guitar Pro ファイル（.gp, .gp5, .gpx 等）のドラッグ＆ドロップ読込にも対応。

---

## 🚀 ローカル起動方法

```bash
# 依存パッケージのインストール
npm install

# 開発サーバーの起動
npm run dev
```

ブラウザで `http://localhost:5173` を開きます。

---

## 🛠 技術スタック

- **フロントエンド**: React 19, TypeScript, Vite
- **譜面描画＆音声合成**: alphaTab (AlphaSynth, Web AudioWorklet, Web Workers)
- **指板描画**: SVG (完全ベクターレンダリング、レスポンシブ対応)
- **API プロキシ**: Vercel Serverless Function (`api/songsterr/[...path].ts`)
- **ホスティング**: Vercel
