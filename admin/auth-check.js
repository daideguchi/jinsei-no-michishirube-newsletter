// 管理画面の認証チェック用共通スクリプト
function checkAdminAuth() {
    const token = localStorage.getItem('adminAuth') || sessionStorage.getItem('adminAuth');
    
    if (!token) {
        window.location.href = '/admin/login';
        return false;
    }
    
    // トークン検証
    fetch('/api/admin/auth', {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.valid) {
            localStorage.removeItem('adminAuth');
            sessionStorage.removeItem('adminAuth');
            window.location.href = '/admin/login';
        }
    })
    .catch(error => {
        console.error('認証チェックエラー:', error);
        window.location.href = '/admin/login';
    });
    
    return true;
}

function logout() {
    localStorage.removeItem('adminAuth');
    sessionStorage.removeItem('adminAuth');
    window.location.href = '/admin/login';
}

// ページ読み込み時に認証チェック
if (window.location.pathname.startsWith('/admin/') && !window.location.pathname.includes('/login')) {
    checkAdminAuth();
}
