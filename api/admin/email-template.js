export default async function handler(req, res) {
    const brevoApiKey = process.env.BREVO_API_KEY;
    const { id } = req.query;

    if (req.method === 'GET') {
        // 特定のテンプレートを取得
        try {
            const response = await fetch(`https://api.brevo.com/v3/emailTemplates/${id}`, {
                headers: {
                    'api-key': brevoApiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to fetch template');
            }
            
            const template = await response.json();
            
            res.status(200).json({
                id: template.id,
                name: template.name,
                subject: template.subject,
                htmlContent: template.htmlContent,
                tag: template.tag,
                isActive: template.isActive,
                createdAt: template.createdAt,
                modifiedAt: template.modifiedAt
            });

        } catch (error) {
            console.error('Get template error:', error);
            res.status(500).json({ error: 'Failed to fetch template' });
        }
    }
    
    else if (req.method === 'PUT') {
        // テンプレートを更新
        try {
            const { name, subject, htmlContent, tag } = req.body;
            
            const response = await fetch(`https://api.brevo.com/v3/emailTemplates/${id}`, {
                method: 'PUT',
                headers: {
                    'api-key': brevoApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    subject,
                    htmlContent,
                    tag
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to update template');
            }
            
            res.status(200).json({ success: true, message: 'Template updated successfully' });

        } catch (error) {
            console.error('Update template error:', error);
            res.status(500).json({ error: 'Failed to update template' });
        }
    }
    
    else if (req.method === 'POST') {
        // 新しいテンプレートを作成
        try {
            const { name, subject, htmlContent, tag } = req.body;
            
            const response = await fetch('https://api.brevo.com/v3/emailTemplates', {
                method: 'POST',
                headers: {
                    'api-key': brevoApiKey,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    name,
                    subject,
                    htmlContent,
                    tag: tag || 'newsletter'
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to create template');
            }
            
            const result = await response.json();
            res.status(201).json({ success: true, id: result.id, message: 'Template created successfully' });

        } catch (error) {
            console.error('Create template error:', error);
            res.status(500).json({ error: 'Failed to create template' });
        }
    }
    
    else if (req.method === 'DELETE') {
        // テンプレートを削除
        try {
            const response = await fetch(`https://api.brevo.com/v3/emailTemplates/${id}`, {
                method: 'DELETE',
                headers: {
                    'api-key': brevoApiKey,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete template');
            }
            
            res.status(200).json({ success: true, message: 'Template deleted successfully' });

        } catch (error) {
            console.error('Delete template error:', error);
            res.status(500).json({ error: 'Failed to delete template' });
        }
    }
    
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}
