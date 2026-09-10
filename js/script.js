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
const guestCount = document.getElementById('guest-count');
document.querySelectorAll('input[name="attendance"]').forEach((radio) => {
  radio.addEventListener('change', () => {
    const cannotAttend = radio.checked && radio.value === 'no';
    if (cannotAttend) {
      guestCount.value = '1'; guestCount.disabled = true; guestCount.required = false;
    } else if (radio.checked) {
      guestCount.disabled = false; guestCount.required = true; guestCount.value = '';
    }
  });
});
rsvpForm?.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!rsvpForm.reportValidity()) return;
  rsvpForm.hidden = true; successMessage.hidden = false; successMessage.focus();
});
