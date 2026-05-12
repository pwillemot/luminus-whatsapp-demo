'use strict';

/* ── Lock screen ── */
const DAYS   = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function updateLockClock() {
  const d = new Date();
  const lsTime = document.getElementById('ls-time');
  const lsDate = document.getElementById('ls-date');
  if (!lsTime) return;
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  lsTime.textContent = `${hh}:${mm}`;
  lsDate.textContent = `${DAYS[d.getDay()]} ${d.getDate()}`;
}

updateLockClock();
setInterval(updateLockClock, 10000);

let notifShown = false;

function showNotification() {
  if (notifShown) {
    // second tap → open WhatsApp
    unlockToWhatsApp();
    return;
  }
  notifShown = true;
  const notif = document.getElementById('ls-notification');
  const notifTime = document.getElementById('ls-notif-time');
  const d = new Date();
  notifTime.textContent = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  notif.classList.add('visible');
}

function unlockToWhatsApp() {
  const lock = document.getElementById('screen-lock');
  lock.style.transition = 'opacity 0.4s ease';
  lock.style.opacity = '0';
  setTimeout(() => {
    lock.classList.remove('active');
    lock.style.opacity = '';
    lock.style.transition = '';
    openChat(true);
  }, 400);
}


const SCRIPT = [
  { agent: "Hi Marie! Your appointment with our EV specialist is planned for tomorrow at 10:00. If this appointment is not possible anymore you can easily reschedule this in this conversation."},
  { agent: "I understand, it is not problem to reschedule the appointment. Do you have a specific timing in mind for the appointment or do I need to propose some time slots for next week?" },
  { agent: "I understand, {name}! Unfortunately I have to share some important news. In the Brussels Capital Region, the electricity market is regulated by the regional government 🏛️. This means the electricity supplier is fixed (Sibelga) and residents cannot freely choose their supplier. So Luminus is not able to supply electricity to private homes in Brussels. I am sorry about that! 😔\n\nBut the great news is: Luminus still has excellent solutions for you in Brussels!" },
  { agent: "We offer a range of smart energy solutions perfect for Brussels residents:\n\n🔋 *EV charging* — charge your electric vehicle at home, fast and smart.\n☀️ *Solar panels* — generate your own clean energy.\n🌡️ *Heat pumps* — efficient heating and cooling.\n\nSince you are interested in EV solutions, {name}, shall I show you our home EV charging packages?" },
  { agent: "Great! ⚡ Here are our three EV charging packages:\n\n1️⃣ *Basic Pack* — From €299\nPortable charging cable · No installation needed\n\n2️⃣ *Comfort Pack* — From €799\nWallbox Pulsar Max · Smart home charging up to 11kW\n\n3️⃣ *Smart Pack* — From €1,199\nWallbox Pulsar Pro · 22kW + solar integration + billing\n\nWhich package interests you most?" },
  { agent: "Excellent pick! 🎉 To get you the best tailored quote and walk you through the installation, I would love to set up a free 30-minute video consultation with one of our Luminus EV specialists. Would you like to book a time that works for you?" },
  { agent: "Perfect — let me register your details so we can send the calendar invite. Could you give me your last name, {name}?", capture: 'lastName' },
  { agent: "Thank you! And what is the best email address to send the calendar invite to?", capture: 'email' },
  { agent: "All done, {name}! 🎉 Your consultation is confirmed and a calendar invite is on its way to your inbox.\n\nOur EV specialist is looking forward to meeting you and helping you find the perfect charging solution for your home.\n\nThank you for choosing Luminus — see you soon! ⚡" }
];

let scriptIndex = 0;
let capturedFirstName = '';
let capturedLastName  = '';
let capturedEmail     = '';
let conversationDone  = false;
let agentTurn = false;

const messagesEl  = document.getElementById('messages');
const inputEl     = document.getElementById('chat-input');
const sendBtn     = document.getElementById('send-btn');
const sendIcon    = document.getElementById('send-icon');
const agentStatus = document.getElementById('agent-status');
const listTime    = document.getElementById('list-time');

const MIC_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white">
  <path d="M12 2a3 3 0 0 1 3 3v7a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
  <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/>
  <line x1="12" y1="19" x2="12" y2="23" stroke="white" stroke-width="2" stroke-linecap="round"/>
  <line x1="8" y1="23" x2="16" y2="23" stroke="white" stroke-width="2" stroke-linecap="round"/>
</svg>`;

const SEND_SVG = `<svg width="20" height="20" viewBox="0 0 24 24" fill="white">
  <path d="M22 2L11 13" stroke="white" stroke-width="2" stroke-linecap="round" fill="none"/>
  <path d="M22 2L15 22L11 13L2 9L22 2Z" fill="white"/>
