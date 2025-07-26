/**
 * 人生の道標 - 最小構成メルマガ管理システム (Google Apps Script)
 * 基本設定のみ - スケジューリングは外部システム（n8n/Vercel）で制御
 */

// 設定定数
const CONFIG = {
  SPREADSHEET_NAME: '人生の道標メルマガ管理システム',
  BREVO_LIST_ID: 2
};

/**
 * 🎯 メイン実行関数 - 一度だけ実行してください
 * スプレッドシートとWebhook URLを自動生成
 */
function setupNewsletterSystem() {
  console.log('📊 メルマガ管理システム初期設定開始...');
  
  // 1. スプレッドシート作成
  const spreadsheet = SpreadsheetApp.create(CONFIG.SPREADSHEET_NAME);
  const spreadsheetId = spreadsheet.getId();
  
  // 2. シート構成
  createAllSheets(spreadsheet);
  
  // 3. このスクリプトをWebアプリとして公開
  const webappUrl = getWebAppUrl();
  
  console.log('🎉 セットアップ完了！');
  console.log('📋 重要な情報:');
  console.log(`🔗 スプレッドシートURL: https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log(`🔗 Webhook URL: ${webappUrl}`);
  console.log('');
  console.log('📝 次のステップ:');
  console.log('1. PropertiesServiceでBrevo設定を実行: setupBrevoProperties()');
  console.log('2. Webhook URLをVercelの環境変数に設定');
  console.log('3. n8nでスケジューリング設定');
  console.log('4. あとは完全自動で動作します');
  
  // プロパティにスプレッドシートIDを保存
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', spreadsheetId);
  
  return {
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`,
    webhookUrl: webappUrl
  };
}

/**
 * 全シート作成
 */
function createAllSheets(spreadsheet) {
  // 1. 登録者リスト
  createSubscribersSheet(spreadsheet);
  
  // 2. メールテンプレート
  createEmailTemplatesSheet(spreadsheet);
  
  // 3. 送信履歴
  createSendHistorySheet(spreadsheet);
  
  // 4. 自動ダッシュボード
  createAutoDashboard(spreadsheet);
  
  console.log('✅ 全シート作成完了');
}

/**
 * 登録者管理シート（自動更新）
 */
