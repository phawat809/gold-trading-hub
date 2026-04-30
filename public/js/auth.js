// ============ AUTH + LOCK SCREEN + SESSION (shared across all pages) ============
(function() {
    const SESSION_CHECK_INTERVAL = 30000;

    let currentUserCode = null;
    let currentToken = null;
    let currentRecordId = null;
    let sessionCheckTimer = null;

    // ---------- Lock screen + Kicked modal HTML templates ----------
    const LOCK_SCREEN_HTML = `
<div class="lock-screen" id="lockScreen">
    <div class="lock-container">
        <div class="lock-box">
            <span class="lock-icon">🔐</span>
            <h2 class="lock-title">Gold Trading Hub</h2>
            <p class="lock-desc">เครื่องมือเทรดทองคำระดับ Pro<br>สำหรับสมาชิก IB เท่านั้น</p>
            <div class="lock-features">
                <div class="lock-feat"><span>🤖</span> AI Suggestion</div>
                <div class="lock-feat"><span>📈</span> Pattern การเทรด</div>
                <div class="lock-feat"><span>🏆</span> Track Record</div>
                <div class="lock-feat"><span>📐</span> Position Calculator</div>
                <div class="lock-feat"><span>📓</span> Trading Journal</div>
                <div class="lock-feat"><span>🎓</span> เคล็ดลับเทรดทอง</div>
            </div>
            <div class="lock-tabs">
                <button class="lock-tab active" data-lock-tab="new">🆕 สมัครใหม่</button>
                <button class="lock-tab" data-lock-tab="existing">👤 มีบัญชีแล้ว</button>
            </div>
            <div class="lock-tab-content active" id="tab-new">
                <div class="lock-steps">
                    <div class="lock-steps-title">📋 วิธีปลดล็อค (สมัครใหม่)</div>
                    <div class="step"><div class="step-num">1</div><div class="step-text">กดปุ่ม <strong>"สมัคร Exness"</strong> ด้านล่าง</div></div>
                    <div class="step"><div class="step-num">2</div><div class="step-text">สมัครบัญชี Exness ให้เสร็จ แล้ว <strong>ส่ง UID</strong> มาทาง Line</div></div>
                    <div class="step"><div class="step-num">3</div><div class="step-text">รับ <strong>รหัสปลดล็อค</strong> แล้วกลับมาใส่ที่นี่</div></div>
                </div>
                <a href="https://one.exnessonelink.com/a/u124g348" target="_blank" class="lock-btn">🚀 สมัคร Exness เลย</a>
            </div>
            <div class="lock-tab-content" id="tab-existing">
                <div class="lock-steps">
                    <div class="lock-steps-title blue">📋 วิธีย้าย IB (มีบัญชีอยู่แล้ว)</div>
                    <div class="step"><div class="step-num blue">1</div><div class="step-text">เปิด <strong>Live Chat</strong> ของ Exness</div></div>
                    <div class="step"><div class="step-num blue">2</div><div class="step-text">พิมพ์ว่า <code>ติดต่อเจ้าหน้าที่</code></div></div>
                    <div class="step"><div class="step-num blue">3</div><div class="step-text">แจ้งว่า <strong>"ต้องการย้าย IB"</strong> และให้รหัส IB ด้านล่าง</div></div>
                </div>
                <div class="ib-code-box"><div class="ib-code-label">รหัส IB</div><div class="ib-code">u124g348</div></div>
                <a href="https://www.exness.com/th/" target="_blank" class="lock-btn blue">💬 เปิด Exness</a>
            </div>
            <div class="divider">มีบัญชีแล้ว? เข้าสู่ระบบ</div>
            <div class="unlock-section" style="border:none;padding-top:0">
                <p class="unlock-title">🔑 เข้าสู่ระบบด้วย Exness Account</p>
                <div class="unlock-input-wrap">
                    <div class="unlock-input-group">
                        <label class="unlock-input-label">Exness Account</label>
                        <input type="text" class="unlock-input" id="loginUsername" placeholder="เลขบัญชี Exness" maxlength="30">
                    </div>
                    <div class="unlock-input-group">
                        <label class="unlock-input-label">Password</label>
                        <input type="password" class="unlock-input" id="loginPassword" placeholder="รหัสผ่าน" maxlength="50">
                    </div>
                    <button class="unlock-btn" id="loginBtn" style="width:100%;padding:16px;font-size:16px;border-radius:12px;margin-top:4px">เข้าสู่ระบบ</button>
                </div>
                <p class="unlock-error" id="unlockError">❌ ข้อมูลไม่ถูกต้องหรือบัญชียังไม่ได้รับอนุมัติ</p>
            </div>
            <div class="contact-info">📱 ติดต่อขอรหัส: <a href="https://lin.ee/n1rfIs5" target="_blank">Line: @735kzotg</a></div>
        </div>
    </div>
</div>
`;

    const KICKED_MODAL_HTML = `
<div class="modal-overlay" id="kickedModal">
    <div class="modal">
        <div class="modal-icon">🚫</div>
        <h3 class="modal-title">ถูกออกจากระบบ</h3>
        <p class="modal-desc">มีการเข้าสู่ระบบจากอุปกรณ์อื่น บัญชีของคุณถูกล็อกเอาท์อัตโนมัติ</p>
        <div class="modal-actions">
            <button class="btn btn-small" id="kickedOkBtn">ตกลง</button>
        </div>
    </div>
</div>
`;

    // ---------- Render shared chrome ----------
    function renderChrome() {
        document.body.insertAdjacentHTML('afterbegin', KICKED_MODAL_HTML + LOCK_SCREEN_HTML);

        // Wire up lock screen handlers
        document.querySelectorAll('.lock-tab').forEach(function(btn) {
            btn.addEventListener('click', function() {
                showLockTab(btn.dataset.lockTab);
            });
        });
        document.getElementById('loginBtn').addEventListener('click', tryUnlock);
        document.getElementById('loginUsername').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') document.getElementById('loginPassword').focus();
        });
        document.getElementById('loginPassword').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') tryUnlock();
        });
        document.getElementById('kickedOkBtn').addEventListener('click', function() {
            location.reload();
        });
    }

    function showLockTab(tab) {
        document.querySelectorAll('.lock-tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.lock-tab-content').forEach(function(c) { c.classList.remove('active'); });
        document.querySelector('.lock-tab[data-lock-tab="' + tab + '"]').classList.add('active');
        document.getElementById('tab-' + tab).classList.add('active');
    }

    // ---------- Session monitor ----------
    function startSessionMonitor() {
        if (sessionCheckTimer) clearInterval(sessionCheckTimer);
        sessionCheckTimer = setInterval(async function() {
            if (!currentRecordId || !currentToken) return;
            try {
                const resp = await fetch('/api/verify-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recordId: currentRecordId, token: currentToken })
                });
                const data = await resp.json();
                if (!data.valid) {
                    clearInterval(sessionCheckTimer);
                    showKickedModal();
                }
            } catch(e) {
                console.error('Session check error:', e);
            }
        }, SESSION_CHECK_INTERVAL);
    }

    function showKickedModal() {
        document.getElementById('kickedModal').classList.add('show');
        document.getElementById('lockScreen').classList.remove('hidden');
        const main = document.getElementById('mainContent');
        if (main) main.classList.remove('unlocked');
        clearStorage();
        currentUserCode = null;
        currentToken = null;
        currentRecordId = null;
    }

    function clearStorage() {
        localStorage.removeItem('goldHub_currentCode');
        localStorage.removeItem('goldHub_token');
        localStorage.removeItem('goldHub_recordId');
    }

    // ---------- Login flow ----------
    async function tryUnlock() {
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value.trim();
        const error = document.getElementById('unlockError');
        const btn = document.getElementById('loginBtn');

        if (!username || !password) {
            error.textContent = '❌ กรุณากรอกข้อมูลให้ครบ';
            error.classList.add('show');
            setTimeout(function() { error.classList.remove('show'); }, 3000);
            return;
        }

        btn.textContent = '⏳ กำลังตรวจสอบ...';
        btn.disabled = true;

        try {
            const resp = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: username, password: password })
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.error || 'login_failed');

            currentUserCode = username;
            currentToken = data.token;
            currentRecordId = data.recordId;
            localStorage.setItem('goldHub_currentCode', username);
            localStorage.setItem('goldHub_token', data.token);
            localStorage.setItem('goldHub_recordId', String(data.recordId));

            unlock();
            startSessionMonitor();

        } catch(e) {
            let msg = '❌ เลขบัญชีหรือรหัสผ่านไม่ถูกต้อง';
            if (e.message === 'not_approved') msg = '❌ บัญชียังไม่ได้รับอนุมัติ กรุณาติดต่อแอดมิน';
            error.textContent = msg;
            error.classList.add('show');
            setTimeout(function() { error.classList.remove('show'); }, 4000);
        } finally {
            btn.textContent = 'เข้าสู่ระบบ';
            btn.disabled = false;
        }
    }

    async function checkUnlocked() {
        const savedCode = localStorage.getItem('goldHub_currentCode');
        const savedToken = localStorage.getItem('goldHub_token');
        const savedRecordId = localStorage.getItem('goldHub_recordId');

        if (savedCode && savedToken && savedRecordId) {
            try {
                const resp = await fetch('/api/verify-token', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ recordId: savedRecordId, token: savedToken })
                });
                const data = await resp.json();
                if (data.valid) {
                    currentUserCode = savedCode;
                    currentToken = savedToken;
                    currentRecordId = savedRecordId;
                    unlock();
                    startSessionMonitor();
                    return;
                }
            } catch(e) {
                console.error('Auto-login check failed:', e);
            }
            clearStorage();
        }
    }

    function unlock() {
        document.getElementById('lockScreen').classList.add('hidden');
        const main = document.getElementById('mainContent');
        if (main) main.classList.add('unlocked');

        const display = document.getElementById('displayCode');
        if (display) display.textContent = currentUserCode;

        document.dispatchEvent(new CustomEvent('app:unlocked', {
            detail: { userCode: currentUserCode, recordId: currentRecordId }
        }));
    }

    function logout() {
        if (!confirm('ต้องการออกจากระบบ?')) return;
        if (currentRecordId) {
            fetch('/api/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recordId: currentRecordId })
            }).catch(function(){});
        }
        clearStorage();
        if (sessionCheckTimer) clearInterval(sessionCheckTimer);
        location.reload();
    }

    // Expose API
    window.appAuth = {
        getUserCode: function() { return currentUserCode; },
        logout: logout,
    };

    // ---------- Init on DOM ready ----------
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    function init() {
        renderChrome();
        checkUnlocked();
    }
})();