</svg>`;

function now() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fillName(text) {
  return text.replace(/\{name\}/g, capturedFirstName || '');
}

function formatText(raw) {
  return raw
    .replace(/\*(.*?)\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br>');
}

function scrollBottom() {
  setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 40);
}

function setInputEnabled(enabled) {
  inputEl.disabled = !enabled;
  if (enabled) {
    inputEl.focus();
    updateSendBtn();
  } else {
    sendBtn.disabled = true;
    sendBtn.style.background = '#8a8a8e';
    sendIcon.innerHTML = MIC_SVG;
  }
}

function updateSendBtn() {
  const hasText = inputEl.value.trim().length > 0;
  if (hasText) {
    sendBtn.disabled = false;
    sendBtn.style.background = '#25d366';
    sendIcon.innerHTML = SEND_SVG;
  } else {
    sendBtn.disabled = true;
    sendBtn.style.background = '#25d366';
    sendIcon.innerHTML = MIC_SVG;
  }
}

inputEl.addEventListener('input', updateSendBtn);

function addDateChip(label) {
  const el = document.createElement('div');
  el.className = 'wa-date-chip';
  el.textContent = label;
  messagesEl.appendChild(el);
}

function addBubble(text, direction, time, ticks) {
  const row = document.createElement('div');
  row.className = `wa-bubble-row ${direction}`;

  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble';

  const ticksHtml = ticks ? `<span class="wa-ticks read">✓✓</span>` : '';
  bubble.innerHTML = `
    <span class="wa-bubble-text">${formatText(text)}</span>
    <div class="wa-bubble-meta">
      <span class="wa-bubble-time">${time}</span>
      ${ticksHtml}
    </div>`;

  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollBottom();
}

function addTypingIndicator() {
  const row = document.createElement('div');
  row.className = 'wa-bubble-row incoming';
  row.id = 'typing-row';
  const bubble = document.createElement('div');
  bubble.className = 'wa-bubble';
  bubble.innerHTML = `<div class="wa-typing"><span></span><span></span><span></span></div>`;
  row.appendChild(bubble);
  messagesEl.appendChild(row);
  scrollBottom();
}

function removeTypingIndicator() {
  const el = document.getElementById('typing-row');
  if (el) el.remove();
}

function showAgentMessage(index) {
  const step = SCRIPT[index];
  const text = fillName(step.agent);
  addBubble(text, 'incoming', now(), false);

  if (index === SCRIPT.length - 1) {
    conversationDone = true;
    agentStatus.textContent = 'offline';
    setInputEnabled(false);
  } else {
    agentTurn = false;
    setInputEnabled(true);
  }
}

function agentReply() {
  agentTurn = true;
  setInputEnabled(false);
  agentStatus.textContent = 'typing...';
  addTypingIndicator();

  const delay = 2500 + Math.floor(Math.random() * 1500);
  setTimeout(() => {
    removeTypingIndicator();
    agentStatus.textContent = 'online';
    showAgentMessage(scriptIndex);
  }, delay);
}

function handleSend() {
  if (conversationDone || agentTurn) return;
  const text = inputEl.value.trim();
  if (!text) return;
  inputEl.value = '';
  updateSendBtn();

  const step = SCRIPT[scriptIndex];
  if (step && step.capture === 'firstName') capturedFirstName = text;
  else if (step && step.capture === 'lastName')  capturedLastName  = text;
  else if (step && step.capture === 'email')     capturedEmail     = text;

  addBubble(text, 'outgoing', now(), true);
  setInputEnabled(false);

  scriptIndex++;
  if (scriptIndex < SCRIPT.length) {
    agentReply();
  } else {
    conversationDone = true;
    agentStatus.textContent = 'offline';
  }
}

function handleKey(e) {
  if (e.key === 'Enter') handleSend();
}

function openChat(instant) {
  document.getElementById('screen-list').classList.remove('active');
  document.getElementById('screen-chat').classList.add('active');

  if (messagesEl.children.length === 0) {
    addDateChip('Today');
    if (instant) {
      agentStatus.textContent = 'online';
      showAgentMessage(0);
    } else {
      setInputEnabled(false);
      agentStatus.textContent = 'typing...';
      addTypingIndicator();
      setTimeout(() => {
        removeTypingIndicator();
        agentStatus.textContent = 'online';
        showAgentMessage(0);
      }, 1800);
    }
  }
}

function closeChat() {
  document.getElementById('screen-chat').classList.remove('active');
  document.getElementById('screen-list').classList.add('active');
}

(function init() {
  listTime.textContent = now();
  setInterval(() => { listTime.textContent = now(); }, 30000);
  sendIcon.innerHTML = MIC_SVG;
})();
