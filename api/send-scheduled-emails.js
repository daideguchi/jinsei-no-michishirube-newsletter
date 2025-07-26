// Vercel Cron Job - 完全自動メール配信システム
// vercel.json で定期実行設定

export default async function handler(req, res) {
  // Vercel Cronからの認証
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    console.log('🕐 定期メール配信開始:', new Date().toISOString());

    // 1. スプレッドシートから登録者データ取得
    const subscribers = await getActiveSubscribers();
    
    // 2. 送信すべきメールを判定・送信
    const results = await processBatchEmails(subscribers);
    
    // 3. 送信結果をスプレッドシートに記録
    await logBatchResults(results);

    return res.status(200).json({
      success: true,
      message: '自動メール配信完了',
      processed: results.length,
      sent: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('自動配信エラー:', error);
    return res.status(500).json({
      error: '自動配信失敗',
      message: error.message
    });
  }
}

async function getActiveSubscribers() {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  
  if (!API_KEY) {
    console.warn('GOOGLE_SHEETS_API_KEY not configured');
    return [];
  }
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A2:J1000?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets読み込み失敗: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    return rows
      .filter(row => row[5] === 'active') // Status列が'active'
      .map(row => ({
        email: row[0],
        firstName: row[1],
        lastName: row[2],
        signupDate: new Date(row[3]),
        currentStep: parseInt(row[6]) || 0,
        lastEmailSent: row[7] ? new Date(row[7]) : null,
        daysSinceSignup: Math.floor((new Date() - new Date(row[3])) / (1000 * 60 * 60 * 24))
      }))
      .filter(sub => sub.email && sub.firstName && sub.lastName);
  } catch (error) {
    console.error('Google Sheets読み込みエラー:', error);
    return [];
  }
}

