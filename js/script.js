// 倒數計時器
const weddingDate = new Date('2027-05-15T09:00:00+08:00').getTime();

function updateCountdown() {
  const remaining = Math.max(0, weddingDate - Date.now());
  const values = { 
    days: Math.floor(remaining / 86400000), 
    hours: Math.floor((remaining / 3600000) % 24), 
    minutes: Math.floor((remaining / 60000) % 60), 
    seconds: Math.floor((remaining / 1000) % 60) 
  };
  Object.entries(values).forEach(([unit, value]) => {
    const target = document.getElementById(`cd-${unit}`);
    if (target) target.textContent = String(value).padStart(unit === 'days' ? 3 : 2, '0');
  });
}
updateCountdown();
window.setInterval(updateCountdown, 1000);

// 捲動顯示動畫
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

// 表單相關 DOM 元素（完美對應你目前 HTML 的 id）
const rsvpForm = document.getElementById('weddingRsvpForm');
const successMessage = document.getElementById('successMsg');

// 表單送出事件處理
rsvpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const formData = new FormData(rsvpForm);

  // 1. 收集複選的出席場次
  const attendanceNodes = document.querySelectorAll('input[name="attendance"]:checked');
  let attendanceArr = [];
  attendanceNodes.forEach((node) => {
    attendanceArr.push(node.value);
  });

  // 2. 對應你 Google 表單的 entry 代碼 (已精準對應你當前 HTML 的欄位名稱)
  const response = new URLSearchParams({
    'entry.47567131': formData.get('guestName') || '',        // 您的姓名
    'entry.817650951': formData.get('guestPhone') || '',      // 聯絡電話
    'entry.1865481609': attendanceArr.join(', ') || '',       // 預計參與場次 (複選)
    'entry.1355534598': formData.get('guestCount') || '',     // 出席總人數
    'entry.1361480921': formData.get('dietPreference') || '', // 飲食習慣
    'entry.65394930': formData.get('blessingNote') || ''      // 給新人的祝福話語
  });

  // 按鈕狀態切換
  submitButton.disabled = true;
  submitButton.textContent = '正在送出…';

  try {
    // 發送到 Google 表單 (使用 no-cors 模式避開跨域阻擋)
    await fetch('https://docs.google.com/forms/d/e/1FAIpQLSf2lR-ELavUNSJPtd8Dt1hoCWt8ysJV1hVjBMCwavYgufCkUw/formResponse', {
      method: 'POST', 
      mode: 'no-cors', 
      body: response
    });
    
    // 成功後隱藏表單，顯示感謝提示
    rsvpForm.style.display = 'none';
    if (successMessage) {
      successMessage.style.display = 'block';
      successMessage.focus();
    }
  } catch (error) {
    console.error("Error:", error);
    submitButton.disabled = false;
    submitButton.textContent = '送出出席回覆';
    alert('目前無法送出，請確認網路連線後再試一次。');
  }
});
