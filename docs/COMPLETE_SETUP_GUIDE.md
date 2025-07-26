# 🎯 完全自動メルマガシステム設定ガイド

**一度設定すれば、あとは完全自動で動作するシステムです**

## 📋 システム構成

```
登録者 → Vercel (signup.js) → Brevo (即座にウェルカムメール送信)
                            ↓
                          GAS (スプレッドシートに自動記録)
                            ↓
                          n8n (定期的にスケジューリング)
                            ↓
                          Brevo (ステップメール自動送信)
                            ↓
                          GAS (送信履歴自動更新)
```

## 🚀 設定手順

### Phase 1: Google Apps Script設定 (5分)

1. **Google Apps Scriptを開く**
   - https://script.google.com にアクセス
   - 「新しいプロジェクト」をクリック

2. **minimal-setup.gsをコピペ**
   ```javascript
   // newsletter-form/google-apps-script/minimal-setup.gs の内容をコピペ
   ```

3. **初期設定実行**
   ```javascript
   // 実行: setupNewsletterSystem()
   ```
   - スプレッドシートが自動作成されます
   - Webhook URLが生成されます

4. **Brevo設定**
   ```javascript
   // 実行: setupBrevoProperties()
   ```
   - Brevo API KEYを入力: `YOUR_BREVO_API_KEY`
   - 送信者メール: `dd.1107.11107@gmail.com`

5. **WebApp公開**
   - 「デプロイ」→「新しいデプロイ」
   - 種類: ウェブアプリ
   - アクセス権: 全員
   - 実行ユーザー: 自分
   - URLをコピー (GAS_WEBHOOK_URLとして使用)

### Phase 2: Vercel環境変数設定 (2分)

```bash
vercel env add GAS_WEBHOOK_URL
# 上記でコピーしたGAS WebApp URLを入力

vercel env add BREVO_API_KEY
# あなたのBrevo API KEYを入力
```

### Phase 3: n8n設定 (3分)

1. **ワークフローインポート**
   - `newsletter-form/n8n-workflow/newsletter-automation.json` をインポート

2. **環境変数設定**
   ```
   GAS_WEBHOOK_URL: (Phase 1でコピーしたURL)
   BREVO_API_KEY: (あなたのBrevo API KEY)
   ```

3. **ワークフロー有効化**
   - 毎日10時に自動実行されます

### Phase 4: 動作確認 (1分)

1. **ランディングページでテスト登録**
   - https://newsletter-form-exq6nh9y8-daideguchis-projects.vercel.app/

2. **確認項目**
   - ✅ ウェルカムメールが即座に届く
   - ✅ Google Sheetsに登録者が追加される
   - ✅ 翌日10時に自動でDay1メールが送信される

## 📊 管理方法

### スプレッドシート管理
- **URL**: Phase 1で生成されたスプレッドシートURL
- **自動更新**: 登録者・送信履歴・統計すべて自動
- **手動編集**: メールテンプレートのみ編集可能

### メール内容の変更
1. Google Sheetsの「メールテンプレート」シートを開く
2. Subject列やContent列を編集
3. 保存すると次回送信から反映

### 登録者の管理
- **登録者リスト**: 自動で追加・更新
- **配信停止**: Statusを「unsubscribed」に変更
- **段階確認**: CurrentStepで進行状況を確認

## 🔧 トラブルシューティング

### ウェルカムメールが届かない
1. Brevo APIキーが正しいか確認
2. `dd.1107.11107@gmail.com` がBrevoで認証済みか確認
3. 迷惑メールフォルダを確認

### GAS連携が動作しない
1. GAS WebApp URLが正しくVercelに設定されているか確認
2. GASのプロジェクトで「実行ユーザー: 自分」になっているか確認
3. アクセス権限が「全員」になっているか確認

### n8nが動作しない
1. 環境変数が正しく設定されているか確認
2. ワークフローが有効化されているか確認
3. GAS WebApp URLにアクセスできるか確認

## 📈 システムの利点

### 完全自動化
- **新規登録**: 即座にウェルカムメール
- **ステップメール**: 1日目、3日目、7日目に自動送信
- **データ管理**: 登録者情報・送信履歴すべて自動記録

### 手動作業ゼロ
- メール文章の編集以外、何もする必要なし
- 統計・分析もリアルタイム自動更新
- 配信停止も自動で処理

### スケーラブル
- 登録者が何人になっても自動で対応
- メールテンプレートを追加すれば長期間のシーケンス可能
- 複数のメルマガリストも管理可能

## 🎉 完了！

これで完全自動メルマガシステムが稼働開始です。

**あなたがやることは**:
1. 一度だけの設定 (上記手順)
2. 必要に応じてメール文章の調整
3. 結果を見る

**システムが自動でやること**:
- 新規登録者の受付
- ウェルカムメール送信
- ステップメール配信
- データ管理・統計
- 送信履歴記録

---

## 📞 サポート

設定でわからないことがあれば、以下のファイルを確認:
- `scripts/test-brevo-email.js` - Brevo接続テスト
- `docs/GOOGLE_SHEETS_TEMPLATE.md` - スプレッドシート詳細
- `google-apps-script/minimal-setup.gs` - GAS完全コード