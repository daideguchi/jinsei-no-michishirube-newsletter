# Google Sheets メルマガ管理システム テンプレート

## 📊 スプレッドシート構成

### シート1: 登録者リスト (Subscribers)
| 列名 | 説明 | 例 |
|------|------|-----|
| Email | メールアドレス | test@example.com |
| FirstName | 名 | 太郎 |
| LastName | 姓 | 山田 |
| SignupDate | 登録日時 | 2025-07-26T10:00:00Z |
| Source | 登録元 | newsletter_form |
| Status | ステータス | active/unsubscribed |
| ListName | リスト名 | main_list |
| StepStatus | 現在のステップ | day3_sent |
| Tags | タグ | 管理職,仏教 |
| Notes | 備考 | - |

### シート2: メールテンプレート (EmailTemplates)
| 列名 | 説明 | 例 |
|------|------|-----|
| TemplateID | テンプレートID | welcome_email |
| Subject | 件名 | ようこそ！心の道標へ |
| Content | 本文（HTMLも可） | （下記参照） |
| SendTiming | 送信タイミング | day0 |
| Status | ステータス | active/draft |
| LastModified | 最終更新日 | 2025-07-26 |

### シート3: 送信履歴 (SendHistory)
| 列名 | 説明 | 例 |
|------|------|-----|
| Email | 送信先 | test@example.com |
| TemplateID | 使用テンプレート | welcome_email |
| SentDate | 送信日時 | 2025-07-26T10:00:00Z |
| Status | 送信ステータス | sent/failed |
| OpenedDate | 開封日時 | 2025-07-26T10:30:00Z |
| ClickedLinks | クリックリンク | link1,link2 |

## 📝 メールテンプレート例（ペルソナ特定なし版）

### ウェルカムメール
```
件名: 【人生の道標】ご登録ありがとうございます

[FirstName] [LastName] 様

この度は「人生の道標」にご登録いただき、誠にありがとうございます。

明日から7日間、あなたの心を豊かにする智慧をお届けします。

禅の教えを現代の生活に活かし、心の平穏を見つける旅を一緒に始めましょう。

人生の道標チーム
```

### Day1: 心の整理術
```
件名: 【Day1】忙しい毎日でも心を整える3つの方法

[FirstName] 様

今日から始める心の整理術をご紹介します。

1. 朝の3分瞑想
2. 感謝日記
3. デジタルデトックス時間

詳しい実践方法は...

人生の道標チーム
```

## 🔧 Google Sheets API設定

1. **スプレッドシートID**: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM`
2. **APIキー設定**: Vercel環境変数に `GOOGLE_SHEETS_API_KEY` を設定
3. **共有設定**: スプレッドシートを「リンクを知っている全員」に共有

## 📊 Brevo連携フィールドマッピング

| Google Sheets | Brevo属性 |
|--------------|-----------|
| Email | email |
| FirstName | FIRSTNAME |
| LastName | LASTNAME |
| SignupDate | SIGNUP_DATE |
| Tags | TAGS |

## 🚀 活用方法

1. **新規登録者の自動追加**: API経由で自動登録
2. **ステータス管理**: 各ユーザーの現在のメール配信状況を把握
3. **メール文章の一元管理**: スプレッドシートでメール内容を編集
4. **送信履歴の追跡**: 開封率・クリック率の分析

## 📌 注意事項

- ペルソナ情報（年齢・職業など）は含めない
- 汎用的な内容で幅広い読者に対応
- プライバシーに配慮した情報管理