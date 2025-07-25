# 人生の道標 - Newsletter Signup System

デジタル伽藍メルマガ登録システム（Vercel + Brevo + Formspree）

## 🚀 GitHub Actions自動デプロイ

### 初回セットアップ

1. **GitHub Secrets設定**
   ```
   Repository → Settings → Secrets and variables → Actions
   
   追加する必要があるSecrets:
   - VERCEL_TOKEN: あなたのVercel Token
   - BREVO_API_KEY: your_brevo_api_key_here
   ```

2. **Vercel Token取得**
   ```
   https://vercel.com/account/tokens
   → Create Token → Newsletter Deploy Token → Create
   ```

3. **自動デプロイ開始**
   ```bash
   git add .
   git commit -m "🚀 Setup GitHub Actions auto-deploy"
   git push origin main
   ```

### 🔧 ローカル開発

```bash
# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .envファイルに実際のAPIキーを設定

# ローカル開発サーバー（存在する場合）
npm run dev
```

### 📱 機能

- **メルマガ登録フォーム**: 禅的デザインのレスポンシブフォーム
- **Brevo自動登録**: リストID 2に自動追加
- **ウェルカムメール**: 登録時に自動送信
- **Formspreeバックアップ**: データ保護用バックアップシステム
- **7日間ステップメール**: 自動フォローアップ（Brevo側設定）

### 🌐 デプロイURL

**本番環境**: https://newsletter-form-ckcexrnio-daideguchis-projects.vercel.app

### 🔐 セキュリティ

- ✅ 環境変数でAPIキー管理
- ✅ .gitignoreでSecrets保護  
- ✅ CORS設定済み
- ✅ GitHub Actions自動デプロイ

### 📊 統合システム

- **Brevo**: メルマガ配信・自動化
- **Formspree**: データバックアップ
- **Vercel**: ホスティング・Functions
- **GitHub Actions**: CI/CD自動化