function createSubscribersSheet(spreadsheet) {
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('登録者リスト');
  
  const headers = [
    'Email', 'FirstName', 'LastName', 'SignupDate', 'Source',
    'Status', 'CurrentStep', 'LastEmailSent', 'TotalEmailsSent', 'Tags'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#4285f4')
    .setFontColor('white');
  
  // 自動フィルター設定
  sheet.getRange(1, 1, 1000, headers.length).createFilter();
  
  // 条件付き書式（アクティブ/非アクティブ）
  const statusRange = sheet.getRange('F2:F1000');
  const activeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('active')
    .setBackground('#d9ead3')
    .setRanges([statusRange])
    .build();
  
  const inactiveRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('unsubscribed')
    .setBackground('#f4cccc')
    .setRanges([statusRange])
    .build();
  
  sheet.setConditionalFormatRules([activeRule, inactiveRule]);
  
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * メールテンプレート管理シート
 */
function createEmailTemplatesSheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('メールテンプレート');
  
  const headers = [
    'TemplateID', 'Subject', 'Content', 'StepNumber', 
    'Status', 'LastModified', 'SendCount'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#34a853')
    .setFontColor('white');
  
  // 初期テンプレート（汎用的な内容）
  const templates = [
    [
      'welcome',
      '【人生の道標】ご登録ありがとうございます',
      getWelcomeTemplate(),
      0,
      'active',
      new Date(),
      '=COUNTIF(送信履歴!B:B,"welcome")'
    ],
    [
      'day1',
      '【人生の道標】心を整える智慧をお届けします',
      getDay1Template(),
      1,
      'active',
      new Date(),
      '=COUNTIF(送信履歴!B:B,"day1")'
    ],
    [
      'day3',
      '【人生の道標】人間関係の智慧',
      getDay3Template(),
      3,
      'active',
      new Date(),
      '=COUNTIF(送信履歴!B:B,"day3")'
    ],
    [
      'day7',
      '【人生の道標】一週間の振り返りと感謝',
      getDay7Template(),
      7,
      'active',
      new Date(),
      '=COUNTIF(送信履歴!B:B,"day7")'
    ]
  ];
  
  sheet.getRange(2, 1, templates.length, headers.length).setValues(templates);
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 送信履歴シート（完全自動）
 */
function createSendHistorySheet(spreadsheet) {
  const sheet = spreadsheet.insertSheet('送信履歴');
  
  const headers = [
    'Email', 'TemplateID', 'Subject', 'SentDate', 'Status',
    'BrevoMessageId', 'OpenedDate', 'ClickCount', 'Error'
  ];
  
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length)
    .setFontWeight('bold')
    .setBackground('#ea4335')
    .setFontColor('white');
  
  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 自動ダッシュボード（全て数式で自動更新）
 */
function createAutoDashboard(spreadsheet) {
  const sheet = spreadsheet.insertSheet('📊ダッシュボード');
  
  const dashboard = [
    ['🧘‍♂️ 人生の道標 メルマガ管理ダッシュボード', '', '', ''],
    ['', '', '', ''],
    ['📈 リアルタイム統計', '', '📧 今日の活動', ''],
    ['総登録者数', '=COUNTA(登録者リスト!A:A)-1', '今日の新規登録', '=COUNTIF(登録者リスト!D:D,TODAY())'],
    ['アクティブ登録者', '=COUNTIF(登録者リスト!F:F,"active")', '今日の配信数', '=COUNTIF(送信履歴!D:D,TODAY())'],
    ['配信停止者', '=COUNTIF(登録者リスト!F:F,"unsubscribed")', '今日の開封数', '=COUNTIFS(送信履歴!D:D,TODAY(),送信履歴!G:G,"<>")'],
    ['', '', '', ''],
    ['🎯 ステップ別状況', '', '📊 メール別成果', ''],
    ['ウェルカム送信済み', '=COUNTIF(登録者リスト!G:G,">=1")', 'ウェルカム送信数', '=COUNTIF(送信履歴!B:B,"welcome")'],
    ['3日目送信済み', '=COUNTIF(登録者リスト!G:G,">=3")', '3日目送信数', '=COUNTIF(送信履歴!B:B,"day3")'],
    ['7日間完了', '=COUNTIF(登録者リスト!G:G,">=7")', '7日目送信数', '=COUNTIF(送信履歴!B:B,"day7")'],
    ['', '', '', ''],
    ['🚀 パフォーマンス指標', '', '⚠️ 要注意項目', ''],
    ['平均開封率', '=IFERROR(COUNTIFS(送信履歴!G:G,"<>",送信履歴!G:G,"")/COUNTA(送信履歴!A:A)*100,0)&"%"', '送信エラー', '=COUNTIF(送信履歴!E:E,"failed")'],
    ['総配信数', '=COUNTA(送信履歴!A:A)-1', '未配信登録者', '=COUNTIFS(登録者リスト!F:F,"active",登録者リスト!G:G,0)'],
    ['', '', '', ''],
    ['📅 最終更新: =NOW()', '', '', '']
  ];
  
  sheet.getRange(1, 1, dashboard.length, 4).setValues(dashboard);
  
  // スタイリング
  sheet.getRange(1, 1).setFontSize(16).setFontWeight('bold').setBackground('#1a73e8').setFontColor('white');
  sheet.getRange(3, 1, 1, 4).setFontWeight('bold').setBackground('#f8f9fa');
  sheet.getRange(8, 1, 1, 4).setFontWeight('bold').setBackground('#f8f9fa');
  sheet.getRange(13, 1, 1, 4).setFontWeight('bold').setBackground('#f8f9fa');
  
  // 数値列の書式設定
  sheet.getRange('B4:D15').setNumberFormat('#,##0');
  
  sheet.autoResizeColumns(1, 4);
}

/**
 * 🔄 Webhook受信処理 - Vercelから呼び出される
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const { firstName, lastName, email, source = 'newsletter_form' } = data;
    
    if (!email || !firstName || !lastName) {
      throw new Error('必須フィールドが不足');
    }
    
    // スプレッドシートに登録
    const result = addSubscriberToSheet(email, firstName, lastName, source);
    
    return ContentService
      .createTextOutput(JSON.stringify({
        success: true,
        message: '登録完了 - GASで管理開始',
        data: result,
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    console.error('GAS Webhook エラー:', error);
    return ContentService
      .createTextOutput(JSON.stringify({
        success: false,
        error: error.toString(),
        timestamp: new Date().toISOString()
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * スプレッドシートに登録者追加（重複チェック付き）
 */
function addSubscriberToSheet(email, firstName, lastName, source) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('登録者リスト');
  
  // 重複チェック
  const existingData = sheet.getDataRange().getValues();
  for (let i = 1; i < existingData.length; i++) {
    if (existingData[i][0] === email) {
      return { message: '既に登録済み', email: email };
    }
  }
  
  // 新規登録
  const newRow = [
    email,
    firstName,
    lastName,
    new Date(),
    source,
    'active',
    0, // CurrentStep
    '', // LastEmailSent
    0, // TotalEmailsSent
    '' // Tags
  ];
  
  sheet.appendRow(newRow);
  
  console.log(`✅ GAS登録完了: ${email}`);
  return {
    message: '新規登録完了',
    email: email,
    row: sheet.getLastRow()
  };
}

/**
 * 📊 外部システム用API - 登録者データ取得
 */
function doGet(e) {
  const action = e.parameter.action;
  
  switch (action) {
    case 'subscribers':
      return getSubscribersForScheduling();
    case 'templates':
      return getEmailTemplates();
    case 'log_sent':
      return logEmailSent(e.parameter);
    default:
      return ContentService
        .createTextOutput(JSON.stringify({ error: 'Invalid action' }))
        .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * スケジューリング用登録者データ取得
 */
function getSubscribersForScheduling() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('登録者リスト');
  
  const data = sheet.getDataRange().getValues();
  const subscribers = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === 'active') { // Status = 'active'
      subscribers.push({
        email: data[i][0],
        firstName: data[i][1],
        lastName: data[i][2],
        signupDate: data[i][3],
        currentStep: data[i][6],
        daysSinceSignup: Math.floor((new Date() - new Date(data[i][3])) / (1000 * 60 * 60 * 24))
      });
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(subscribers))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * メールテンプレート取得
 */
function getEmailTemplates() {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('メールテンプレート');
  
  const data = sheet.getDataRange().getValues();
  const templates = {};
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][4] === 'active') { // Status = 'active'
      templates[data[i][0]] = {
        subject: data[i][1],
        content: data[i][2],
        stepNumber: data[i][3]
      };
    }
  }
  
  return ContentService
    .createTextOutput(JSON.stringify(templates))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 送信ログ記録（外部から呼び出し）
 */
function logEmailSent(params) {
  const { email, templateId, subject, status, messageId } = params;
  
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // 送信履歴に記録
  const historySheet = spreadsheet.getSheetByName('送信履歴');
  historySheet.appendRow([
    email,
    templateId,
    subject,
    new Date(),
    status,
    messageId || '',
    '', // OpenedDate
    0, // ClickCount
    status === 'failed' ? '送信失敗' : ''
  ]);
  
  // 登録者のステップ更新
  updateSubscriberStep(email, templateId);
  
  return ContentService
    .createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 登録者ステップ更新
 */
function updateSubscriberStep(email, templateId) {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName('登録者リスト');
  
  const data = sheet.getDataRange().getValues();
  
  // ステップ番号マッピング
  const stepMapping = {
    'welcome': 1,
    'day1': 1,
    'day3': 3,
    'day7': 7
  };
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      const currentStep = Math.max(data[i][6] || 0, stepMapping[templateId] || 0);
      sheet.getRange(i + 1, 7).setValue(currentStep); // CurrentStep
      sheet.getRange(i + 1, 8).setValue(new Date()); // LastEmailSent
      sheet.getRange(i + 1, 9).setValue((data[i][8] || 0) + 1); // TotalEmailsSent
      break;
    }
  }
}

