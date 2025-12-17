# StandBy Self-Host

StandByアプリから送信される音声を受信し、文字起こしを行うサーバー。

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. 環境変数の設定

```bash
cp env.example .env
```

`.env` を編集:

```
STANDBY_WEBHOOK_SECRET=your-webhook-secret-here
OPENAI_API_KEY=your-openai-api-key-here
```

- `STANDBY_WEBHOOK_SECRET`: StandByアプリの設定画面に表示されるシークレット
- `OPENAI_API_KEY`: [OpenAI](https://platform.openai.com/api-keys) で取得

---

## オプション A: ローカル + ngrok

開発・テスト用。ローカルでサーバーを起動し、ngrokで外部公開する。

### 1. サーバー起動

```bash
npm run dev
```

http://localhost:3000 で起動します。

### 2. ngrokでトンネル作成

別のターミナルで:

```bash
ngrok http 3000
```

表示されるURL（例: `https://xxxx-xx-xx-xx-xx.ngrok-free.app`）をコピー。

### 3. StandByアプリに設定

StandByアプリの設定画面で:

- **Webhook URL**: `https://xxxx-xx-xx-xx-xx.ngrok-free.app/api/audio`

---

## オプション B: Vercelにデプロイ

本番用。常時稼働するサーバーが必要な場合。

### 1. Vercel CLIでデプロイ

```bash
npm i -g vercel
vercel
```

初回は案内に従ってプロジェクトをセットアップ。

### 2. 環境変数を設定

```bash
vercel env add STANDBY_WEBHOOK_SECRET
vercel env add OPENAI_API_KEY
```

または [Vercelダッシュボード](https://vercel.com) → Settings → Environment Variables から設定。

### 3. 本番デプロイ

```bash
vercel --prod
```

### 4. StandByアプリに設定

StandByアプリの設定画面で:

- **Webhook URL**: `https://your-project.vercel.app/api/audio`

---

## API

### POST /api/audio

音声ファイルを受信して文字起こしを行う。

**リクエスト (multipart/form-data):**

| フィールド | 必須 | 説明 |
|-----------|------|------|
| audio | Yes | 音声ファイル (m4a) |
| sessionId | Yes | セッションID |
| chunkId | Yes | チャンクID |
| userId | Yes | ユーザーID |
| timestamp | No | タイムスタンプ |
| model | No | 文字起こしモデル（デフォルト: `gpt-4o-transcribe`） |

**対応モデル:**

- `gpt-4o-transcribe` - 高精度（デフォルト）
- `gpt-4o-mini-transcribe` - 高速・低コスト
- `gpt-4o-transcribe-diarize` - 話者分離付き
- `whisper-1` - 従来モデル

**レスポンス:**

```json
{
  "success": true,
  "sessionId": "xxx",
  "chunkId": "xxx",
  "model": "gpt-4o-transcribe",
  "text": "文字起こしされたテキスト"
}
```

話者分離モデル使用時は `segments` も含まれる:

```json
{
  "success": true,
  "sessionId": "xxx",
  "chunkId": "xxx",
  "model": "gpt-4o-transcribe-diarize",
  "text": "全体のテキスト",
  "segments": [
    { "speaker": "A", "text": "こんにちは", "start": 0.0, "end": 1.5 },
    { "speaker": "B", "text": "やあ", "start": 1.6, "end": 2.0 }
  ]
}
```

### GET /api/audio

ヘルスチェック用。

```json
{ "status": "ok" }
```
