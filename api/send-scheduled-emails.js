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
      const emailToSend = await determineEmailToSend(subscriber);
      
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

async function determineEmailToSend(subscriber) {
  const { daysSinceSignup, currentStep, lastEmailSent } = subscriber;
  const now = new Date();
  
  // 最後のメール送信から24時間経過していない場合はスキップ
  if (lastEmailSent && (now - lastEmailSent) < 24 * 60 * 60 * 1000) {
    return null;
  }
  
  // ステップ判定とGoogle Sheetsからテンプレート取得
  if (daysSinceSignup >= 1 && currentStep < 1) {
    const template = await getEmailTemplate('day1');
    return {
      templateId: 'day1',
      subject: template.subject,
      content: await getDay1EmailTemplate()
    };
  }
  
  if (daysSinceSignup >= 3 && currentStep < 3) {
    const template = await getEmailTemplate('day3');
    return {
      templateId: 'day3',
      subject: template.subject,
      content: await getDay3EmailTemplate()
    };
  }
  
  if (daysSinceSignup >= 7 && currentStep < 7) {
    const template = await getEmailTemplate('day7');
    return {
      templateId: 'day7',
      subject: template.subject,
      content: await getDay7EmailTemplate()
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

// Google Sheetsからメールテンプレート取得
async function getEmailTemplate(templateId) {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  
  if (!API_KEY) {
    console.warn('Google Sheets API key not configured, using fallback templates');
    return getFallbackTemplate(templateId);
  }
  
  try {
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Email_Templates!A2:N10?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    // 指定されたテンプレートIDを検索
    const templateRow = rows.find(row => row[0] === templateId);
    
    if (!templateRow) {
      console.warn(`Template ${templateId} not found in Google Sheets, using fallback`);
      return getFallbackTemplate(templateId);
    }
    
    return {
      templateId: templateRow[0],
      subject: templateRow[1] || '',
      previewText: templateRow[2] || '',
      headerTitle: templateRow[3] || '',
      mainContent: templateRow[4] || '',
      section1Title: templateRow[5] || '',
      section1Content: templateRow[6] || '',
      section2Title: templateRow[7] || '',
      section2Content: templateRow[8] || '',
      section3Title: templateRow[9] || '',
      section3Content: templateRow[10] || '',
      closingMessage: templateRow[11] || '',
      status: templateRow[12] || 'active',
      lastUpdated: templateRow[13] || ''
    };
    
  } catch (error) {
    console.error('Failed to fetch template from Google Sheets:', error);
    return getFallbackTemplate(templateId);
  }
}

// HTMLコンテンツ生成（Google Sheetsのテンプレートから）
function generateHtmlFromTemplate(template, firstName, lastName) {
  let html = `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: white; padding: 30px; border-radius: 10px;">`;
  
  // ヘッダータイトル
  if (template.headerTitle) {
    html += `<h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">${template.headerTitle}</h2>`;
  }
  
  // メインコンテンツ
  if (template.mainContent) {
    const content = template.mainContent
      .replace(/{firstName}/g, firstName)
      .replace(/{lastName}/g, lastName)
      .replace(/\n/g, '<br>');
    html += `<p style="color: #333; line-height: 1.7; margin-bottom: 25px;">${content}</p>`;
  }
  
  // セクション1
  if (template.section1Title && template.section1Content) {
    html += `<div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">${template.section1Title}</h3>
      <p style="color: #333; line-height: 1.6;">${template.section1Content.replace(/\n/g, '<br>')}</p>
    </div>`;
  }
  
  // セクション2
  if (template.section2Title && template.section2Content) {
    html += `<div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">${template.section2Title}</h3>
      <p style="color: #333; line-height: 1.6;">${template.section2Content.replace(/\n/g, '<br>')}</p>
    </div>`;
  }
  
  // セクション3
  if (template.section3Title && template.section3Content) {
    html += `<div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
      <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">${template.section3Title}</h3>
      <p style="color: #333; line-height: 1.6;">${template.section3Content.replace(/\n/g, '<br>')}</p>
    </div>`;
  }
  
  // 締めの言葉
  if (template.closingMessage) {
    html += `<p style="color: #333; line-height: 1.7; margin-top: 25px;">${template.closingMessage.replace(/\n/g, '<br>')}</p>`;
  }
  
  html += `</div></div>`;
  
  return html;
}

// フォールバックテンプレート（Google Sheets接続失敗時用）
function getFallbackTemplate(templateId) {
  const fallbackTemplates = {
    day1: {
      templateId: 'day1',
      subject: '【人生の道標】心を整える智慧をお届けします',
      headerTitle: '心を整える3つの実践',
      mainContent: '{firstName} 様、今日は忙しい日常の中でも実践できる、心を整える方法をお伝えします。',
      section1Title: '1. 朝の静寂の時間',
      section1Content: '目覚めた直後の3分間、何も考えず、ただ呼吸に意識を向けてみてください。',
      section2Title: '2. 感謝の発見',
      section2Content: '一日の終わりに、今日起こった小さな「ありがたいこと」を3つ思い浮かべてください。',
      section3Title: '3. デジタルの静寂',
      section3Content: '1日のうち30分間、スマートフォンを手の届かない場所に置いてみてください。',
      closingMessage: '明日は「人との関わりの中で心を保つ智慧」についてお話しします。'
    },
    day3: {
      templateId: 'day3',
      subject: '【人生の道標】人間関係の智慧',
      headerTitle: '人間関係に活かす心の智慧',
      mainContent: '{firstName} 様、人との関わりの中で心穏やかでいるための古来の智慧をお伝えします。',
      section1Title: '相手の言葉の奥を聴く',
      section1Content: '人が感情的になっているとき、その言葉ではなく、心の奥にある気持ちに耳を傾けてみてください。',
      section2Title: '自分の反応を観察する',
      section2Content: '相手の言動に心が乱れたとき、一度深呼吸をして自分自身を観察してみてください。',
      closingMessage: '「理解することと同意することは違います。相手を理解しようとする心が、関係性を深めていくのです。」'
    },
    day7: {
      templateId: 'day7',
      subject: '【人生の道標】一週間の振り返りと感謝',
      headerTitle: '一週間の歩みと感謝',
      mainContent: '{firstName} 様、一週間お付き合いいただき、心から感謝申し上げます。',
      section1Title: 'これからも心に留めていただきたいこと',
      section1Content: '・完璧を求めず、今この瞬間を大切にすること\n・小さな感謝を見つける習慣を続けること',
      closingMessage: '今後も時々、心の栄養となるメッセージをお届けいたします。'
    }
  };
  
  return fallbackTemplates[templateId] || fallbackTemplates.day1;
}

// 既存の関数をGoogle Sheets連携版に置き換え
async function getDay1EmailTemplate() {
  const template = await getEmailTemplate('day1');
  return generateHtmlFromTemplate(template, '{firstName}', '{lastName}');
}

async function getDay3EmailTemplate() {
  const template = await getEmailTemplate('day3');
  return generateHtmlFromTemplate(template, '{firstName}', '{lastName}');
}

async function getDay7EmailTemplate() {
  const template = await getEmailTemplate('day7');
  return generateHtmlFromTemplate(template, '{firstName}', '{lastName}');
}