/**
 * ⚙️ Brevo設定 - 一度だけ実行してください
 */
function setupBrevoProperties() {
  const ui = SpreadsheetApp.getUi();
  
  const brevoApiKey = ui.prompt('Brevo API KEY', 'Brevo API KEYを入力してください:').getResponseText();
  const senderEmail = ui.prompt('送信者メールアドレス', 'Brevoで認証済みのメールアドレスを入力:').getResponseText();
  
  PropertiesService.getScriptProperties().setProperties({
    'BREVO_API_KEY': brevoApiKey,
    'SENDER_EMAIL': senderEmail
  });
  
  console.log('✅ Brevo設定完了');
  ui.alert('設定完了', 'Brevo設定が完了しました。これで自動システムが稼働します。', ui.ButtonSet.OK);
}

/**
 * WebApp URL取得
 */
function getWebAppUrl() {
  // 実際のWebApp URLは公開後に取得できます
  return 'https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec';
}

// ========== メールテンプレート ==========

function getWelcomeTemplate() {
  return `
    <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fafafa;">
      <div style="background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2C5F41; font-size: 24px; margin-bottom: 10px;">🧘‍♂️ 人生の道標</h1>
          <p style="color: #666; font-size: 16px;">心の平穏へのご案内</p>
        </div>
        
        <h2 style="color: #2C5F41; font-size: 18px; margin-bottom: 15px;">{firstName} {lastName} 様</h2>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">
          「人生の道標」へのご登録、心より感謝申し上げます。
        </p>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 20px;">
          これから数日間、あなたの心を豊かにする古来の智慧を、現代の生活に活かせる形でお届けいたします。
        </p>
        
        <div style="background: #f0f8f5; padding: 20px; border-radius: 5px; margin: 25px 0; border-left: 4px solid #2C5F41;">
          <p style="color: #2C5F41; font-weight: bold; margin-bottom: 10px;">これからお届けする内容</p>
          <ul style="color: #333; line-height: 1.6;">
            <li>心を整える実践的な方法</li>
            <li>人間関係に活かせる智慧</li>
            <li>日常の小さな気づき</li>
            <li>感謝と平穏の見つけ方</li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.7;">
          一緒に、心穏やかな毎日を築いていきましょう。
        </p>
        
        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
          <p style="color: #888; font-size: 12px;">人生の道標 | デジタル伽藍</p>
        </div>
      </div>
    </div>
  `;
}

