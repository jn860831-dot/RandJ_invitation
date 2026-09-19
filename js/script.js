const weddingDate = new Date('2027-05-15T09:00:00+08:00').getTime();

function updateCountdown() {
  const remaining = Math.max(0, weddingDate - Date.now());
  const values = { days: Math.floor(remaining / 86400000), hours: Math.floor((remaining / 3600000) % 24), minutes: Math.floor((remaining / 60000) % 60), seconds: Math.floor((remaining / 1000) % 60) };
  Object.entries(values).forEach(([unit, value]) => {
    const target = document.getElementById(`cd-${unit}`);
    if (target) target.textContent = String(value).padStart(unit === 'days' ? 3 : 2, '0');
  });
}
updateCountdown();
window.setInterval(updateCountdown, 1000);

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
document.querySelectorAll('.reveal').forEach((element) => revealObserver.observe(element));

const rsvpForm = document.getElementById('rsvp-form');
const successMessage = document.getElementById('rsvp-success');
const formStatus = document.getElementById('form-status');
const guestCount = document.getElementById('guest-count');
const blessingOnlyOption = guestCount?.querySelector('option[value="0"]');
blessingOnlyOption?.remove();
const invitationAddressField = document.getElementById('invitation-address-field');
const invitationAddress = document.getElementById('invitation-address');

document.querySelectorAll('input[name="paperInvitation"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const wantsPaperInvitation = radio.checked && radio.value === 'yes';
    invitationAddressField.hidden = !wantsPaperInvitation;
    invitationAddress.required = wantsPaperInvitation;
    if (!wantsPaperInvitation) invitationAddress.value = '';
  });
});

document.querySelectorAll('input[name="attendance"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const cannotAttend = radio.checked && radio.value === 'no';
    if (cannotAttend) {
      guestCount.append(blessingOnlyOption);
      guestCount.value = '0'; guestCount.disabled = true; guestCount.required = false;
    } else if (radio.checked) {
      blessingOnlyOption.remove();
      guestCount.disabled = false; guestCount.required = true; guestCount.value = '';
    }
  });
});
rsvpForm?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;

  const submitButton = rsvpForm.querySelector('button[type="submit"]');
  const formData = new FormData(rsvpForm);
  const attendanceLabels = {
    both: '觀禮跟午宴我都到', ceremony: '只觀禮不吃飯',
    banquet: '只參加午宴', no: '不克參加，獻上我的祝福～～'
  };
  const guestLabels = {
    0: '我的祝福會到', 1: '1 位', 2: '2 位', 3: '3 位',
    4: '4 位', 5: '5 位以上（我會聯絡你！）'
  };
  const invitationLabels = {
    yes: '我要我要！請寄給我', digital: '電子的就好，謝謝～'
  };
  const response = new URLSearchParams({
    'entry.47567131': formData.get('name') || '',
    'entry.817650951': formData.get('phone') || '',
    'entry.702656616': formData.get('email') || '',
    'entry.1167794548': formData.get('relationship') === 'other' ? '其他' : (formData.get('relationship') || ''),
    'entry.1274159287': formData.get('otherRelationship') || '',
    'entry.1865481609': attendanceLabels[formData.get('attendance')] || '',
    'entry.789501486': guestLabels[formData.get('guests')] || '',
    'entry.1361480921': formData.get('diet') || '',
    'entry.1352188447': invitationLabels[formData.get('paperInvitation')] || '',
    'entry.1105773361': formData.get('invitationAddress') || '',
    'entry.65394930': formData.get('message') || ''
  });

  submitButton.disabled = true;
  submitButton.textContent = '正在送出…';
  formStatus.textContent = '正在傳送您的回覆，請稍候。';

  try {
    await fetch('https://docs.google.com/forms/d/e/1FAIpQLSf2lR-ELavUNSJPtd8Dt1hoCWt8ysJV1hVjBMCwavYgufCkUw/formResponse', {
      method: 'POST', mode: 'no-cors', body: response
    });
    rsvpForm.hidden = true;
    successMessage.hidden = false;
    successMessage.focus();
  } catch (error) {
    submitButton.disabled = false;
    submitButton.innerHTML = '重新送出出席回覆 <span aria-hidden="true">↗</span>';
    formStatus.textContent = '目前無法送出，請確認網路連線後再試一次。';
  }
});
