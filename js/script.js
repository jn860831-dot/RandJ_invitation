// 1. 倒數計時器
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

// 2. 捲動顯示動畫
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

// 3. 表單與欄位連動設定（完全對應你目前的 index.html）
const rsvpForm = document.getElementById('rsvp-form');
const successMessage = document.getElementById('rsvp-success');
const formStatus = document.getElementById('form-status');

// (A) 處理「您是怎麼認識新人的？」選「其他」時才顯示並設為必填
const relationshipSelect = document.getElementById('relationship');
const otherRelationshipField = document.getElementById('other-relationship-field');
const otherRelationshipInput = document.getElementById('other-relationship');

function toggleOtherRelationship() {
  if (!relationshipSelect || !otherRelationshipField || !otherRelationshipInput) return;
  const isOther = relationshipSelect.value === 'other';
  otherRelationshipField.hidden = !isOther;
  otherRelationshipInput.required = isOther;
  if (!isOther) otherRelationshipInput.value = '';
}
// 網頁剛載入時先執行一次（先把「其他」說明欄藏起來並取消必填，避免卡住表單）
toggleOtherRelationship();
relationshipSelect?.addEventListener('change', toggleOtherRelationship);

// (B) 處理「紙本喜帖」選「我要我要」時才顯示地址欄並設為必填
const invitationAddressField = document.getElementById('invitation-address-field');
const invitationAddress = document.getElementById('invitation-address');

document.querySelectorAll('input[name="paperInvitation"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const wantsPaperInvitation = radio.checked && radio.value === 'yes';
    if (invitationAddressField) invitationAddressField.hidden = !wantsPaperInvitation;
    if (invitationAddress) {
      invitationAddress.required = wantsPaperInvitation;
      if (!wantsPaperInvitation) invitationAddress.value = '';
    }
  });
});

// 4. 表單送出事件處理（傳送到你的 Google 表單）
rsvpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const formData = new FormData(rsvpForm);

  // 對齊你 Google 表單裡的選項文字
  const ceremonyLabels = { yes: '會', no: '不會' };
  const banquetLabels = { yes: '一定到！', no: '不克參加，獻上我的祝福～～' };
  const guestLabels = {
    0: '我的祝福會到', 1: '1 位', 2: '2 位', 3: '3 位',
    4: '4 位', 5: '5 位以上（我會聯絡你！）'
  };
  const invitationLabels = {
    yes: '我要我要！請寄給我', digital: '電子的就好，謝謝～'
  };

  // 打包成 Google 表單對應的 entry 代碼
  const response = new URLSearchParams({
    'entry.47567131': formData.get('name') || '',
    'entry.817650951': formData.get('phone') || '',
    'entry.702656616': formData.get('email') || '',
    'entry.1167794548': formData.get('relationship') === 'other' ? '其他' : (formData.get('relationship') || ''),
    'entry.1274159287': formData.get('otherRelationship') || '',
    'entry.1865481609': ceremonyLabels[formData.get('ceremony')] || '',
    'entry.1321594175': banquetLabels[formData.get('banquet')] || '',
    'entry.1355534598': guestLabels[formData.get('ceremonyGuests')] || '',
    'entry.789501486': guestLabels[formData.get('banquetGuests')] || '',
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
    
    // 送出成功後隱藏表單，顯示「🎉 回覆已成功送出！」
    rsvpForm.hidden = true;
    if (successMessage) {
      successMessage.hidden = false;
      successMessage.focus();
    }
  } catch (error) {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML = '重新送出出席回覆 <span aria-hidden="true">↗</span>';
    }
    if (formStatus) formStatus.textContent = '目前無法送出，請確認網路連線後再試一次。';
  }
});
