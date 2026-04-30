// ============ TRACK RECORD PAGE ============
(function() {
    let userCode = null;

    function escapeHtml(s) {
        if (s === null || s === undefined) return '';
        return String(s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function loadEntries() {
        if (!userCode) return [];
        const raw = localStorage.getItem('goldHub_' + userCode + '_journal');
        if (!raw) return [];
        try {
            const arr = JSON.parse(raw);
            return Array.isArray(arr) ? arr : [];
        } catch (e) {
            return [];
        }
    }

    function aggregateOverall(entries) {
        const total = entries.length;
        const wins = entries.filter(function(e) { return e.pnl > 0; }).length;
        const losses = entries.filter(function(e) { return e.pnl < 0; }).length;
        const breakeven = total - wins - losses;
        const totalPnl = entries.reduce(function(s, e) { return s + (e.pnl || 0); }, 0);
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        const avgPnl = total > 0 ? totalPnl / total : 0;
        return { total: total, wins: wins, losses: losses, breakeven: breakeven, totalPnl: totalPnl, winRate: winRate, avgPnl: avgPnl };
    }

    function aggregateByPattern(entries) {
        const groups = {};
        entries.forEach(function(e) {
            const key = e.pattern || '__unspecified';
            if (!groups[key]) groups[key] = [];
            groups[key].push(e);
        });
        return groups;
    }

    function renderOverall(stats) {
        const el = document.getElementById('tr-overall');
        if (!el) return;
        const winRateClass = stats.winRate >= 70 ? 'up' : stats.winRate >= 50 ? '' : 'down';
        const pnlClass = stats.totalPnl >= 0 ? 'up' : 'down';
        el.innerHTML = ''
            + '<div class="tr-stat"><div class="tr-stat-label">เทรดทั้งหมด</div><div class="tr-stat-value">' + stats.total + '</div></div>'
            + '<div class="tr-stat"><div class="tr-stat-label">ชนะ</div><div class="tr-stat-value up">' + stats.wins + '</div></div>'
            + '<div class="tr-stat"><div class="tr-stat-label">แพ้</div><div class="tr-stat-value down">' + stats.losses + '</div></div>'
            + '<div class="tr-stat hl"><div class="tr-stat-label">Win Rate</div><div class="tr-stat-value ' + winRateClass + '">' + stats.winRate.toFixed(1) + '%</div></div>'
            + '<div class="tr-stat"><div class="tr-stat-label">P/L รวม</div><div class="tr-stat-value ' + pnlClass + '">' + (stats.totalPnl >= 0 ? '+' : '') + '$' + stats.totalPnl.toFixed(2) + '</div></div>'
            + '<div class="tr-stat"><div class="tr-stat-label">P/L เฉลี่ย/เทรด</div><div class="tr-stat-value ' + pnlClass + '">' + (stats.avgPnl >= 0 ? '+' : '') + '$' + stats.avgPnl.toFixed(2) + '</div></div>';
    }

    function renderPatternRow(pattern, group) {
        const stats = aggregateOverall(group);
        const target = pattern ? pattern.targetWinRate : null;
        const dirClass = pattern && pattern.direction === 'buy' ? 'buy' : pattern && pattern.direction === 'sell' ? 'sell' : '';
        const dirLabel = pattern && pattern.direction === 'buy' ? '🟢' : pattern && pattern.direction === 'sell' ? '🔴' : '⚪';
        const name = pattern ? pattern.nameTh : 'ไม่ระบุ Pattern';

        let progressBar = '';
        if (target !== null && stats.total > 0) {
            const pct = Math.min(100, (stats.winRate / target) * 100);
            const meetTarget = stats.winRate >= target;
            progressBar = ''
                + '<div class="tr-progress-wrap">'
                +   '<div class="tr-progress-label">'
                +     '<span>เทียบเป้าหมาย ' + target + '%</span>'
                +     '<span class="' + (meetTarget ? 'up' : 'down') + '">' + (meetTarget ? '✓ ถึงเป้า' : (target - stats.winRate).toFixed(1) + '% ห่างเป้า') + '</span>'
                +   '</div>'
                +   '<div class="tr-progress-bar"><div class="tr-progress-fill ' + (meetTarget ? 'success' : '') + '" style="width:' + pct + '%"></div></div>'
                + '</div>';
        }

        const pnlClass = stats.totalPnl >= 0 ? 'up' : 'down';
        const winRateClass = stats.total === 0 ? '' : stats.winRate >= 70 ? 'up' : stats.winRate >= 50 ? '' : 'down';

        return ''
            + '<div class="tr-pattern-card ' + dirClass + '">'
            +   '<div class="tr-pattern-head">'
            +     '<span class="tr-pattern-icon">' + dirLabel + '</span>'
            +     '<span class="tr-pattern-name">' + escapeHtml(name) + '</span>'
            +     (target !== null ? '<span class="tr-pattern-target">เป้า ' + target + '%</span>' : '')
            +   '</div>'
            +   '<div class="tr-pattern-stats">'
            +     '<div class="tr-mini"><span class="tr-mini-label">เทรด</span><span class="tr-mini-value">' + stats.total + '</span></div>'
            +     '<div class="tr-mini"><span class="tr-mini-label">ชนะ/แพ้</span><span class="tr-mini-value"><span class="up">' + stats.wins + '</span> / <span class="down">' + stats.losses + '</span></span></div>'
            +     '<div class="tr-mini"><span class="tr-mini-label">Win Rate</span><span class="tr-mini-value ' + winRateClass + '">' + (stats.total > 0 ? stats.winRate.toFixed(1) + '%' : '-') + '</span></div>'
            +     '<div class="tr-mini"><span class="tr-mini-label">P/L</span><span class="tr-mini-value ' + pnlClass + '">' + (stats.total > 0 ? (stats.totalPnl >= 0 ? '+' : '') + '$' + stats.totalPnl.toFixed(2) : '-') + '</span></div>'
            +   '</div>'
            +   progressBar
            + '</div>';
    }

    function renderPatternBreakdown(entries) {
        const list = document.getElementById('tr-by-pattern');
        if (!list || !window.PATTERNS) return;

        const groups = aggregateByPattern(entries);

        const sorted = window.PATTERNS.slice().sort(function(a, b) {
            if (a.number !== b.number) return a.number - b.number;
            return a.direction === 'buy' ? -1 : 1;
        });

        let html = sorted.map(function(p) {
            return renderPatternRow(p, groups[p.id] || []);
        }).join('');

        if (groups.__unspecified && groups.__unspecified.length > 0) {
            html += renderPatternRow(null, groups.__unspecified);
        }

        list.innerHTML = html;
    }

    function renderEmpty() {
        const overall = document.getElementById('tr-overall');
        const breakdown = document.getElementById('tr-by-pattern');
        if (overall) {
            overall.innerHTML = '<div class="tr-empty">'
                + '<div style="font-size:48px">📊</div>'
                + '<div style="font-size:16px;font-weight:700;margin:12px 0 6px">ยังไม่มีข้อมูล</div>'
                + '<div style="font-size:13px;color:var(--gray)">ไปบันทึกเทรดที่ <a href="/journal" style="color:var(--gold)">📓 Journal</a> และระบุ Pattern ที่ใช้ — สถิติจะอัพเดทอัตโนมัติ</div>'
                + '</div>';
        }
        if (breakdown) breakdown.innerHTML = '';
    }

    function render() {
        const entries = loadEntries();
        if (entries.length === 0) {
            renderEmpty();
            return;
        }
        renderOverall(aggregateOverall(entries));
        renderPatternBreakdown(entries);
    }

    document.addEventListener('app:unlocked', function(ev) {
        userCode = ev.detail.userCode;
        render();
    });
})();
