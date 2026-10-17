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

    }
  });
});

// Only acknowledge a confirmed backend save. Configure after Apps Script deployment.
const RSVP_ENDPOINT = 'https://script.google.com/macros/s/AKfycbyMxDPW3fi1mUsa9Gev1yR9u42V5_pPX3uAiLmuq6Kbirwx9cgnQRrayOucH2F6R90h/exec'; // https://script.google.com/macros/s/DEPLOYMENT_ID/exec
const pendingKey = 'randj-rsvp-pending-v2';
let sending = false;
let pendingRequest = null;
try {
  pendingRequest = JSON.parse(localStorage.getItem(pendingKey) || 'null');
  if (pendingRequest && (!pendingRequest.savedAt || Date.now() - pendingRequest.savedAt >= 7 * 86400000)) {
    pendingRequest = null;
    localStorage.removeItem(pendingKey);
  }
} catch (_) { pendingRequest = null; }
function clearPending() {
  pendingRequest = null;
  try { localStorage.removeItem(pendingKey); } catch (_) {}
}
// Drafts are local to this browser, restored for up to seven days.
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
// Keep attendance counts in the existing fields so backend mappings stay unchanged.
['ceremony', 'banquet'].forEach((eventName) => {
  const guests = rsvpForm?.elements.namedItem(`${eventName}Guests`);
  if (!guests) return;
  const syncGuests = () => {
    const attendance = rsvpForm.querySelector(`input[name="${eventName}"]:checked`);
    if (attendance?.value === 'no') guests.value = '0';
    else if (attendance?.value === 'yes' && guests.value === '0') guests.value = '';
  };
  rsvpForm.querySelectorAll(`input[name="${eventName}"]`).forEach((radio) => {
    radio.addEventListener('change', syncGuests);
  });
  syncGuests();
});

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
  if (sending || !rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const formData = new FormData(rsvpForm);
  const saved = saveDraft();
  const relationshipLabels = {
    '新郎的家人/親友': '新郎的家人／親友',
    '新娘的家人/親友': '新娘的家人／親友',
    '大學同學/朋友': '大學同學/朋友',
    '研究所同學/朋友': '研究所同學/朋友',
    '高中同學/朋友': '高中同學/朋友',
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
    'entry.1274159287': formData.get('relationship') === 'other' ? (formData.get('otherRelationship') || '') : (formData.get('relationship') || ''),
    'entry.1865481609': ceremonyLabels[formData.get('ceremony')] || '',
    'entry.1321594175': banquetLabels[formData.get('banquet')] || '',
    'entry.1355534598': guestLabels[formData.get('ceremonyGuests')] || '',
    'entry.789501486': guestLabels[formData.get('banquetGuests')] || '',
    'entry.1361480921': formData.get('diet') || '',
    'entry.1352188447': invitationLabels[formData.get('paperInvitation')] || '',
    'entry.1105773361': formData.get('paperInvitation') === 'yes' ? (formData.get('invitationAddress') || '') : '',
    'entry.65394930': formData.get('message') || ''
  });

  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(RSVP_ENDPOINT)) {
    formStatus.textContent = '測試版尚未連接回覆服務，暫時無法送出。填寫內容已保留。';
    return;
  }
  if (location.origin === 'null') {
    formStatus.textContent = '請使用測試網站網址開啟本頁，直接開啟本機檔案無法提交。內容已保留。';
    return;
  }
  const payload = JSON.stringify(Object.fromEntries(response));
  if (pendingRequest && pendingRequest.payload !== payload) {
    formStatus.textContent = '上一筆回覆尚未確認，請先聯絡新人查核，再修改或重送，以免重複登記。內容已保留。';
    return;
  }
  if (!pendingRequest) pendingRequest = {requestId: crypto.randomUUID(), payload, savedAt: Date.now()};
  try { localStorage.setItem(pendingKey, JSON.stringify(pendingRequest)); } catch (_) {}
  const nonce = crypto.randomUUID();
  sending = true;
  const originalButton = submitButton.innerHTML;
  const disabledState = Array.from(rsvpForm.elements, el => [el, el.disabled]);
  disabledState.forEach(([el]) => { el.disabled = true; });
  submitButton.disabled = true;
  submitButton.textContent = '正在送出…';
  formStatus.textContent = '正在確認回覆是否儲存，請稍候。' + (saved ? '' : '本機草稿無法儲存，請保留本頁。');
  const iframe = document.createElement('iframe');
  iframe.name = 'rsvp-' + nonce;
  iframe.hidden = true;
  iframe.title = '出席回覆傳送服務';
  const transport = document.createElement('form');
  transport.method = 'POST';
  transport.action = RSVP_ENDPOINT;
  transport.target = iframe.name;
  transport.hidden = true;
  for (const [name, value] of Object.entries({payload, requestId:pendingRequest.requestId, nonce, origin:location.origin})) {
    const input = document.createElement('input');
    input.type = 'hidden'; input.name = name; input.value = value;
    transport.append(input);
  }
  document.body.append(iframe, transport);
  const requestId = pendingRequest.requestId;
  let timer;
  function finish() {
    clearTimeout(timer);
    window.removeEventListener('message', onResult);
    iframe.remove(); transport.remove();
    sending = false;
    disabledState.forEach(([el, disabled]) => { el.disabled = disabled; });
    submitButton.disabled = false;
    submitButton.innerHTML = originalButton;
  }
  function onResult(event) {
    let origin;
    try { origin = new URL(event.origin); } catch (_) { return; }
    if (origin.protocol !== 'https:' ||
        !(origin.hostname === 'script.google.com' || origin.hostname === 'script.googleusercontent.com' ||
          /^[a-z0-9-]+-script\.googleusercontent\.com$/.test(origin.hostname))) return;
    const data = event.data;
    if (!data || data.type !== 'randj-rsvp-result' || data.requestId !== requestId || data.nonce !== nonce) return;
    finish();
    if (data.ok === true && data.code === 'saved') {
      clearPending();
      try { localStorage.removeItem(draftKey); } catch (_) {}
      rsvpForm.hidden = true;
      successMessage.hidden = false;
      successMessage.focus();
    } else if (data.code === 'rejected') {
      clearPending();
      formStatus.textContent = '回覆尚未儲存，請檢查填寫內容，或聯絡新人協助確認表單設定。內容已保留。';
    } else {
      formStatus.textContent = '暫時無法確認結果。內容已保留；可用相同內容重試查核，若仍無法確認請聯絡新人。';
    }
  }
  window.addEventListener('message', onResult);
  timer = setTimeout(() => {
    finish();
    formStatus.textContent = '尚未收到儲存確認，請勿視為完成。內容已保留；可用相同內容重試查核，或聯絡新人。';
  }, 45000);
  try { transport.submit(); }
  catch (_) {
    finish();
    formStatus.textContent = '暫時無法連接回覆服務，內容已保留，請稍後以相同內容再試。';
  }
});
