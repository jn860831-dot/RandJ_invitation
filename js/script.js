// =========================================================
// 婚禮邀請函 互動腳本
// =========================================================

// ---------- 倒數計時：請改成你們實際的婚禮日期時間 ----------
const WEDDING_DATE = new Date('2027-01-01T16:00:00+08:00').getTime();

function updateCountdown() {
  const now = Date.now();
  const diff = WEDDING_DATE - now;

  const els = {
    days: document.getElementById('cd-days'),
    hours: document.getElementById('cd-hours'),
    minutes: document.getElementById('cd-minutes'),
    seconds: document.getElementById('cd-seconds'),
  };
  if (!els.days) return;

  if (diff <= 0) {
    els.days.textContent = '00';
    els.hours.textContent = '00';
    els.minutes.textContent = '00';
    els.seconds.textContent = '00';
    return;
  }

  const pad = (n) => String(n).padStart(2, '0');
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  els.days.textContent = pad(days);
  els.hours.textContent = pad(hours);
  els.minutes.textContent = pad(minutes);
  els.seconds.textContent = pad(seconds);
}
updateCountdown();
setInterval(updateCountdown, 1000);

// ---------- 進場遮罩：點擊後淡出並嘗試播放背景音樂 ----------
const entryOverlay = document.getElementById('entry-overlay');
const entryBtn = document.getElementById('entry-btn');
const bgMusic = document.getElementById('bg-music');
const musicToggle = document.getElementById('music-toggle');

entryBtn.addEventListener('click', () => {
  entryOverlay.classList.add('hidden');
  // 若已在 index.html 加上 <source src="assets/music.mp3">，這裡會自動嘗試播放
  if (bgMusic.querySelector('source')) {
    bgMusic.play().catch(() => {
      // 自動播放被瀏覽器擋下時，維持暫停圖示即可，使用者可自行點擊音樂按鈕播放
      musicToggle.classList.add('paused');
    });
  } else {
    musicToggle.classList.add('paused');
  }
});

musicToggle.addEventListener('click', () => {
  if (!bgMusic.querySelector('source')) {
    // 尚未設定音樂檔案時，僅切換圖示狀態，方便預覽介面
    musicToggle.classList.toggle('paused');
    return;
  }
  if (bgMusic.paused) {
    bgMusic.play();
    musicToggle.classList.remove('paused');
  } else {
    bgMusic.pause();
    musicToggle.classList.add('paused');
  }
});

// ---------- 捲動淡入動畫 ----------
const revealEls = document.querySelectorAll('.reveal');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });
revealEls.forEach((el) => observer.observe(el));

// ---------- 加入行事曆（Google 日曆連結，時間請依實際婚禮資訊調整） ----------
const addCalendarBtn = document.getElementById('add-calendar');
if (addCalendarBtn) {
  addCalendarBtn.addEventListener('click', (e) => {
    e.preventDefault();
    const start = '20270101T160000';
    const end = '20270101T210000';
    const title = encodeURIComponent('【新郎姓名】& 【新娘姓名】的婚禮');
    const details = encodeURIComponent('誠摯邀請您參加我們的婚禮，期待與您相聚！');
    const location = encodeURIComponent('【婚宴會館名稱】【詳細地址】');
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${start}/${end}&details=${details}&location=${location}&ctz=Asia/Taipei`;
    window.open(url, '_blank');
  });
}

// ---------- 出席回覆表單：串接 Google 表單 ----------
// 已對應到目前的 Google 表單（forms.gle/uKH17kAHYR9hqPQi9，姓名／是否參加 2 題）。
// 之後若在 Google 表單改了題目或新增欄位，記得同步更新下面的 entry ID 對照。
const GOOGLE_FORM_ACTION = 'https://docs.google.com/forms/d/e/1FAIpQLScT6mbp99DIvKx7zVq1uTj154-c5LBlfP1KTl7icwi0ndaDXQ/formResponse';
const RSVP_FIELD_MAP = {
  name: 'entry.1578248924',   // 姓名
  attend: 'entry.1728751231', // 是否參加
};

// 把選項的英文代碼換成中文文字，需與 Google 表單裡的選項文字完全一致
const RSVP_VALUE_LABELS = {
  attend: { yes: '是', no: '否' },
};

const rsvpForm = document.getElementById('rsvp-form');
const rsvpThanks = document.getElementById('rsvp-thanks');

if (rsvpForm) {
  rsvpForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const formData = new FormData(rsvpForm);
    const isConfigured =
      !GOOGLE_FORM_ACTION.includes('你的表單ID') &&
      Object.values(RSVP_FIELD_MAP).every((entryId) => !entryId.includes('XXXXXXXXX'));

    const finish = () => {
      rsvpForm.hidden = true;
      rsvpThanks.hidden = false;
    };

    if (!isConfigured) {
      // 尚未完成上面的 Google 表單設定前，先只顯示感謝畫面，資料不會被送出
      console.warn('尚未設定 Google 表單，請完成 script.js 最上方 GOOGLE_FORM_ACTION 與 RSVP_FIELD_MAP 的設定');
      finish();
      return;
    }

    const googleData = new FormData();
    Object.entries(RSVP_FIELD_MAP).forEach(([fieldName, entryId]) => {
      const rawValue = formData.get(fieldName) || '';
      const label = RSVP_VALUE_LABELS[fieldName]?.[rawValue] ?? rawValue;
      googleData.append(entryId, label);
    });

    // Google 表單的收單端點不允許讀取回應內容，用 no-cors 送出即可，不用等回傳結果判斷成功與否
    fetch(GOOGLE_FORM_ACTION, {
      method: 'POST',
      mode: 'no-cors',
      body: googleData,
    }).finally(finish);
  });
}
