export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Brevo APIから実際の統計を取得
        const brevoApiKey = process.env.BREVO_API_KEY;
        
        // 実際のコンタクト数を取得
        const contactsResponse = await fetch('https://api.brevo.com/v3/contacts', {
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            }
        });
        
        const contactsData = await contactsResponse.json();
        const totalSubscribers = contactsData.count || 0;
        
        // 実際のキャンペーン統計を取得
        const campaignsResponse = await fetch('https://api.brevo.com/v3/emailCampaigns', {
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            }
        });
        
        const campaignsData = await campaignsResponse.json();
        
        // 今月のキャンペーン数を計算
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const monthlyEmails = campaignsData.campaigns?.filter(campaign => {
            const campaignDate = new Date(campaign.sentDate);
            return campaignDate.getMonth() === thisMonth && campaignDate.getFullYear() === thisYear;
        }).length || 0;
        
        // 平均開封率とクリック率を計算
        let totalOpenRate = 0;
        let totalClickRate = 0;
        let campaignCount = 0;
        
        if (campaignsData.campaigns) {
            campaignsData.campaigns.forEach(campaign => {
                if (campaign.statistics) {
                    totalOpenRate += campaign.statistics.openRate || 0;
                    totalClickRate += campaign.statistics.clickRate || 0;
                    campaignCount++;
                }
            });
        }
        
        const avgOpenRate = campaignCount > 0 ? (totalOpenRate / campaignCount).toFixed(1) : 0;
        const avgClickRate = campaignCount > 0 ? (totalClickRate / campaignCount).toFixed(1) : 0;
        
        res.status(200).json({
            totalSubscribers,
            monthlyEmails,
            openRate: `${avgOpenRate}%`,
            clickRate: `${avgClickRate}%`,
            lastUpdated: new Date().toLocaleString('ja-JP')
        });
        
    } catch (error) {
        console.error('Stats API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch stats',
            totalSubscribers: 0,
            monthlyEmails: 0,
            openRate: '0%',
            clickRate: '0%',
            lastUpdated: new Date().toLocaleString('ja-JP')
        });
    }
}
