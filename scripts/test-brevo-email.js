// Brevoメール送信テストスクリプト
// 使用方法: node scripts/test-brevo-email.js

import dotenv from 'dotenv';
dotenv.config();

async function testBrevoEmail() {
  const BREVO_API_KEY = process.env.BREVO_API_KEY;
  
  if (!BREVO_API_KEY) {
    console.error('❌ BREVO_API_KEY環境変数が設定されていません');
    return;
  }

  console.log('🔍 Brevo API テスト開始...');
  
  // 1. まず連絡先リストを確認
  try {
    const listsResponse = await fetch('https://api.brevo.com/v3/contacts/lists', {
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });
    
    const lists = await listsResponse.json();
    console.log('\n📋 利用可能なリスト:', JSON.stringify(lists, null, 2));
  } catch (error) {
    console.error('❌ リスト取得エラー:', error);
  }

  // 2. 送信者情報を確認
  try {
    const sendersResponse = await fetch('https://api.brevo.com/v3/senders', {
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });
    
    const senders = await sendersResponse.json();
    console.log('\n📧 認証済み送信者:', JSON.stringify(senders, null, 2));
  } catch (error) {
    console.error('❌ 送信者取得エラー:', error);
  }

  // 3. テストメール送信
  const testEmail = {
    sender: {
      name: '人生の道標',
      email: 'daideguchisho@gmail.com' // 認証済みのメールアドレスを使用
    },
    to: [{
      email: 'test@example.com',
      name: 'テストユーザー'
    }],
    subject: '【テスト】人生の道標メルマガ動作確認',
    htmlContent: `
      <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #2C5F41;">テストメール</h1>
        <p>このメールはBrevo API経由で送信されています。</p>
        <p>送信時刻: ${new Date().toLocaleString('ja-JP')}</p>
      </div>
    `
  };

  try {
    console.log('\n📤 テストメール送信中...');
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify(testEmail)
    });

    const result = await emailResponse.json();
    
    if (emailResponse.ok) {
      console.log('✅ メール送信成功:', result);
    } else {
      console.error('❌ メール送信失敗:', emailResponse.status, result);
    }
  } catch (error) {
    console.error('❌ メール送信エラー:', error);
  }

  // 4. 登録済み連絡先の確認
  try {
    const contactsResponse = await fetch('https://api.brevo.com/v3/contacts?limit=10', {
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });
    
    const contacts = await contactsResponse.json();
    console.log('\n👥 登録済み連絡先数:', contacts.count);
    if (contacts.contacts && contacts.contacts.length > 0) {
      console.log('最新の連絡先:', contacts.contacts.slice(0, 3));
    }
  } catch (error) {
    console.error('❌ 連絡先取得エラー:', error);
  }
}

// 実行
testBrevoEmail().catch(console.error);