function getDay1Template() {
  return `
    <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: white; padding: 30px; border-radius: 10px;">
        <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">心を整える3つの実践</h2>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">
          {firstName} 様、今日は忙しい日常の中でも実践できる、心を整える方法をお伝えします。
        </p>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">1. 朝の静寂の時間</h3>
          <p style="color: #333; line-height: 1.6;">
            目覚めた直後の3分間、何も考えず、ただ呼吸に意識を向けてみてください。
            心の中の騒がしさが、静かに沈んでいくのを感じられるでしょう。
          </p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">2. 感謝の発見</h3>
          <p style="color: #333; line-height: 1.6;">
            一日の終わりに、今日起こった小さな「ありがたいこと」を3つ思い浮かべてください。
            日常に隠れている幸せに気づく力が育まれます。
          </p>
        </div>
        
        <div style="background: #f9f9f9; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">3. デジタルの静寂</h3>
          <p style="color: #333; line-height: 1.6;">
            1日のうち30分間、スマートフォンを手の届かない場所に置いてみてください。
            心に余白が生まれ、本当に大切なことに意識が向きます。
          </p>
        </div>
        
        <p style="color: #333; line-height: 1.7; margin-top: 25px;">
          明日は「人との関わりの中で心を保つ智慧」についてお話しします。
        </p>
      </div>
    </div>
  `;
}

