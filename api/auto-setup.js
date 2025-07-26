// 完全自動セットアップ - ユーザーは何もしなくていい
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 1. Google Sheetsスプレッドシート自動作成
    const spreadsheetResult = await createGoogleSpreadsheet();
    
    // 2. 必要なシートを自動作成
    await setupAllSheets(spreadsheetResult.spreadsheetId);
    
    // 3. 初期データ投入
    await addInitialData(spreadsheetResult.spreadsheetId);
    
    return res.status(200).json({
      success: true,
      message: 'システム自動セットアップ完了',
      data: {
        spreadsheetId: spreadsheetResult.spreadsheetId,
        spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetResult.spreadsheetId}/edit`,
        setupTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('自動セットアップエラー:', error);
    return res.status(500).json({
      error: 'セットアップ失敗',
      message: error.message
    });
  }
}

async function createGoogleSpreadsheet() {
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  
  if (!GOOGLE_SHEETS_API_KEY) {
    throw new Error('GOOGLE_SHEETS_API_KEY環境変数が必要です');
  }

  // Google Sheets API で新しいスプレッドシートを作成
  const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GOOGLE_SHEETS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: '人生の道標メルマガ管理システム_' + new Date().toISOString().split('T')[0]
      },
      sheets: [
        {
          properties: {
            title: '登録者リスト',
            gridProperties: {
              rowCount: 1000,
              columnCount: 10
            }
          }
        }
      ]
    })
  });

  if (!createResponse.ok) {
    throw new Error(`スプレッドシート作成失敗: ${createResponse.status}`);
  }

  return await createResponse.json();
}

async function setupAllSheets(spreadsheetId) {
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

  // 登録者リストのヘッダー設定
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/登録者リスト!A1:J1?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[
        'Email', 'FirstName', 'LastName', 'SignupDate', 'Source',
        'Status', 'CurrentStep', 'LastEmailSent', 'TotalEmailsSent', 'Tags'
      ]]
    })
  });

  // メールテンプレートシート追加
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate?key=${GOOGLE_SHEETS_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: 'メールテンプレート',
              gridProperties: {
                rowCount: 100,
                columnCount: 7
              }
            }
          }
        },
        {
          addSheet: {
            properties: {
              title: '送信履歴',
              gridProperties: {
                rowCount: 1000,
                columnCount: 9
              }
            }
          }
        }
      ]
    })
  });

  // メールテンプレートのヘッダー設定
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/メールテンプレート!A1:G1?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[
        'TemplateID', 'Subject', 'Content', 'StepNumber', 'Status', 'LastModified', 'SendCount'
      ]]
    })
  });

  // 送信履歴のヘッダー設定
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/送信履歴!A1:I1?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: [[
        'Email', 'TemplateID', 'Subject', 'SentDate', 'Status', 'BrevoMessageId', 'OpenedDate', 'ClickCount', 'Error'
      ]]
    })
  });
}

async function addInitialData(spreadsheetId) {
  const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;

  // 初期メールテンプレート追加
  const templates = [
    [
      'welcome',
      '【人生の道標】ご登録ありがとうございます',
      getWelcomeEmailTemplate(),
      0,
      'active',
      new Date().toISOString(),
      0
    ],
    [
      'day1',
      '【人生の道標】心を整える智慧をお届けします',
      getDay1EmailTemplate(),
      1,
      'active',
      new Date().toISOString(),
      0
    ],
    [
      'day3',
      '【人生の道標】人間関係の智慧',
      getDay3EmailTemplate(),
      3,
      'active',
      new Date().toISOString(),
      0
    ],
    [
      'day7',
      '【人生の道標】一週間の振り返りと感謝',
      getDay7EmailTemplate(),
      7,
      'active',
      new Date().toISOString(),
      0
    ]
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/メールテンプレート!A2:G5?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      values: templates
    })
  });
}

function getWelcomeEmailTemplate() {
  return `<div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
  <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #2C5F41; font-size: 24px; margin-bottom: 10px;">🧘‍♂️ 人生の道標</h1>
      <p style="color: #666; font-size: 16px;">心の平穏へのご案内</p>
    </div>
    <h2 style="color: #2C5F41; font-size: 18px; margin-bottom: 15px;">{firstName} {lastName} 様</h2>
    <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">「人生の道標」へのご登録、心より感謝申し上げます。</p>
    <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">これから数日間、あなたの心を豊かにする古来の智慧を、現代の生活に活かせる形でお届けいたします。</p>
    <div style="background: #f0f8f5; padding: 20px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #2C5F41;">
      <p style="color: #2C5F41; font-weight: bold; margin-bottom: 10px;">これからお届けする内容</p>
      <ul style="color: #333; line-height: 1.6;">
        <li>心を整える実践的な方法</li>
        <li>人間関係に活かせる智慧</li>
        <li>日常の小さな気づき</li>
        <li>感謝と平穏の見つけ方</li>
      </ul>
    </div>
    <p style="color: #333; line-height: 1.7;">一緒に、心穏やかな毎日を築いていきましょう。</p>
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #888; font-size: 12px;">人生の道標 | デジタル伽藍</p>
    </div>
  </div>
</div>`;
}

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