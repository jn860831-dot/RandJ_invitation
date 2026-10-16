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

// 表單相關 DOM 元素
const rsvpForm = document.getElementById('weddingRsvpForm');
const successMessage = document.getElementById('successMsg');

// 表單送出事件處理
rsvpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');

  // 1. 收集複選的出席場次（這部分有寫 name="attendance"，所以可以這樣抓）
  const attendanceNodes = document.querySelectorAll('input[name="attendance"]:checked');
  let attendanceArr = [];
  attendanceNodes.forEach((node) => {
    attendanceArr.push(node.value);
  });

  // 2. 直接透過 ID 抓取 HTML 欄位的值（完美對應你的 HTML 結構）
  const guestName = document.getElementById('guestName')?.value || '';
  const guestPhone = document.getElementById('guestPhone')?.value || '';
  const guestCount = document.getElementById('guestCount')?.value || '';
  const dietPreference = document.getElementById('dietPreference')?.value || '';
  const blessingNote = document.getElementById('blessingNote')?.value || '';

  // 3. 對應你的 Google 表單 entry 代碼
  const response = new URLSearchParams({
    'entry.47567131': guestName,                 // 您的姓名
    'entry.817650951': guestPhone,               // 聯絡電話
    'entry.1865481609': attendanceArr.join(', '), // 預計參與場次 (複選)
    'entry.1355534598': guestCount,              // 出席總人數
    'entry.1361480921': dietPreference,          // 飲食習慣
    'entry.65394930': blessingNote               // 給新人的祝福話語
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
