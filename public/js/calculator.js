// ============ CALCULATOR PAGE - Position/Risk/Compound ============
(function() {
    function showSection(id, ev) {
        document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        const target = document.getElementById(id);
        if (target) target.classList.add('active');
        if (ev && ev.target) {
            const tab = ev.target.closest('.tab');
            if (tab) tab.classList.add('active');
        }
    }

    function calcPos() {
        const b = parseFloat(document.getElementById('p-bal').value) || 0;
        const r = parseFloat(document.getElementById('p-risk').value) || 0;
        const sl = parseFloat(document.getElementById('p-sl').value) || 1;
        const tp = parseFloat(document.getElementById('p-tp').value) || 1;
        const p = parseFloat(document.getElementById('p-pip').value) || 10;
        const amt = b * (r / 100);
        const lot = amt / (sl * p);
        const profit = (tp / sl) * amt;
        document.getElementById('p-lot').textContent = lot.toFixed(2) + ' Lot';
        document.getElementById('p-amt').textContent = '$' + amt.toFixed(2);
        document.getElementById('p-loss').textContent = '-$' + amt.toFixed(2);
        document.getElementById('p-profit').textContent = '+$' + profit.toFixed(2);
        document.getElementById('p-res').style.display = 'block';
    }

    function calcRR() {
        const e = parseFloat(document.getElementById('r-entry').value) || 0;
        const s = parseFloat(document.getElementById('r-sl').value) || 0;
        const t = parseFloat(document.getElementById('r-tp').value) || 0;
        const type = document.getElementById('r-type').value;
        let rPips, rwPips;
        if (type === 'buy') {
            rPips = Math.abs(e - s) * 10;
            rwPips = Math.abs(t - e) * 10;
        } else {
            rPips = Math.abs(s - e) * 10;
            rwPips = Math.abs(e - t) * 10;
        }
        const ratio = rwPips / rPips;
        document.getElementById('r-ratio').textContent = '1:' + ratio.toFixed(2);
        document.getElementById('r-risk').textContent = rPips.toFixed(0) + ' pips';
        document.getElementById('r-reward').textContent = rwPips.toFixed(0) + ' pips';
        document.getElementById('r-res').style.display = 'block';
    }

    function calcComp() {
        const start = parseFloat(document.getElementById('c-start').value) || 0;
        const mon = parseFloat(document.getElementById('c-mon').value) || 0;
        const months = parseInt(document.getElementById('c-months').value) || 1;
        let bal = start;
        for (let i = 0; i < months; i++) {
            bal = bal * (1 + mon / 100);
        }
        const profit = bal - start;
        const grow = ((bal - start) / start) * 100;
        document.getElementById('c-final').textContent = '$' + bal.toLocaleString(undefined, {maximumFractionDigits: 0});
        document.getElementById('c-profit').textContent = '+$' + profit.toLocaleString(undefined, {maximumFractionDigits: 0});
        document.getElementById('c-grow').textContent = '+' + grow.toFixed(0) + '%';
        document.getElementById('c-res').style.display = 'block';
    }

    function bindHandlers() {
        document.querySelectorAll('[data-tab-target]').forEach(function(tab) {
            tab.addEventListener('click', function(ev) {
                showSection(tab.dataset.tabTarget, ev);
            });
        });
        const posBtn = document.getElementById('p-calc-btn');
        if (posBtn) posBtn.addEventListener('click', calcPos);
        const rrBtn = document.getElementById('r-calc-btn');
        if (rrBtn) rrBtn.addEventListener('click', calcRR);
        const compBtn = document.getElementById('c-calc-btn');
        if (compBtn) compBtn.addEventListener('click', calcComp);
    }

    function init() {
        // Run initial Position calculation with default values
        if (document.getElementById('p-bal')) calcPos();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bindHandlers);
    } else {
        bindHandlers();
    }
    document.addEventListener('app:unlocked', init);
})();
