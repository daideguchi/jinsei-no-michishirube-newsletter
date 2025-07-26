export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const brevoApiKey = process.env.BREVO_API_KEY;
        
        // Brevo APIから実際の読者リストを取得
        const response = await fetch('https://api.brevo.com/v3/contacts?limit=50&sort=desc', {
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch subscribers');
        }
        
        const data = await response.json();
        
        // データを整形
        const subscribers = data.contacts?.map(contact => ({
            id: contact.id,
            email: contact.email,
            firstName: contact.attributes?.FIRSTNAME || '',
            lastName: contact.attributes?.LASTNAME || '',
            createdAt: new Date(contact.createdAt).toLocaleDateString('ja-JP'),
            isActive: !contact.emailBlacklisted
        })) || [];

        res.status(200).json({
            subscribers,
            total: data.count || 0,
            lastUpdated: new Date().toLocaleString('ja-JP')
        });

    } catch (error) {
        console.error('Subscribers API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch subscribers',
            subscribers: [],
            total: 0,
            lastUpdated: new Date().toLocaleString('ja-JP')
        });
    }
}