function getDay3Template() {
  return `
    <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: white; padding: 30px; border-radius: 10px;">
        <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">人間関係に活かす心の智慧</h2>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">
          {firstName} 様、人との関わりの中で心穏やかでいるための古来の智慧をお伝えします。
        </p>
        
        <div style="background: #f0f8f5; padding: 25px; border-radius: 5px; margin: 25px 0;">
          <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">相手の言葉の奥を聴く</h3>
          <p style="color: #333; line-height: 1.7;">
            人が感情的になっているとき、その言葉ではなく、心の奥にある気持ちに耳を傾けてみてください。
            怒りの奥には不安や悲しみが、批判の奥には理解されたい想いがあることが多いものです。
          </p>
        </div>
        
        <div style="background: #f0f8f5; padding: 25px; border-radius: 5px; margin: 25px 0;">
          <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">自分の反応を観察する</h3>
          <p style="color: #333; line-height: 1.7;">
            相手の言動に心が乱れたとき、一度深呼吸をして「今、私はどんな気持ちになっているだろう」と
            自分自身を観察してみてください。感情に飲み込まれず、適切な対応ができるようになります。
          </p>
        </div>
        
        <p style="color: #666; line-height: 1.7; font-style: italic; text-align: center; margin: 30px 0;">
          「理解することと同意することは違います。<br>
          相手を理解しようとする心が、関係性を深めていくのです。」
        </p>
      </div>
    </div>
  `;
}

function getDay7Template() {
  return `
    <div style="font-family: 'Hiragino Sans', 'Yu Gothic', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: white; padding: 30px; border-radius: 10px;">
        <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 20px;">一週間の歩みと感謝</h2>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">
          {firstName} 様、一週間お付き合いいただき、心から感謝申し上げます。
        </p>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">
          この数日間で、少しでも心に静けさや気づきが生まれたでしょうか。
          小さな変化でも、それは大きな一歩です。
        </p>
        
        <div style="background: #f0f8f5; padding: 25px; border-radius: 5px; margin: 25px 0;">
          <h3 style="color: #2C5F41; font-size: 16px; margin-bottom: 15px;">これからも心に留めていただきたいこと</h3>
          <ul style="color: #333; line-height: 1.7; padding-left: 20px;">
            <li style="margin-bottom: 10px;">完璧を求めず、今この瞬間を大切にすること</li>
            <li style="margin-bottom: 10px;">小さな感謝を見つける習慣を続けること</li>
            <li style="margin-bottom: 10px;">心が乱れても、それに気づく自分を褒めること</li>
            <li style="margin-bottom: 10px;">他者との関わりの中で、理解する心を持ち続けること</li>
          </ul>
        </div>
        
        <p style="color: #333; line-height: 1.7; margin-bottom: 25px;">
          人生という道のりで、時には迷うこともあるでしょう。
          そんなとき、ここでお伝えした智慧を思い出していただければ幸いです。
        </p>
        
        <div style="text-align: center; background: #2C5F41; color: white; padding: 20px; border-radius: 5px; margin: 30px 0;">
          <p style="font-size: 16px; margin: 0;">
            あなたの心に平穏と豊かさがありますように
          </p>
        </div>
        
        <p style="color: #666; line-height: 1.7; text-align: center; margin-top: 30px;">
          今後も時々、心の栄養となるメッセージをお届けいたします。<br>
          引き続き、どうぞよろしくお願いいたします。
        </p>
      </div>
    </div>
  `;
}