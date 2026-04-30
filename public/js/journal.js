// ============ JOURNAL PAGE ============
(function() {
    let journalEntries = [];
    let userCode = null;

    function getJournalKey() {
        return 'goldHub_' + userCode + '_journal';
    }

    function loadJournalData() {
        if (!userCode) return;
        journalEntries = JSON.parse(localStorage.getItem(getJournalKey()) || '[]');
        renderJournal();
        updateStats();
    }

    function saveJournalData() {
        if (!userCode) return;
        localStorage.setItem(getJournalKey(), JSON.stringify(journalEntries));
    }

    function addJournal() {
        const d = document.getElementById('j-date').value;
        const pattern = document.getElementById('j-pattern').value;
        const type = document.getElementById('j-type').value;
        const entry = document.getElementById('j-entry').value;
        const exit = document.getElementById('j-exit').value;
        const lot = document.getElementById('j-lot').value;
        const pnl = parseFloat(document.getElementById('j-pnl').value) || 0;
        const notes = document.getElementById('j-notes').value;

        if (!d || !entry || !exit) {
            alert('กรุณากรอกข้อมูลให้ครบ');
            return;
        }

        journalEntries.unshift({
            id: Date.now(),
            d: d, pattern: pattern, type: type, entry: entry, exit: exit, lot: lot, pnl: pnl, notes: notes
        });

        saveJournalData();
        renderJournal();
        updateStats();

        document.getElementById('j-entry').value = '';
        document.getElementById('j-exit').value = '';
        document.getElementById('j-pnl').value = '';
        document.getElementById('j-notes').value = '';
    }

    function deleteEntry(id) {
        if (confirm('ต้องการลบรายการนี้?')) {
            journalEntries = journalEntries.filter(function(e) { return e.id !== id; });
            saveJournalData();
            renderJournal();
            updateStats();
        }
    }

    function updateStats() {
        const total = journalEntries.length;
        const wins = journalEntries.filter(function(e) { return e.pnl > 0; }).length;
        const losses = journalEntries.filter(function(e) { return e.pnl < 0; }).length;
        const totalPnl = journalEntries.reduce(function(sum, e) { return sum + (e.pnl || 0); }, 0);

        document.getElementById('stat-total').textContent = total;
        document.getElementById('stat-win').textContent = wins;
        document.getElementById('stat-loss').textContent = losses;

        const pnlEl = document.getElementById('stat-pnl');
        pnlEl.textContent = (totalPnl >= 0 ? '+' : '') + '$' + totalPnl.toFixed(2);
        pnlEl.className = 'journal-stat-value ' + (totalPnl >= 0 ? 'up' : 'down');
    }

    function getPatternLabel(patternId) {
        if (!patternId || !window.PATTERNS) return '';
        const p = window.PATTERNS.find(function(x) { return x.id === patternId; });
        return p ? p.nameTh : '';
    }

    function renderJournal() {
        const list = document.getElementById('journal-list');

        if (journalEntries.length === 0) {
            list.innerHTML = '<p style="color:var(--dim);text-align:center;padding:40px">ยังไม่มีรายการบันทึก</p>';
            return;
        }

        let html = '';
        for (let i = 0; i < journalEntries.length; i++) {
            const e = journalEntries[i];
            const resultClass = e.pnl >= 0 ? 'win' : 'loss';
            const pnlText = (e.pnl >= 0 ? '+' : '') + '$' + e.pnl.toFixed(2);
            const patternLabel = getPatternLabel(e.pattern);

            html += '<div class="journal-entry">';
            html += '<div class="entry-head">';
            html += '<span class="entry-date">📅 ' + e.d + (patternLabel ? ' · <span style="color:var(--gold)">📈 ' + patternLabel + '</span>' : '') + '</span>';
            html += '<div style="display:flex;align-items:center;gap:12px">';
            html += '<span class="entry-result ' + resultClass + '">' + pnlText + '</span>';
            html += '<button class="entry-delete" data-entry-id="' + e.id + '">🗑️</button>';
            html += '</div></div>';
            html += '<div class="entry-details">';
            html += '<div class="entry-detail"><span>Type:</span> ' + e.type.toUpperCase() + '</div>';
            html += '<div class="entry-detail"><span>Entry:</span> ' + e.entry + '</div>';
            html += '<div class="entry-detail"><span>Exit:</span> ' + e.exit + '</div>';
            html += '<div class="entry-detail"><span>Lot:</span> ' + e.lot + '</div>';
            html += '</div>';
            if (e.notes) {
                html += '<div class="entry-notes">📝 ' + e.notes + '</div>';
            }
            html += '</div>';
        }

        list.innerHTML = html;

        list.querySelectorAll('.entry-delete').forEach(function(btn) {
            btn.addEventListener('click', function() {
                deleteEntry(parseInt(btn.dataset.entryId, 10));
            });
        });
    }

    function exportJournal() {
        if (journalEntries.length === 0) {
            alert('ไม่มีข้อมูลให้ Export');
            return;
        }

        const exportData = {
            version: '1.0',
            userCode: userCode,
            exportedAt: new Date().toISOString(),
            entries: journalEntries
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'trading-journal-' + userCode + '-' + new Date().toISOString().split('T')[0] + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('✅ Export สำเร็จ!');
    }

    function importJournal(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.entries || !Array.isArray(data.entries)) {
                    throw new Error('Invalid');
                }

                if (confirm('พบ ' + data.entries.length + ' รายการ ต้องการนำเข้า?')) {
                    journalEntries = data.entries;
                    saveJournalData();
                    renderJournal();
                    updateStats();
                    alert('✅ Import สำเร็จ!');
                }
            } catch (err) {
                alert('❌ ไฟล์ไม่ถูกต้อง');
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    }

    function clearJournal() {
        if (journalEntries.length === 0) {
            alert('ไม่มีข้อมูลให้ลบ');
            return;
        }

        const confirmText = prompt('⚠️ พิมพ์ "DELETE" เพื่อยืนยันการลบ:');
        if (confirmText === 'DELETE') {
            journalEntries = [];
            saveJournalData();
            renderJournal();
            updateStats();
            alert('✅ ลบข้อมูลแล้ว');
        }
    }

    function populatePatternDropdown() {
        const sel = document.getElementById('j-pattern');
        if (!sel || !window.PATTERNS) return;
        const sorted = window.PATTERNS.slice().sort(function(a, b) {
            if (a.number !== b.number) return a.number - b.number;
            return a.direction === 'buy' ? -1 : 1;
        });
        const options = sorted.map(function(p) {
            const arrow = p.direction === 'buy' ? '🟢' : '🔴';
            return '<option value="' + p.id + '">' + arrow + ' ' + p.nameTh + '</option>';
        }).join('');
        sel.insertAdjacentHTML('beforeend', options);
    }

    function bindHandlers() {
        const dateEl = document.getElementById('j-date');
        if (dateEl) dateEl.valueAsDate = new Date();

        populatePatternDropdown();

        const addBtn = document.getElementById('j-add-btn');
        if (addBtn) addBtn.addEventListener('click', addJournal);

        const exportBtn = document.getElementById('j-export-btn');
        if (exportBtn) exportBtn.addEventListener('click', exportJournal);

        const importBtn = document.getElementById('j-import-btn');
        const importInput = document.getElementById('importFile');
        if (importBtn && importInput) {
            importBtn.addEventListener('click', function() { importInput.click(); });
            importInput.addEventListener('change', importJournal);
        }

        const clearBtn = document.getElementById('j-clear-btn');
        if (clearBtn) clearBtn.addEventListener('click', clearJournal);
    }

    document.addEventListener('app:unlocked', function(ev) {
        userCode = ev.detail.userCode;
        const codeEl = document.getElementById('journalUserCode');
        if (codeEl) codeEl.textContent = userCode;
        loadJournalData();
    });

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindHandlers);
    } else {
        bindHandlers();
    }
})();
