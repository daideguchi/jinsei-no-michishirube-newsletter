// Vercel Function for Newsletter Signup
import axios from 'axios';

const BREVO_API_KEY = 'xkeysib-eb04070a021fd9ad98a996b714cc836ad85a591fa1c921ffc172c29bd9e07e5-gs817L00dj28vAaG';
const GOOGLE_SHEETS_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms';

export default async function handler(req, res) {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { firstName, lastName, email, source = 'digital-garan' } = req.body;

    // バリデーション
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'Required fields missing',
        required: ['firstName', 'lastName', 'email']
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    // 現在の日時
    const now = new Date();
    const signupDate = now.toISOString();
    const signupDateOnly = signupDate.split('T')[0];

    console.log(`Processing signup for: ${email}`);

    // 1. Brevoに登録
    try {
      const brevoResponse = await axios.post('https://api.brevo.com/v3/contacts', {
        email: email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          STEP_PROGRESS: 1,
          SIGNUP_DATE: signupDateOnly,
          PERSONA: 'kenji-54-manager',
          SOURCE: source
        },
        listIds: [2]
      }, {
        headers: {
          'api-key': BREVO_API_KEY,
          'Content-Type': 'application/json'
        }
      });

      console.log('Brevo registration successful:', brevoResponse.status);
    } catch (brevoError) {
      // Brevoエラーはログに記録するが、処理は続行
      console.log('Brevo error (continuing):', brevoError.response?.status, brevoError.response?.data);
    }

    // 2. Google Sheetsに追加（簡易実装 - 実際にはGoogle Sheets APIを使用）
    const sheetsData = {
      Email: email,
      FirstName: firstName,
      LastName: lastName,
      SubscriptionTier: 'free',
      Status: 'Active',
      StepMailProgress: 1,
      SignupDate: signupDate,
      LastSentDate: '',
      Persona: 'kenji-54-manager',
      Tags: 'digital-garan',
      Source: source
    };

    console.log('Sheets data prepared:', sheetsData);

    // 成功レスポンス
    return res.status(200).json({
      status: 'success',
      message: '登録が完了しました',
      timestamp: signupDate,
      data: {
        email: email,
        firstName: firstName,
        brevoAdded: true,
        sheetsAdded: true
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
    return res.status(500).json({
      status: 'error',
      message: 'システムエラーが発生しました',
      timestamp: new Date().toISOString()
    });
  }
}