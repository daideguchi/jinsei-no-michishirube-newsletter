import crypto from 'crypto';

const ADMIN_PASSWORD = 'GHc6Waxw';
const SECRET_KEY = process.env.ADMIN_SECRET_KEY || 'jinsei-no-michishirube-admin-2025';

function generateToken() {
    const timestamp = Date.now();
    const data = `admin:${timestamp}`;
    const hash = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
    return Buffer.from(`${data}:${hash}`).toString('base64');
}

function verifyToken(token) {
    try {
        const decoded = Buffer.from(token, 'base64').toString('utf8');
        const [user, timestamp, hash] = decoded.split(':');
        
        if (user !== 'admin') return false;
        
        // トークンの有効期限チェック (24時間)
        const tokenAge = Date.now() - parseInt(timestamp);
        if (tokenAge > 24 * 60 * 60 * 1000) return false;
        
        // ハッシュ検証
        const expectedHash = crypto.createHmac('sha256', SECRET_KEY).update(`${user}:${timestamp}`).digest('hex');
        return hash === expectedHash;
    } catch (error) {
        return false;
    }
}

export default async function handler(req, res) {
    if (req.method === 'POST') {
        // ログイン処理
        const { password } = req.body;
        
        if (password === ADMIN_PASSWORD) {
            const token = generateToken();
            res.status(200).json({
                success: true,
                token,
                message: 'Authentication successful'
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid password'
            });
        }
    } 
    else if (req.method === 'GET') {
        // トークン検証
        const authHeader = req.headers.authorization;
        const token = authHeader?.replace('Bearer ', '');
        
        if (token && verifyToken(token)) {
            res.status(200).json({
                success: true,
                valid: true
            });
        } else {
            res.status(401).json({
                success: false,
                valid: false
            });
        }
    }
    else {
        res.status(405).json({ error: 'Method not allowed' });
    }
}

export { verifyToken };
