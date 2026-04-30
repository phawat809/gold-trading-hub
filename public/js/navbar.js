// ============ NAVBAR (shared across all pages) ============
(function() {
    const NAV_ITEMS = [
        { path: '/',             icon: '🤖', label: 'AI Suggestion' },
        { path: '/patterns',     icon: '📈', label: 'Pattern การเทรด' },
        { path: '/journal',      icon: '📓', label: 'Journal' },
        { path: '/track-record', icon: '🏆', label: 'Track Record' },
        { path: '/calculator',   icon: '🧮', label: 'เครื่องมือคำนวณ' },
        { path: '/contact',      icon: '💬', label: 'ติดต่อเรา' },
    ];

    function buildNavbar() {
        const currentPath = normalizePath(location.pathname);

        const links = NAV_ITEMS.map(function(item) {
            const isActive = item.path === currentPath ? ' active' : '';
            return '<a href="' + item.path + '" class="nav-link' + isActive + '">'
                + '<span class="nav-icon">' + item.icon + '</span> '
                + item.label
                + '</a>';
        }).join('');

        return ''
            + '<div class="navbar-container">'
            +   '<a href="/" class="navbar-brand">'
            +     '<div class="navbar-brand-icon">⚜️</div>'
            +     '<span class="navbar-brand-text">Gold Trading Hub</span>'
            +   '</a>'
            +   '<button class="navbar-toggle" id="navToggle">☰</button>'
            +   '<div class="navbar-menu" id="navMenu">' + links + '</div>'
            + '</div>';
    }

    function normalizePath(path) {
        // Remove trailing slash (except root) and .html
        let p = path.replace(/\.html$/, '');
        if (p.length > 1 && p.endsWith('/')) p = p.slice(0, -1);
        return p || '/';
    }

    function buildUserBadge() {
        return ''
            + '<span>✅ <span id="displayCode"></span></span>'
            + '<button class="logout-btn" id="logoutBtn">ออกจากระบบ</button>';
    }

    function init() {
        const nav = document.getElementById('navbar');
        if (nav) {
            nav.classList.add('navbar');
            nav.innerHTML = buildNavbar();
            document.getElementById('navToggle').addEventListener('click', toggleNavMenu);
        }

        const badge = document.getElementById('userBadge');
        if (badge) {
            badge.classList.add('user-badge');
            badge.innerHTML = buildUserBadge();
            document.getElementById('logoutBtn').addEventListener('click', function() {
                if (window.appAuth) window.appAuth.logout();
            });
        }
    }

    function toggleNavMenu() {
        const menu = document.getElementById('navMenu');
        const toggle = document.getElementById('navToggle');
        menu.classList.toggle('open');
        toggle.textContent = menu.classList.contains('open') ? '✕' : '☰';
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
