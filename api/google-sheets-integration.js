// Google Sheets API Integration for Newsletter Signup
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { firstName, lastName, email } = req.body;

  try {
    // Google Sheets API setup
    const GOOGLE_SHEETS_API_KEY = process.env.GOOGLE_SHEETS_API_KEY;
    const SHEET_ID = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2PztM';
    
    // Add row to Google Sheets
    const sheetsResponse = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/Sheet1:append?valueInputOption=RAW&key=${GOOGLE_SHEETS_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[
            firstName,
            lastName, 
            email,
            new Date().toISOString(),
            'newsletter_form'
          ]]
        })
      }
    );

    if (!sheetsResponse.ok) {
      throw new Error(`Google Sheets API error: ${sheetsResponse.status}`);
    }

    // Also add to Brevo
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

    return res.status(200).json({
      success: true,
      message: 'Successfully added to both Google Sheets and Brevo',
      sheets: sheetsResponse.status,
      brevo: brevoResponse.status
    });

  } catch (error) {
    console.error('Integration error:', error);
    return res.status(500).json({
      error: 'Integration failed',
      message: error.message
    });
  }
}