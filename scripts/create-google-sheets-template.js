// Google Sheetsスプレッドシート自動作成スクリプト
// 使用方法: node scripts/create-google-sheets-template.js

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM/edit';

console.log('📊 Google Sheetsテンプレート設定ガイド');
console.log('==========================================');

console.log('\n🔗 スプレッドシートURL:');
console.log(SHEET_URL);

console.log('\n📋 シート1: 登録者リスト (Subscribers)');
console.log('以下のヘッダーを A1 から入力してください:');
console.log('┌──────────────┬───────────┬──────────────────────────────┐');
console.log('│ A            │ B         │ C                            │');
console.log('│ Email        │ FirstName │ LastName                     │');
console.log('├──────────────┼───────────┼──────────────────────────────┤');
console.log('│ D            │ E         │ F                            │');
console.log('│ SignupDate   │ Source    │ Status                       │');
console.log('├──────────────┼───────────┼──────────────────────────────┤');
console.log('│ G            │ H         │ I                            │');
console.log('│ ListName     │ StepStatus│ Notes                        │');
console.log('└──────────────┴───────────┴──────────────────────────────┘');

console.log('\n📝 シート2: メールテンプレート (EmailTemplates)');
console.log('以下のヘッダーを A1 から入力してください:');
console.log('┌──────────────┬─────────┬─────────────────────────────┐');
console.log('│ A            │ B       │ C                           │');
console.log('│ TemplateID   │ Subject │ Content                     │');
console.log('├──────────────┼─────────┼─────────────────────────────┤');
console.log('│ D            │ E       │ F                           │');
console.log('│ SendTiming   │ Status  │ LastModified                │');
console.log('└──────────────┴─────────┴─────────────────────────────┘');

console.log('\n📧 シート3: 送信履歴 (SendHistory)');
console.log('以下のヘッダーを A1 から入力してください:');
console.log('┌──────────────┬─────────────┬─────────────────────────┐');
console.log('│ A            │ B           │ C                       │');
console.log('│ Email        │ TemplateID  │ SentDate                │');
console.log('├──────────────┼─────────────┼─────────────────────────┤');
console.log('│ D            │ E           │ F                       │');
console.log('│ Status       │ OpenedDate  │ ClickedLinks            │');
console.log('└──────────────┴─────────────┴─────────────────────────┘');

console.log('\n🔧 設定手順:');
console.log('1. 上記URLでスプレッドシートを開く');
console.log('2. 3つのシートを作成（Subscribers, EmailTemplates, SendHistory）');
console.log('3. 各シートに上記のヘッダーを設定');
console.log('4. 共有設定を「リンクを知っている全員が編集可」に変更');
console.log('5. Vercel環境変数にGOOGLE_SHEETS_API_KEYを設定');

console.log('\n📋 サンプルデータ（Subscribersシートに入力）:');
console.log('test@example.com | テスト | 太郎 | 2025-07-26T10:00:00Z | newsletter_form | active | main_list | welcome_sent | -');

console.log('\n📝 サンプルテンプレート（EmailTemplatesシートに入力）:');
console.log('welcome_email | 【人生の道標】ご登録ありがとうございます | [テンプレート内容] | day0 | active | 2025-07-26');

console.log('\n🌟 Brevo連携確認方法:');
console.log('1. newsletter-form/scripts/test-brevo-email.js を実行');
console.log('2. 登録者リストがBrevoと同期されているか確認');
console.log('3. ウェルカムメールが送信されているか確認');

console.log('\n✅ 完了後の確認項目:');
console.log('- スプレッドシートが閲覧可能');
console.log('- API経由でデータ追加可能');
console.log('- Brevoとの同期が正常');
console.log('- ウェルカムメール送信が正常');

// 現在の環境変数を確認
require('dotenv').config();
console.log('\n🔍 現在の環境変数状況:');
console.log('BREVO_API_KEY:', process.env.BREVO_API_KEY ? '✅ 設定済み' : '❌ 未設定');
console.log('GOOGLE_SHEETS_API_KEY:', process.env.GOOGLE_SHEETS_API_KEY ? '✅ 設定済み' : '❌ 未設定');

// テスト用の実データサンプル
const sampleData = {
  subscribers: [
    ['test@example.com', 'テスト', '太郎', '2025-07-26T10:00:00Z', 'newsletter_form', 'active', 'main_list', 'welcome_sent', ''],
    ['demo@example.com', 'デモ', '花子', '2025-07-26T10:15:00Z', 'newsletter_form', 'active', 'main_list', 'day1_sent', ''],
    ['sample@example.com', 'サンプル', '次郎', '2025-07-26T10:30:00Z', 'newsletter_form', 'active', 'main_list', 'pending', '']
  ],
  templates: [
    ['welcome_email', '【人生の道標】ご登録ありがとうございます', 'ようこそ、心の道標へ。明日から7日間の智慧をお届けします。', 'day0', 'active', '2025-07-26'],
    ['day1_mindfulness', '【Day1】心を整える3つの方法', '今日は心の整理術をご紹介します...', 'day1', 'active', '2025-07-26'],
    ['day7_summary', '【Day7】7日間の振り返りと次のステップ', '一週間お疲れさまでした...', 'day7', 'active', '2025-07-26']
  ]
};

console.log('\n📊 サンプルデータ:');
console.log('Subscribers:', sampleData.subscribers.length, '行');
console.log('Templates:', sampleData.templates.length, '行');

console.log('\n🎯 次のステップ:');
console.log('1. 上記URLでスプレッドシートを開いて設定');
console.log('2. node scripts/test-brevo-email.js でBrevo接続テスト');
console.log('3. 実際にメルマガ登録してシステム全体をテスト');