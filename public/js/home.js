// ============ HOME PAGE - AI Suggestion ============
(function() {
    let pollTimer = null;

    async function loadInsight() {
        try {
            const resp = await fetch('/api/insight');
            const result = await resp.json();
            if (result.data) {
                updateOutlookUI(result.data);
            } else {
                updateOutlookUI({
                    content: '📊 ยังไม่มีบทวิเคราะห์ประจำวัน\n\nรอแอดมินอัพเดทบทวิเคราะห์ใหม่ หรือติดตามข่าวสารผ่าน Line OA',
                    sentiment: 'neutral',
                    update_time: null
                });
            }
        } catch (e) {
            console.log('Failed to load AI outlook:', e);
        }
    }

    function updateOutlookUI(data) {
        const widget = document.getElementById('aiOutlookWidget');
        const sentimentEl = document.getElementById('outlookSentiment');
        const contentEl = document.getElementById('outlookContent');
        const timeEl = document.getElementById('outlookTime');
        if (!widget) return;

        widget.className = 'ai-outlook-widget ' + (data.sentiment || 'neutral');

        const sentimentConfig = {
            bullish: { icon: '📈', text: 'BULLISH - แนวโน้มขึ้น' },
            bearish: { icon: '📉', text: 'BEARISH - แนวโน้มลง' },
            neutral: { icon: '➡️', text: 'NEUTRAL - Sideways' }
        };
        const config = sentimentConfig[data.sentiment] || sentimentConfig.neutral;
        sentimentEl.innerHTML = '<span class="sentiment-icon">' + config.icon + '</span><span class="sentiment-text">' + config.text + '</span>';
        contentEl.innerHTML = '<p>' + (data.content || 'ไม่มีข้อมูล') + '</p>';

        if (data.update_time) {
            const date = new Date(data.update_time);
            timeEl.textContent = 'อัพเดท: ' + date.toLocaleString('th-TH');
        } else {
            timeEl.textContent = '';
        }
    }

    function init() {
        loadInsight();
        if (pollTimer) clearInterval(pollTimer);
        pollTimer = setInterval(loadInsight, 300000); // 5 min
    }

    document.addEventListener('app:unlocked', init);
})();
