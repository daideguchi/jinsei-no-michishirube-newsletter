// Email Templates API - Google Sheets連携
// メールテンプレートの読み込み・保存・配信時使用

export default async function handler(req, res) {
  const { method } = req;

  try {
    switch (method) {
      case 'GET':
        // Google Sheetsからテンプレート読み込み
        return await getTemplates(req, res);
      
      case 'PUT':
        // Google Sheetsにテンプレート保存
        return await saveTemplate(req, res);
      
      case 'POST':
        // 特定のテンプレートでメール送信
        return await sendEmail(req, res);
      
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'POST']);
        return res.status(405).json({ error: `Method ${method} Not Allowed` });
    }
  } catch (error) {
    console.error('Email Templates API Error:', error);
    return res.status(500).json({ 
      error: 'Internal Server Error',
      message: error.message 
    });
  }
}

// Google Sheetsからテンプレート読み込み
async function getTemplates(req, res) {
  const { templateId } = req.query;
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'Google Sheets API key not configured' });
  }
  
  try {
    // Email_Templates シートから読み込み
    const range = templateId 
      ? `Email_Templates!A2:N5` // 特定のテンプレートのみ
      : `Email_Templates!A2:N10`; // 全テンプレート
    
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`Google Sheets API error: ${response.status}`);
    }
    
    const data = await response.json();
    const rows = data.values || [];
    
    // データを構造化
    const templates = rows.map(row => ({
      templateId: row[0],
      subject: row[1],
      previewText: row[2],
      headerTitle: row[3],
      mainContent: row[4],
      section1Title: row[5],
      section1Content: row[6],
      section2Title: row[7],
      section2Content: row[8],
      section3Title: row[9],
      section3Content: row[10],
      closingMessage: row[11],
      status: row[12],
      lastUpdated: row[13]
    }));
    
    if (templateId) {
      const template = templates.find(t => t.templateId === templateId);
      return res.status(200).json(template || null);
    }
    
    return res.status(200).json(templates);
  } catch (error) {
    console.error('Failed to fetch templates:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch templates',
      message: error.message 
    });
  }
}

// Google Sheetsにテンプレート保存
async function saveTemplate(req, res) {
  const { templateId, ...templateData } = req.body;
  
  if (!templateId) {
    return res.status(400).json({ error: 'Template ID is required' });
  }
  
  const SHEET_ID = process.env.GOOGLE_SHEET_ID || '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
  const API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
  
  if (!API_KEY) {
    return res.status(500).json({ error: 'Google Sheets API key not configured' });
  }
  
  try {
    // まず既存のテンプレートを検索
    const searchResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Email_Templates!A2:A10?key=${API_KEY}`
    );
    
    if (!searchResponse.ok) {
      throw new Error('Failed to search existing templates');
    }
    
    const searchData = await searchResponse.json();
    const templateIds = searchData.values ? searchData.values.map(row => row[0]) : [];
    const rowIndex = templateIds.indexOf(templateId);
    
    if (rowIndex === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const actualRow = rowIndex + 2; // A2から始まるので+2
    
    // 更新データを準備
    const values = [[
      templateId,
      templateData.subject || '',
      templateData.previewText || '',
      templateData.headerTitle || '',
      templateData.mainContent || '',
      templateData.section1Title || '',
      templateData.section1Content || '',
      templateData.section2Title || '',
      templateData.section2Content || '',
      templateData.section3Title || '',
      templateData.section3Content || '',
      templateData.closingMessage || '',
      'active',
      new Date().toISOString()
    ]];
    
    // Google Sheetsに保存
    const updateResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Email_Templates!A${actualRow}:N${actualRow}?valueInputOption=RAW&key=${API_KEY}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values })
      }
    );
    
    if (!updateResponse.ok) {
      throw new Error('Failed to update template');
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Template saved successfully',
      templateId: templateId 
    });
    
  } catch (error) {
    console.error('Failed to save template:', error);
    return res.status(500).json({ 
      error: 'Failed to save template',
      message: error.message 
    });
  }
}

// テンプレートを使ってメール送信
async function sendEmail(req, res) {
  const { templateId, email, firstName, lastName } = req.body;
  
  if (!templateId || !email || !firstName || !lastName) {
    return res.status(400).json({ 
      error: 'Missing required fields: templateId, email, firstName, lastName' 
    });
  }
  
  try {
    // まずテンプレートを取得
    const templateResponse = await getTemplates(
      { query: { templateId } }, 
      { status: () => ({ json: () => {} }) }
    );
    
    if (!templateResponse || !templateResponse.subject) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // HTMLコンテンツを生成
    const htmlContent = generateHtmlContent(templateResponse, firstName, lastName);
    
    // Brevo APIでメール送信
    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
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
        subject: templateResponse.subject,
        htmlContent: htmlContent
      })
    });
    
    if (!brevoResponse.ok) {
      const error = await brevoResponse.json();
      throw new Error(`Brevo API error: ${JSON.stringify(error)}`);
    }
    
    return res.status(200).json({ 
      success: true,
      message: 'Email sent successfully',
      templateId: templateId,
      recipient: email
    });
    
  } catch (error) {
    console.error('Failed to send email:', error);
    return res.status(500).json({ 
      error: 'Failed to send email',
      message: error.message 
    });
  }
}

// HTMLコンテンツ生成
function generateHtmlContent(template, firstName, lastName) {
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