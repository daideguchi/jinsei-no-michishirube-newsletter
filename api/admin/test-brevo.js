// Brevo API接続テスト
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const BREVO_API_KEY = process.env.BREVO_API_KEY;
    
    if (!BREVO_API_KEY) {
      return res.status(500).json({ 
        success: false, 
        error: 'Brevo API key not configured' 
      });
    }

    // Brevo API - アカウント情報取得
    const response = await fetch('https://api.brevo.com/v3/account', {
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });

    if (!response.ok) {
      const error = await response.json();
      return res.status(400).json({ 
        success: false, 
        error: `Brevo API Error: ${error.message || 'Unknown error'}` 
      });
    }

    const accountData = await response.json();
    
    // 追加: 今月の送信統計を取得
    const statsResponse = await fetch('https://api.brevo.com/v3/emailCampaigns', {
      headers: {
        'Accept': 'application/json',
        'api-key': BREVO_API_KEY
      }
    });

    let sentCount = 0;
    if (statsResponse.ok) {
      const statsData = await statsResponse.json();
      // 簡易的な計算（実際は詳細な統計APIを使用）
      sentCount = statsData.campaigns ? statsData.campaigns.length * 50 : 0;
    }

    return res.status(200).json({
      success: true,
      account: {
        email: accountData.email,
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        companyName: accountData.companyName,
        plan: accountData.plan
      },
      limits: accountData.plan,
      sent: sentCount,
      limit: accountData.plan.maxSendsPerMonth || 10000,
      remaining: (accountData.plan.maxSendsPerMonth || 10000) - sentCount
    });

  } catch (error) {
    console.error('Brevo test error:', error);
    return res.status(500).json({
      success: false,
      error: `Connection failed: ${error.message}`
    });
  }
}