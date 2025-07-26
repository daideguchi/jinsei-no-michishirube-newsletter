export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const brevoApiKey = process.env.BREVO_API_KEY;
        
        // 最近のキャンペーン取得
        const campaignsResponse = await fetch('https://api.brevo.com/v3/emailCampaigns?limit=5&sort=desc', {
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            }
        });
        
        const campaignsData = await campaignsResponse.json();
        
        // 最近の読者取得
        const contactsResponse = await fetch('https://api.brevo.com/v3/contacts?limit=5&sort=desc', {
            headers: {
                'api-key': brevoApiKey,
                'Content-Type': 'application/json'
            }
        });
        
        const contactsData = await contactsResponse.json();
        
        // データ整形
        const recentCampaigns = campaignsData.campaigns?.map(campaign => ({
            name: campaign.name,
            subject: campaign.subject,
            sentCount: campaign.statistics?.sent || 0,
            openRate: campaign.statistics?.openRate ? `${campaign.statistics.openRate.toFixed(1)}%` : '0%',
            clickRate: campaign.statistics?.clickRate ? `${campaign.statistics.clickRate.toFixed(1)}%` : '0%',
            sentDate: campaign.sentDate ? new Date(campaign.sentDate).toLocaleString('ja-JP') : '未送信',
            timeAgo: campaign.sentDate ? getTimeAgo(new Date(campaign.sentDate)) : '未送信'
        })) || [];
        
        const recentSubscribers = contactsData.contacts?.map(contact => ({
            name: `${contact.attributes?.FIRSTNAME || ''} ${contact.attributes?.LASTNAME || ''}`.trim() || 'ユーザー',
            email: contact.email,
            createdAt: new Date(contact.createdAt).toLocaleString('ja-JP'),
            timeAgo: getTimeAgo(new Date(contact.createdAt)),
            step: 'Step 0' // 実際のステップ情報があれば使用
        })) || [];
        
        // 今月の統計計算
        const thisMonth = new Date().getMonth();
        const thisYear = new Date().getFullYear();
        const lastMonth = new Date();
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        
        const thisMonthCampaigns = campaignsData.campaigns?.filter(campaign => {
            if (!campaign.sentDate) return false;
            const sentDate = new Date(campaign.sentDate);
            return sentDate.getMonth() === thisMonth && sentDate.getFullYear() === thisYear;
        }) || [];
        
        const lastMonthCampaigns = campaignsData.campaigns?.filter(campaign => {
            if (!campaign.sentDate) return false;
            const sentDate = new Date(campaign.sentDate);
            return sentDate.getMonth() === lastMonth.getMonth() && sentDate.getFullYear() === lastMonth.getFullYear();
        }) || [];
        
        const thisMonthSubscribers = contactsData.contacts?.filter(contact => {
            const createdDate = new Date(contact.createdAt);
            return createdDate.getMonth() === thisMonth && createdDate.getFullYear() === thisYear;
        }) || [];
        
        res.status(200).json({
            recentCampaigns,
            recentSubscribers,
            monthlyStats: {
                newSubscribers: thisMonthSubscribers.length,
                campaignsSent: thisMonthCampaigns.length,
                lastMonthCampaigns: lastMonthCampaigns.length,
                growth: lastMonthCampaigns.length > 0 ? 
                    `${((thisMonthCampaigns.length - lastMonthCampaigns.length) / lastMonthCampaigns.length * 100).toFixed(1)}%` : 
                    '+0%'
            },
            lastUpdated: new Date().toLocaleString('ja-JP')
        });

    } catch (error) {
        console.error('Recent activity API error:', error);
        res.status(500).json({ 
            error: 'Failed to fetch recent activity',
            recentCampaigns: [],
            recentSubscribers: [],
            monthlyStats: {
                newSubscribers: 0,
                campaignsSent: 0,
                growth: '+0%'
            },
            lastUpdated: new Date().toLocaleString('ja-JP')
        });
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 60) return `${diffMins}分前`;
    if (diffHours < 24) return `${diffHours}時間前`;
    return `${diffDays}日前`;
}
