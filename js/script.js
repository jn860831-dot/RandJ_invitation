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

// 表單相關 DOM 元素（對應 HTML 的 rsvp-form）
const rsvpForm = document.getElementById('rsvp-form');
const successMessage = document.getElementById('rsvp-success');
const formStatus = document.getElementById('form-status');
const invitationAddressField = document.getElementById('invitation-address-field');
const invitationAddress = document.getElementById('invitation-address');

// 處理「是否需要紙本喜帖」的地址欄位連動顯示
document.querySelectorAll('input[name="paperInvitation"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const wantsPaperInvitation = radio.checked && radio.value === 'yes';
    if (invitationAddressField) invitationAddressField.hidden = !wantsPaperInvitation;
    if (invitationAddress) invitationAddress.required = wantsPaperInvitation;
    if (!wantsPaperInvitation && invitationAddress) invitationAddress.value = '';
  });
});

// 表單送出事件處理
rsvpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const formData = new FormData(rsvpForm);

  // 文字標籤轉換
  const ceremonyLabels = { yes: '我會我會', no: '應該不會' };
  const banquetLabels = { yes: '一定到！', no: '不克參加，獻上我的祝福～～' };
  const invitationLabels = { yes: '我要我要！請寄給我', digital: '電子的就好，謝謝～' };

  // 對應 Google 表單的 entry 代碼
  const response = new URLSearchParams({
    'entry.47567131': formData.get('name') || '',
    'entry.817650951': formData.get('phone') || '',
    'entry.702656616': formData.get('email') || '',
    'entry.1167794548': formData.get('relationship') === 'other' ? '其他' : (formData.get('relationship') || ''),
    'entry.1274159287': formData.get('otherRelationship') || '',
    'entry.1865481609': ceremonyLabels[formData.get('ceremony')] || '',
    'entry.1321594175': banquetLabels[formData.get('banquet')] || '',
    'entry.1355534598': formData.get('ceremonyGuests') || '',
    'entry.789501486': formData.get('banquetGuests') || '',
    'entry.1361480921': formData.get('diet') || '',
    'entry.1352188447': invitationLabels[formData.get('paperInvitation')] || '',
    'entry.1105773361': formData.get('invitationAddress') || '',
    'entry.65394930': formData.get('message') || ''
  });

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = '正在送出…';
  }
  if (formStatus) formStatus.textContent = '正在傳送您的回覆，請稍候。';

  try {
    await fetch('https://docs.google.com/forms/d/e/1FAIpQLSf2lR-ELavUNSJPtd8Dt1hoCWt8ysJV1hVjBMCwavYgufCkUw/formResponse', {
      method: 'POST', 
      mode: 'no-cors', 
      body: response
    });
    
    // 成功後隱藏表單，顯示感謝提示
    rsvpForm.hidden = true;
    if (successMessage) {
      successMessage.hidden = false;
      successMessage.focus();
    }
  } catch (error) {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '送出出席回覆 <span aria-hidden="true">↗</span>';
    }
    if (formStatus) formStatus.textContent = '目前無法送出，請確認網路連線後再試一次。';
  }
});
