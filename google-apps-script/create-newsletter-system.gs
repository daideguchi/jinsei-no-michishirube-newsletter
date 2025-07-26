/**
 * 人生の道標 - メルマガ管理システム (Google Apps Script)
 * スプレッドシート自動作成とBrevo連携システム
 */

// 設定定数
const CONFIG = {
  BREVO_API_KEY: 'YOUR_BREVO_API_KEY', // PropertiesServiceで設定
  SPREADSHEET_NAME: '人生の道標メルマガ管理システム',
  BREVO_LIST_ID: 2,
  SENDER_EMAIL: 'YOUR_VERIFIED_EMAIL@domain.com', // Brevoで認証済みのメールアドレス
  SENDER_NAME: '人生の道標'
};

/**
 * メイン実行関数 - スプレッドシート作成
 */
function createNewsletterSystem() {
  console.log('📊 メルマガ管理システム作成開始...');
  
  // 1. スプレッドシート作成
  const spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  const spreadsheetId = spreadsheet.getId();
  
  console.log('✅ スプレッドシート作成完了');
  console.log('🔗 URL:', `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  
  // 2. シート構成
  createSubscribersSheet(spreadsheet);
  createEmailTemplatesSheet(spreadsheet);
  createSendHistorySheet(spreadsheet);
  createDashboardSheet(spreadsheet);
  
  // 3. 初期データ投入
  setupInitialData(spreadsheet);
  
  // 4. トリガー設定
  setupTriggers(spreadsheetId);
  
  console.log('🎉 メルマガ管理システム構築完了！');
  console.log('📋 次のステップ:');
  console.log('1. PropertiesServiceでBrevo API KEYを設定');
  console.log('2. 送信者メールアドレスを認証済みのものに変更');
  console.log('3. Webhook URLをVercelに設定');
  
  return spreadsheetId;
}

/**
 * 登録者管理シート作成
 */
function createSubscribersSheet(spreadsheet) {
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('登録者リスト');
  
  // ヘッダー設定
  const headers = [
    'Email', 'FirstName', 'LastName', 'SignupDate', 'Source',
    'Status', 'ListName', 'StepStatus', 'LastEmailSent', 'Tags', 'Notes'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#e8f4fd');
  
  // 列幅調整
  sheet.autoResizeColumns(1, headers.length);
  
  console.log('✅ 登録者管理シート作成完了');
}

/**
 * メールテンプレートシート作成
 */
function createEmailTemplatesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('メールテンプレート');
  
  const headers = [
    'TemplateID', 'Subject', 'Content', 'SendTiming', 
    'Status', 'LastModified', 'OpenRate', 'ClickRate'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#fff2cc');
  
  // 初期テンプレート
  const templates = [
    [
      'welcome_email',
      '【人生の道標】ご登録ありがとうございます',
      getWelcomeEmailTemplate(),
      'day0',
      'active',
      new Date(),
      '',
      ''
    ],
    [
      'day1_mindfulness',
      '【Day1】心を整える3つの方法',
      getDay1EmailTemplate(),
      'day1',
      'active',
      new Date(),
      '',
      ''
    ]
  ];
  
  sheet.getRange(2, 1, templates.length, headers.length).setValues(templates);
  sheet.autoResizeColumns(1, headers.length);
  
  console.log('✅ メールテンプレートシート作成完了');
}

/**
 * 送信履歴シート作成
 */
function createSendHistorySheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('送信履歴');
  
  const headers = [
    'Email', 'TemplateID', 'Subject', 'SentDate', 'Status',
    'OpenedDate', 'ClickedLinks', 'BrevoMessageId', 'Error'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  sheet.getRange(1, 1, 1, headers.length).setBackground('#f4cccc');
  
  sheet.autoResizeColumns(1, headers.length);
  
  console.log('✅ 送信履歴シート作成完了');
}

/**
 * ダッシュボードシート作成
 */
function createDashboardSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('ダッシュボード');
  
  // ダッシュボード用の集計関数を設定
  const dashboardData = [
    ['📊 人生の道標 メルマガ管理ダッシュボード', '', '', ''],
    ['', '', '', ''],
    ['📈 統計情報', '', '', ''],
    ['総登録者数', '=COUNTA(登録者リスト!A:A)-1', '', ''],
    ['アクティブ登録者', '=COUNTIF(登録者リスト!F:F,"active")', '', ''],
    ['今日の新規登録', '=COUNTIF(登録者リスト!D:D,TODAY())', '', ''],
    ['', '', '', ''],
    ['📧 メール配信状況', '', '', ''],
    ['総送信数', '=COUNTA(送信履歴!A:A)-1', '', ''],
    ['成功送信', '=COUNTIF(送信履歴!E:E,"sent")', '', ''],
    ['失敗送信', '=COUNTIF(送信履歴!E:E,"failed")', '', ''],
    ['', '', '', ''],
    ['🎯 次のアクション', '', '', ''],
    ['ウェルカムメール待ち', '=COUNTIF(登録者リスト!H:H,"pending")', '', ''],
    ['Day1メール待ち', '=COUNTIF(登録者リスト!H:H,"welcome_sent")', '', '']
  ];
  
  sheet.getRange(1, 1, dashboardData.length, 4).setValues(dashboardData);
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold');
  sheet.getRange(3, 1).setFontWeight('bold').setBackground('#e8f4fd');
  sheet.getRange(8, 1).setFontWeight('bold').setBackground('#fff2cc');
  sheet.getRange(13, 1).setFontWeight('bold').setBackground('#d9ead3');
  
  console.log('✅ ダッシュボードシート作成完了');
}

/**
 * 初期データ設定
 */
function setupInitialData(spreadsheet) {
  // サンプル登録者データ
  const subscribersSheet = spreadsheet.getSheetByName('登録者リスト');
  const sampleData = [
    [
      'test@example.com', 'テスト', '太郎', new Date(), 'newsletter_form',
      'active', 'main_list', 'pending', '', '管理職,仏教', ''
    ]
  ];
  
  if (sampleData.length > 0) {
    subscribersSheet.getRange(2, 1, sampleData.length, 11).setValues(sampleData);
  }
  
  console.log('✅ 初期データ設定完了');
}

/**
 * Webhook受信処理 - 新規登録者追加
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { firstName, lastName, email, source = 'newsletter_form' } = data;
    
    if (!email || !firstName || !lastName) {
      throw new Error('必須フィールドが不足しています');
    }
    
    // スプレッドシートに追加
    addSubscriber(email, firstName, lastName, source);
    
    // Brevoに追加
    addToBrevo(email, firstName, lastName);
    
    // ウェルカムメール送信
    sendWelcomeEmail(email, firstName, lastName);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '登録完了',
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('Webhook処理エラー:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * スプレッドシートに登録者追加
 */
function addSubscriber(email, firstName, lastName, source) {
  const spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const sheet = spreadsheet.getSheetByName('登録者リスト');
  
  const newRow = [
    email, firstName, lastName, new Date(), source,
    'active', 'main_list', 'pending', '', '', ''
  ];
  
  sheet.appendRow(newRow);
  console.log(`✅ 登録者追加: ${email}`);
}

/**
 * Brevoに連絡先追加
 */
function addToBrevo(email, firstName, lastName) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
  
  if (!apiKey) {
    throw new Error('Brevo API KEYが設定されていません');
  }
  
  const payload = {
    email: email,
    attributes: {
      FIRSTNAME: firstName,
      LASTNAME: lastName,
      SIGNUP_DATE: new Date().toISOString().split('T')[0],
      SOURCE: 'newsletter_form'
    },
    listIds: [CONFIG.BREVO_LIST_ID],
    updateEnabled: true
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    payload: JSON.stringify(payload)
  };
  
  const response = UrlFetchApp.fetch('https://api.brevo.com/v3/contacts', options);
  console.log(`✅ Brevo追加: ${email}, Status: ${response.getResponseCode()}`);
}

/**
 * ウェルカムメール送信
 */
function sendWelcomeEmail(email, firstName, lastName) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
  const senderEmail = PropertiesService.getScriptProperties().getProperty('SENDER_EMAIL');
  
  if (!apiKey || !senderEmail) {
    throw new Error('API設定が不完全です');
  }
  
  const emailData = {
    sender: {
      name: CONFIG.SENDER_NAME,
      email: senderEmail
    },
    to: [{
      email: email,
      name: `${firstName} ${lastName}`
    }],
    subject: '【人生の道標】ご登録ありがとうございます',
    htmlContent: getWelcomeEmailTemplate().replace('{firstName}', firstName).replace('{lastName}', lastName)
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    payload: JSON.stringify(emailData)
  };
  
  const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
  
  // 送信履歴に記録
  logEmailSent(email, 'welcome_email', '【人生の道標】ご登録ありがとうございます', response.getResponseCode());
  
  // 登録者のステータス更新
  updateSubscriberStatus(email, 'welcome_sent');
  
  console.log(`✅ ウェルカムメール送信: ${email}, Status: ${response.getResponseCode()}`);
}

/**
 * メール送信履歴記録
 */
function logEmailSent(email, templateId, subject, status) {
  const spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const sheet = spreadsheet.getSheetByName('送信履歴');
  
  const newRow = [
    email, templateId, subject, new Date(),
    status === 200 ? 'sent' : 'failed',
    '', '', '', status !== 200 ? `HTTP ${status}` : ''
  ];
  
  sheet.appendRow(newRow);
}

/**
 * 登録者ステータス更新
 */
function updateSubscriberStatus(email, newStatus) {
  const spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const sheet = spreadsheet.getSheetByName('登録者リスト');
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      sheet.getRange(i + 1, 8).setValue(newStatus); // StepStatus列
      sheet.getRange(i + 1, 9).setValue(new Date()); // LastEmailSent列
      break;
    }
  }
}

/**
 * ウェルカムメールテンプレート
 */
function getWelcomeEmailTemplate() {
  return `
    <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2C5F41; font-size: 24px; margin-bottom: 10px;">🧘‍♂️ 人生の道標</h1>
        <p style="color: #666; font-size: 16px;">デジタル伽藍からの智慧</p>
      </div>
      
      <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
        <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 15px;">{firstName} {lastName} 様</h2>
        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
          「人生の道標」メルマガへのご登録、誠にありがとうございます。
        </p>
        <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
          <strong>明日の朝10時</strong>から、7日間連続であなたの心を豊かにする智慧をお送りします。
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 30px;">
        <p style="color: #666; font-size: 12px;">
          このメールは人生の道標メルマガシステムから送信されています。
        </p>
      </div>
    </div>
  `;
}

/**
 * Day1メールテンプレート
 */
function getDay1EmailTemplate() {
  return `
    <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #2C5F41;">【Day1】心を整える3つの方法</h2>
      <p>今日から始める心の整理術をご紹介します。</p>
      <ol>
        <li><strong>朝の3分瞑想</strong>: 一日の始まりを静寂で</li>
        <li><strong>感謝日記</strong>: 小さな幸せを記録</li>
        <li><strong>デジタルデトックス時間</strong>: 心の余白を作る</li>
      </ol>
      <p>明日は「人間関係の智慧」についてお話しします。</p>
    </div>
  `;
}

/**
 * トリガー設定
 */
function setupTriggers(spreadsheetId) {
  // 既存のトリガーを削除
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(trigger => {
    ScriptApp.deleteTrigger(trigger);
  });
  
  // 日次メール配信トリガー (毎日10時)
  ScriptApp.newTrigger('sendDailyEmails')
    .timeBased()
    .everyDays(1)
    .atHour(10)
    .create();
    
  console.log('✅ トリガー設定完了');
}

/**
 * 日次メール配信処理
 */
function sendDailyEmails() {
  console.log('📧 日次メール配信開始...');
  
  const spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const sheet = spreadsheet.getSheetByName('登録者リスト');
  
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    const [email, firstName, lastName, , , status, , stepStatus] = data[i];
    
    if (status === 'active') {
      // ステップに応じてメール送信
      if (stepStatus === 'welcome_sent') {
        // Day1メール送信
        sendStepEmail(email, firstName, lastName, 'day1_mindfulness');
        updateSubscriberStatus(email, 'day1_sent');
      }
      // 他のステップも同様に処理...
    }
  }
  
  console.log('✅ 日次メール配信完了');
}

/**
 * ステップメール送信
 */
function sendStepEmail(email, firstName, lastName, templateId) {
  // メールテンプレートシートからテンプレートを取得
  const spreadsheet = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID');
  const templateSheet = spreadsheet.getSheetByName('メールテンプレート');
  
  const templates = templateSheet.getDataRange().getValues();
  
  for (let i = 1; i < templates.length; i++) {
    if (templates[i][0] === templateId && templates[i][4] === 'active') {
      const subject = templates[i][1];
      const content = templates[i][2];
      
      // メール送信処理
      sendEmailViaBrevo(email, firstName, lastName, subject, content, templateId);
      break;
    }
  }
}

/**
 * Brevo経由メール送信
 */
function sendEmailViaBrevo(email, firstName, lastName, subject, content, templateId) {
  const apiKey = PropertiesService.getScriptProperties().getProperty('BREVO_API_KEY');
  const senderEmail = PropertiesService.getScriptProperties().getProperty('SENDER_EMAIL');
  
  const emailData = {
    sender: {
      name: CONFIG.SENDER_NAME,
      email: senderEmail
    },
    to: [{
      email: email,
      name: `${firstName} ${lastName}`
    }],
    subject: subject,
    htmlContent: content.replace('{firstName}', firstName).replace('{lastName}', lastName)
  };
  
  const options = {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'api-key': apiKey
    },
    payload: JSON.stringify(emailData)
  };
  
  const response = UrlFetchApp.fetch('https://api.brevo.com/v3/smtp/email', options);
  
  // 送信履歴に記録
  logEmailSent(email, templateId, subject, response.getResponseCode());
  
  console.log(`✅ ステップメール送信: ${email}, Template: ${templateId}`);
}

/**
 * 設定用関数 - 実行してください
 */
function setupProperties() {
  const properties = PropertiesService.getScriptProperties();
  
  // 以下の値を実際の値に置き換えて実行
  properties.setProperties({
    'BREVO_API_KEY': 'YOUR_ACTUAL_BREVO_API_KEY',
    'SENDER_EMAIL': 'YOUR_VERIFIED_EMAIL@domain.com'
  });
  
  console.log('✅ プロパティ設定完了');
}