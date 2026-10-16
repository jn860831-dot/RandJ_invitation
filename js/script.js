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

// 草稿保留在此瀏覽器；成功與否以 Google 顯示的結果為準。
const draftKey = 'randj-rsvp-draft-v1';
function saveDraft() {
  try {
    const draft = {};
    for (const el of rsvpForm.elements) {
      if (!el.name || (el.type === 'radio' && !el.checked)) continue;
      draft[el.name] = el.value;
    }
    localStorage.setItem(draftKey, JSON.stringify({ savedAt: Date.now(), values: draft }));
    return true;
  } catch (_) { return false; }
}
try {
  const draft = JSON.parse(localStorage.getItem(draftKey) || 'null');
  if (draft && Date.now() - draft.savedAt < 7 * 86400000) {
    for (const el of rsvpForm.elements) {
      if (!el.name || !(el.name in draft.values)) continue;
      if (el.type === 'radio') el.checked = el.value === draft.values[el.name];
      else el.value = draft.values[el.name];
    }
    toggleOtherRelationship();
    const wantsPaper = rsvpForm.elements.paperInvitation.value === 'yes';
    invitationAddressField.hidden = !wantsPaper;
    invitationAddress.required = wantsPaper;
  }
} catch (_) {}
rsvpForm?.addEventListener('input', saveDraft);
rsvpForm?.addEventListener('change', saveDraft);
const clearDraft = document.createElement('button');
clearDraft.type = 'button';
clearDraft.textContent = '清除本機草稿';
clearDraft.addEventListener('click', () => {
  try { localStorage.removeItem(draftKey); } catch (_) {}
  formStatus.textContent = '本機草稿已清除；畫面內容仍保留。繼續編輯會重新儲存草稿。';
});
rsvpForm?.append(clearDraft);

// 4. 表單送出事件處理（傳送到你的 Google 表單）
rsvpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const formData = new FormData(rsvpForm);
  const saved = saveDraft();
  const relationshipLabels = {
    '新郎的家人/親友': '新郎的家人／親友',
    '新娘的家人/親友': '新娘的家人／親友',
    '大學同學/朋友': '大學同學',
    '研究所同學/朋友': '研究所同學',
    '高中同學/朋友': '高中同學',
    '教會朋友': '教會朋友', other: '其他'
  };

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
    'entry.1167794548': relationshipLabels[formData.get('relationship')] || '',
    'entry.1274159287': formData.get('otherRelationship') || formData.get('relationship') || '',
    'entry.1865481609': ceremonyLabels[formData.get('ceremony')] || '',
    'entry.1321594175': banquetLabels[formData.get('banquet')] || '',
    'entry.1355534598': guestLabels[formData.get('ceremonyGuests')] || '',
    'entry.789501486': guestLabels[formData.get('banquetGuests')] || '',
    'entry.1361480921': formData.get('diet') || '',
    'entry.1352188447': invitationLabels[formData.get('paperInvitation')] || '',
    'entry.1105773361': formData.get('invitationAddress') || '',
    'entry.65394930': formData.get('message') || ''
  });

  // 原生 POST 讓賓客直接看見 Google 的確認或驗證錯誤頁面。
  // 跨來源 fetch/no-cors 和 iframe load 都不能證明資料已儲存。
  const transport = document.createElement('form');
  transport.method = 'POST';
  transport.action = 'https://docs.google.com/forms/d/e/1FAIpQLSf2lR-ELavUNSJPtd8Dt1hoCWt8ysJV1hVjBMCwavYgufCkUw/formResponse';
  transport.target = '_blank';
  transport.rel = 'noopener';
  for (const [name, value] of response) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    transport.append(input);
  }
  document.body.append(transport);
  try {
    transport.submit();
    formStatus.textContent = '已開啟 Google 表單處理頁；請確認該頁顯示「已收到回覆」才算完成。若未開啟請允許新分頁。'
      + (saved ? '填寫草稿已保留於此瀏覽器七天，確認成功後可清除。' : '此瀏覽器無法儲存草稿，請保留本頁直到確認成功。')
      + '若結果不明，請先聯絡新人確認，避免重複送出。';
  } catch (_) {
    formStatus.textContent = '未能開啟提交頁，請保留本頁並再試一次。填寫內容未清除。';
  } finally { transport.remove(); }
});
