export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const brevoApiKey = process.env.BREVO_API_KEY;
        
        // Brevo APIから実際のメールテンプレートを取得
        const response = await fetch('https://api.brevo.com/v3/emailTemplates', {
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch email templates');
        }
        
        const data = await response.json();
        
        // テンプレートデータを整形
        const templates = data.templates?.map(template => ({
            id: template.id,
            name: template.name,
            subject: template.subject || '件名未設定',
            createdAt: new Date(template.createdAt).toLocaleDateString('ja-JP'),
            modifiedAt: new Date(template.modifiedAt).toLocaleDateString('ja-JP'),
            isActive: template.isActive,
            tag: template.tag || 'general'
        })) || [];

        res.status(200).json({
            templates,
            total: templates.length,
            lastUpdated: new Date().toLocaleString('ja-JP')
        });

    } catch (error) {
        console.error('Email templates API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch email templates',
            templates: [],
            total: 0,
            lastUpdated: new Date().toLocaleString('ja-JP')
        });
    }
}