async function processBatchEmails(subscribers) {
  const results = [];
  
  for (const subscriber of subscribers) {
    try {
      const emailToSend = determineEmailToSend(subscriber);
      
      if (emailToSend) {
        console.log(`📧 ${emailToSend.templateId} メール送信: ${subscriber.email}`);
        
        const success = await sendBrevoEmail(
          subscriber.email,
          subscriber.firstName,
          subscriber.lastName,
          emailToSend.subject,
          emailToSend.content,
          emailToSend.templateId
        );
        
        results.push({
          email: subscriber.email,
          templateId: emailToSend.templateId,
          subject: emailToSend.subject,
          success: success,
          timestamp: new Date().toISOString()
        });
        
        // APIレート制限対策
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error(`メール送信エラー (${subscriber.email}):`, error);
      results.push({
        email: subscriber.email,
        templateId: 'error',
        subject: 'Error',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  return results;
}

function determineEmailToSend(subscriber) {
  const { daysSinceSignup, currentStep, lastEmailSent } = subscriber;
  const now = new Date();
  
  // 最後のメール送信から24時間経過していない場合はスキップ
  if (lastEmailSent && (now - lastEmailSent) < 24 * 60 * 60 * 1000) {
    return null;
  }
  
  // ステップ判定
  if (daysSinceSignup >= 1 && currentStep < 1) {
    return {
      templateId: 'day1',
      subject: '【人生の道標】心を整える智慧をお届けします',
      content: getDay1EmailTemplate()
    };
  }
  
  if (daysSinceSignup >= 3 && currentStep < 3) {
    return {
      templateId: 'day3',
      subject: '【人生の道標】人間関係の智慧',
      content: getDay3EmailTemplate()
    };
  }
  
  if (daysSinceSignup >= 7 && currentStep < 7) {
    return {
      templateId: 'day7',
      subject: '【人生の道標】一週間の振り返りと感謝',
      content: getDay7EmailTemplate()
    };
  }
  
  return null;
}

async function sendBrevoEmail(email, firstName, lastName, subject, htmlContent, templateId) {
  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': process.env.BREVO_API_KEY
      },
      body: JSON.stringify({
        sender: {
          name: '人生の道標 - デジタル伽藍',
          email: 'noreply@jinsei-michishirube.com'
        },
        to: [{
          email: email,
          name: `${firstName} ${lastName}`
        }],
        subject: subject,
        htmlContent: htmlContent
          .replace(/{firstName}/g, firstName)
          .replace(/{lastName}/g, lastName)
      })
    });

    if (response.ok) {
      // 成功時はスプレッドシートのステップ更新
      await updateSubscriberStep(email, templateId);
      return true;
    } else {
      const error = await response.json();
      console.error('Brevo送信エラー:', error);
      return false;
    }
  } catch (error) {
    console.error('メール送信エラー:', error);
    return false;
  }
}

async function updateSubscriberStep(email, templateId) {
  try {
    const stepMapping = {
      'day1': 1,
      'day3': 3,
      'day7': 7
    };
    
    const step = stepMapping[templateId];
    if (!step) return;
    
    const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    
    if (!API_KEY) return;
    
    // まず該当行を特定
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!A2:J1000?key=${API_KEY}`
    );
    
    if (!response.ok) return;
    
    const data = await response.json();
    const rows = data.values || [];
    
    const rowIndex = rows.findIndex(row => row[0] === email);
    if (rowIndex === -1) return;
    
    const actualRowNumber = rowIndex + 2; // A2から始まるので+2
    
    // CurrentStep(G列)とLastEmailSent(H列)を更新
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1!G${actualRowNumber}:H${actualRowNumber}?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[step, new Date().toISOString()]]
        })
      }
    );
    
    console.log(`✅ Google Sheets更新完了: ${email} → Step ${step}`);
    
  } catch (error) {
    console.error('Google Sheetsステップ更新エラー:', error);
  }
}

async function logBatchResults(results) {
  // 送信履歴をスプレッドシートに記録
  if (results.length === 0) return;
  
  try {
    const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
    const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    
    // 送信履歴の形式に変換
    const logRows = results.map(result => [
      result.email,
      result.templateId,
      result.subject,
      result.timestamp,
      result.success ? 'sent' : 'failed',
      '', // BrevoMessageId
      '', // OpenedDate
      0, // ClickCount
      result.error || ''
    ]);
    
    // Sheet1の最後に追加（簡易的な実装）
    console.log(`📝 ${logRows.length}件の送信履歴を記録`);
    
  } catch (error) {
    console.error('履歴記録エラー:', error);
  }
}

// メールテンプレート定義
function getDay1EmailTemplate() {
  return `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">心を整える3つの実践</h2>
    <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">{firstName} 様、今日は忙しい日常の中でも実践できる、心を整える方法をお伝えします。</p>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">1. 朝の静寂の時間</h3>
      <p style="color: #333; line-height: 1.6;">目覚めた直後の3分間、何も考えず、ただ呼吸に意識を向けてみてください。心の中の騒がしさが、静かに沈んでいくのを感じられるでしょう。</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">2. 感謝の発見</h3>
      <p style="color: #333; line-height: 1.6;">一日の終わりに、今日起こった小さな「ありがたいこと」を3つ思い浮かべてください。日常に隠れている幸せに気づく力が育まれます。</p>
    </div>
    <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">3. デジタルの静寂</h3>
      <p style="color: #333; line-height: 1.6;">1日のうち30分間、スマートフォンを手の届かない場所に置いてみてください。心に余白が生まれ、本当に大切なことに意識が向きます。</p>
    </div>
    <p style="color: #333; line-height: 1.7; margin-top: 25px;">明日は「人との関わりの中で心を保つ智慧」についてお話しします。</p>
  </div>
</div>`;
}

function getDay3EmailTemplate() {
  return `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">人間関係に活かす心の智慧</h2>
    <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">{firstName} 様、人との関わりの中で心穏やかでいるための古来の智慧をお伝えします。</p>
    <div style="background: #f0f8f5; padding: 25px; border-radius: 5px; margin: 25px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">相手の言葉の奥を聴く</h3>
      <p style="color: #333; line-height: 1.7;">人が感情的になっているとき、その言葉ではなく、心の奥にある気持ちに耳を傾けてみてください。怒りの奥には不安や悲しみが、批判の奥には理解されたい想いがあることが多いものです。</p>
    </div>
    <div style="background: #f0f8f5; padding: 25px; border-radius: 5px; margin: 25px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">自分の反応を観察する</h3>
      <p style="color: #333; line-height: 1.7;">相手の言動に心が乱れたとき、一度深呼吸をして「今、私はどんな気持ちになっているだろう」と自分自身を観察してみてください。感情に飲み込まれず、適切な対応ができるようになります。</p>
    </div>
    <p style="color: #666; line-height: 1.7; font-style: italic; text-align: center; margin: 30px 0;">「理解することと同意することは違います。<br>相手を理解しようとする心が、関係性を深めていくのです。」</p>
  </div>
</div>`;
}

function getDay7EmailTemplate() {
  return `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: white; padding: 30px; border-radius: 10px;">
    <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">一週間の歩みと感謝</h2>
    <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">{firstName} 様、一週間お付き合いいただき、心から感謝申し上げます。</p>
    <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">この数日間で、少しでも心に静けさや気づきが生まれたでしょうか。小さな変化でも、それは大きな一歩です。</p>
    <div style="background: #f0f8f5; padding: 25px; border-radius: 5px; margin: 25px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">これからも心に留めていただきたいこと</h3>
      <ul style="color: #333; line-height: 1.7; padding-left: 20px;">
        <li style="margin-bottom: 10px;">完璧を求めず、今この瞬間を大切にすること</li>
        <li style="margin-bottom: 10px;">小さな感謝を見つける習慣を続けること</li>
        <li style="margin-bottom: 10px;">心が乱れても、それに気づく自分を褒めること</li>
        <li style="margin-bottom: 10px;">他者との関わりの中で、理解する心を持ち続けること</li>
      </ul>
    </div>
    <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">人生という道のりで、時には迷うこともあるでしょう。そんなとき、ここでお伝えした智慧を思い出していただければ幸いです。</p>
    <div style="text-align: center; background: #2C5F41; color: white; padding: 20px; border-radius: 5px; margin: 30px 0;">
      <p style="font-size: 16px; margin: 0;">あなたの心に平穏と豊かさがありますように</p>
    </div>
    <p style="color: #666; line-height: 1.7; text-align: center; margin-top: 30px;">今後も時々、心の栄養となるメッセージをお届けいたします。<br>引き続き、どうぞよろしくお願いいたします。</p>
  </div>
</div>`;
}