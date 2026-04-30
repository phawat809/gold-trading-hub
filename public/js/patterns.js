// ============ PATTERN LIBRARY PAGE ============
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

    function makeWatermarkUrl(code) {
        const safeCode = escapeHtml(code || 'GOLD-HUB');
        const svg = ''
            + '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120">'
            +   '<text x="20" y="60" fill="rgba(255,255,255,0.18)" font-size="14" font-family="monospace" font-weight="700" transform="rotate(-20 120 60)">'
            +     safeCode
            +   '</text>'
            + '</svg>';
        return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
    }

    function renderCard(pattern) {
        const dirClass = pattern.direction === 'buy' ? 'buy' : 'sell';
        const dirLabel = pattern.direction === 'buy' ? '🟢 BUY' : '🔴 SELL';
        const watermarkUrl = makeWatermarkUrl(userCode);

        const imageStyle = ''
            + 'background-image: url(' + JSON.stringify(watermarkUrl) + '), url(' + JSON.stringify(pattern.image) + ');'
            + 'background-repeat: repeat, no-repeat;'
            + 'background-size: 240px 120px, cover;'
            + 'background-position: center;';

        return ''
            + '<div class="pattern-card-v2 ' + dirClass + '" data-pattern-id="' + escapeHtml(pattern.id) + '">'
            +   '<div class="pattern-image-wrap">'
            +     '<div class="pattern-image" style="' + imageStyle + '">'
            +       '<div class="pattern-image-placeholder">'
            +         '<span style="font-size:48px">📷</span>'
            +         '<span>รอภาพ Pattern ' + pattern.number + ' (' + pattern.direction.toUpperCase() + ')</span>'
            +       '</div>'
            +     '</div>'
            +     '<div class="pattern-direction ' + dirClass + '">' + dirLabel + '</div>'
            +     '<div class="pattern-number">#' + pattern.number + '</div>'
            +   '</div>'
            +   '<div class="pattern-body">'
            +     '<h3 class="pattern-title">' + escapeHtml(pattern.nameTh) + '</h3>'
            +     '<div class="pattern-subtitle">' + escapeHtml(pattern.nameEn) + '</div>'
            +     '<div class="pattern-meta">'
            +       '<span class="pattern-meta-item">⏱ Timeframe: <strong>' + escapeHtml(pattern.timeframe) + '</strong></span>'
            +     '</div>'
            +     '<div class="pattern-rules">'
            +       '<div class="pattern-rule"><span class="rule-label">📍 Entry</span><span class="rule-value">' + escapeHtml(pattern.rules.entry) + '</span></div>'
            +       '<div class="pattern-rule sl"><span class="rule-label">🛑 SL</span><span class="rule-value">' + escapeHtml(pattern.rules.sl) + '</span></div>'
            +       '<div class="pattern-rule tp"><span class="rule-label">🎯 TP</span><span class="rule-value">' + escapeHtml(pattern.rules.tp) + '</span></div>'
            +       (pattern.rules.note ? '<div class="pattern-note">💡 ' + escapeHtml(pattern.rules.note) + '</div>' : '')
            +     '</div>'
            +   '</div>'
            + '</div>';
    }

    function renderGrid() {
        const grid = document.getElementById('patternGrid');
        if (!grid || !window.PATTERNS) return;

        // Sort: by number, then buy before sell
        const sorted = window.PATTERNS.slice().sort(function(a, b) {
            if (a.number !== b.number) return a.number - b.number;
            return a.direction === 'buy' ? -1 : 1;
        });

        grid.innerHTML = sorted.map(renderCard).join('');
    }

    // ---------- Anti-copy protections (deters casual users) ----------
    function installAntiCopy() {
        document.addEventListener('contextmenu', function(e) {
            if (e.target.closest('.pattern-image, .pattern-card-v2')) {
                e.preventDefault();
            }
        });

        document.addEventListener('dragstart', function(e) {
            if (e.target.closest('.pattern-card-v2')) {
                e.preventDefault();
            }
        });

        // Disable common save shortcuts on this page
        document.addEventListener('keydown', function(e) {
            const key = e.key ? e.key.toLowerCase() : '';
            if (e.ctrlKey && (key === 's' || key === 'u')) {
                e.preventDefault();
            }
            if (e.ctrlKey && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) {
                e.preventDefault();
            }
            if (key === 'f12') {
                e.preventDefault();
            }
        });
    }

    document.addEventListener('app:unlocked', function(ev) {
        userCode = ev.detail.userCode;
        renderGrid();
        installAntiCopy();
    });
})();
