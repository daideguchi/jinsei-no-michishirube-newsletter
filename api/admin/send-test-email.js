export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const brevoApiKey = process.env.BREVO_API_KEY;
        const { templateId, email, subject, htmlContent } = req.body;

        // Brevo APIでテストメール送信
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
            method: 'POST',
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sender: {
                    name: "人生の道標",
                    email: "noreply@jinsei-no-michishirube.com"
                },
                to: [{
                    email: email,
                    name: "テスト受信者"
                }],
                subject: `[テスト] ${subject}`,
                htmlContent: htmlContent,
                tags: ["test-email"]
            })
        });

        if (!response.ok) {
            throw new Error('Failed to send test email');
        }

        const result = await response.json();
        
        res.status(200).json({
            success: true,
            messageId: result.messageId,
            message: `テストメールを ${email} に送信しました`
        });

    } catch (error) {
        console.error('Send test email error:', error);
        res.status(500).json({ 
            error: 'Failed to send test email',
            message: error.message
        });
    }
}
