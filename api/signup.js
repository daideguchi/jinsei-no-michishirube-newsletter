// Vercel API Route for Newsletter Signup - Server-side integration
export default async function handler(req, res) {
  // CORS headers
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
    const { firstName, lastName, email } = req.body;

    // Validation
    if (!firstName || !lastName || !email) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        details: 'firstName, lastName, and email are required'
      });
    }

    console.log('Processing signup for:', { firstName, lastName, email });

    // 1. Add to Brevo
    const brevoResponse = await fetch('https://api.brevo.com/v3/contacts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': 'xkeysib-eb04070a021fd9ad98a996b714cc836ad85a591fa1c921ffc172c29bd9e07e5-gs817L00dj28vAaG'
      },
      body: JSON.stringify({
        email: email,
        attributes: {
          FIRSTNAME: firstName,
          LASTNAME: lastName,
          SIGNUP_DATE: new Date().toISOString().split('T')[0],
          SOURCE: 'newsletter_form'
        },
        listIds: [2],
        updateEnabled: true
      })
    });

    console.log('Brevo response status:', brevoResponse.status);

    // 2. Add to Formspree (backup)
    try {
      await fetch('https://formspree.io/f/xbljnpov', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          timestamp: new Date().toISOString(),
          source: 'jinsei_no_michishirube_newsletter',
          brevoStatus: brevoResponse.status
        })
      });
    } catch (formspreeError) {
      console.warn('Formspree backup failed:', formspreeError);
    }

    // 3. Add to Google Sheets (using Google Apps Script webhook)
    try {
      const gasWebhookUrl = 'https://script.google.com/macros/s/AKfycbzXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/exec'; // Will be updated after deployment
      
      await fetch(gasWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          timestamp: new Date().toISOString(),
          source: 'newsletter_form'
        })
      });
    } catch (sheetsError) {
      console.warn('Google Sheets integration failed:', sheetsError);
    }

    // 4. Send welcome email via Brevo
    try {
      await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'api-key': 'xkeysib-eb04070a021fd9ad98a996b714cc836ad85a591fa1c921ffc172c29bd9e07e5-gs817L00dj28vAaG'
        },
        body: JSON.stringify({
          sender: {
            name: '人生の道標',
            email: 'noreply@jinsei-no-michishirube.com'
          },
          to: [{
            email: email,
            name: `${firstName} ${lastName}`
          }],
          subject: '【人生の道標】ご登録ありがとうございます - 明日から7日間の智慧をお送りします',
          htmlContent: `
            <div style="font-family: 'Noto Sans JP', sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #2C5F41; font-size: 24px; margin-bottom: 10px;">🧘‍♂️ 人生の道標</h1>
                <p style="color: #666; font-size: 16px;">デジタル伽藍からの智慧</p>
              </div>
              
              <div style="background: #f8f9fa; padding: 25px; border-radius: 10px; margin-bottom: 25px;">
                <h2 style="color: #2C5F41; font-size: 20px; margin-bottom: 15px;">${firstName} ${lastName} 様</h2>
                <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
                  「人生の道標」メルマガへのご登録、誠にありがとうございます。
                </p>
                <p style="color: #333; line-height: 1.6; margin-bottom: 15px;">
                  <strong>明日の朝10時</strong>から、7日間連続で54歳管理職のための智慧をお送りします。
                </p>
              </div>
            </div>
          `
        })
      });
    } catch (emailError) {
      console.warn('Welcome email failed:', emailError);
    }

    // Success response
    return res.status(200).json({
      success: true,
      message: 'Newsletter signup successful',
      data: {
        email,
        firstName,
        lastName,
        brevoStatus: brevoResponse.status,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
}