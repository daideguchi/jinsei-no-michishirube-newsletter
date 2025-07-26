/**
 * 人生の道標 - メルマガ管理スプレッドシート自動作成
 * 実行するとスプレッドシートが自動で作成されます
 */

function createNewsletterSpreadsheet() {
  // スプレッドシート作成
  const spreadsheet = SpreadsheetApp.create('人生の道標 - メルマガ管理システム');
  const sheet = spreadsheet.getActiveSheet();
  sheet.setName('登録者リスト');
  
  // ヘッダー行設定
  const headers = [
    'Email',
    'FirstName', 
    'LastName',
    'SignupDate',
    'Source',
    'Status',
    'CurrentStep',
    'LastEmailSent',
    'TotalEmailsSent',
    'Tags'
  ];
  
  // ヘッダーをA1行に設定
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  
  // ヘッダー行のスタイル設定
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange.setFontWeight('bold');
  headerRange.setBackground('#4285f4');
  headerRange.setFontColor('white');
  
  // サンプルデータ追加
  const sampleData = [
    [
      'sample@example.com',
      'サンプル',
      'ユーザー', 
      new Date(),
      'newsletter_form',
      'active',
      0,
      '',
      0,
      ''
    ]
  ];
  
  sheet.getRange(2, 1, sampleData.length, headers.length).setValues(sampleData);
  
  // 列幅自動調整
  sheet.autoResizeColumns(1, headers.length);
  
  // データ範囲にフィルター追加
  sheet.getRange(1, 1, 1000, headers.length).createFilter();
  
  // 条件付き書式設定（ステータス列）
  const statusRange = sheet.getRange('F2:F1000');
  
  // アクティブユーザー（緑色）
  const activeRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('active')
    .setBackground('#d9ead3')
    .setRanges([statusRange])
    .build();
  
  // 配信停止ユーザー（赤色）
  const unsubscribedRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('unsubscribed')
    .setBackground('#f4cccc')
    .setRanges([statusRange])
    .build();
  
  sheet.setConditionalFormatRules([activeRule, unsubscribedRule]);
  
  // 共有設定のための情報表示
  const spreadsheetId = spreadsheet.getId();
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  
  console.log('✅ メルマガ管理スプレッドシート作成完了！');
  console.log('📊 スプレッドシートID:', spreadsheetId);
  console.log('🔗 スプレッドシートURL:', spreadsheetUrl);
  console.log('');
  console.log('📋 次のステップ:');
  console.log('1. スプレッドシートの共有設定を「リンクを知っている全員が編集可」に変更');
  console.log('2. Vercel環境変数 GOOGLE_SHEET_ID に上記IDを設定');
  console.log('3. Google Sheets API Key を取得してVercelに設定');
  
  // 作成完了をスプレッドシートに記録
  sheet.getRange('A2').activate();
  
  return {
    spreadsheetId: spreadsheetId,
    spreadsheetUrl: spreadsheetUrl
  };
}

/**
 * メール配信ログシートを追加作成
 */
function addEmailLogSheet() {
  const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // 上記で作成したIDに置き換え
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // メール配信ログシート作成
  const logSheet = spreadsheet.insertSheet('配信ログ');
  
  const logHeaders = [
    'Email',
    'TemplateID',
    'Subject',
    'SentDate',
    'Status',
    'BrevoMessageId',
    'OpenedDate',
    'ClickCount',
    'Error'
  ];
  
  logSheet.getRange(1, 1, 1, logHeaders.length).setValues([logHeaders]);
  
  const logHeaderRange = logSheet.getRange(1, 1, 1, logHeaders.length);
  logHeaderRange.setFontWeight('bold');
  logHeaderRange.setBackground('#ea4335');
  logHeaderRange.setFontColor('white');
  
  logSheet.autoResizeColumns(1, logHeaders.length);
  
  console.log('✅ 配信ログシート追加完了');
}

/**
 * メールテンプレートシートを追加作成
 */
function addEmailTemplateSheet() {
  const spreadsheetId = 'YOUR_SPREADSHEET_ID'; // 上記で作成したIDに置き換え
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  
  // メールテンプレートシート作成
  const templateSheet = spreadsheet.insertSheet('メールテンプレート');
  
  const templateHeaders = [
    'TemplateID',
    'Subject',
    'Content',
    'StepNumber',
    'Status',
    'LastModified',
    'SendCount'
  ];
  
  templateSheet.getRange(1, 1, 1, templateHeaders.length).setValues([templateHeaders]);
  
  const templateHeaderRange = templateSheet.getRange(1, 1, 1, templateHeaders.length);
  templateHeaderRange.setFontWeight('bold');
  templateHeaderRange.setBackground('#34a853');
  templateHeaderRange.setFontColor('white');
  
  // 初期テンプレートデータ
  const templates = [
    ['welcome', '【人生の道標】ご登録ありがとうございます', 'ウェルカムメール内容...', 0, 'active', new Date(), '=COUNTIF(配信ログ!B:B,"welcome")'],
    ['day1', '【人生の道標】心を整える智慧をお届けします', 'Day1メール内容...', 1, 'active', new Date(), '=COUNTIF(配信ログ!B:B,"day1")'],
    ['day3', '【人生の道標】人間関係の智慧', 'Day3メール内容...', 3, 'active', new Date(), '=COUNTIF(配信ログ!B:B,"day3")'],
    ['day7', '【人生の道標】一週間の振り返りと感謝', 'Day7メール内容...', 7, 'active', new Date(), '=COUNTIF(配信ログ!B:B,"day7")']
  ];
  
  templateSheet.getRange(2, 1, templates.length, templateHeaders.length).setValues(templates);
  templateSheet.autoResizeColumns(1, templateHeaders.length);
  
  console.log('✅ メールテンプレートシート追加完了');
}

/**
 * 一括でフルシステム作成
 */
function createFullNewsletterSystem() {
  console.log('🚀 フルメルマガ管理システム作成開始...');
  
  // メインスプレッドシート作成
  const result = createNewsletterSpreadsheet();
  
  // 少し待ってから追加シート作成
  Utilities.sleep(2000);
  
  console.log('📧 追加シート作成中...');
  console.log('⚠️ 次は手動で addEmailLogSheet() と addEmailTemplateSheet() を実行してください');
  console.log('   その際、YOUR_SPREADSHEET_ID を', result.spreadsheetId, 'に置き換えてください');
  
  return result;
}