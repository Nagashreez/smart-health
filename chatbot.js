/* chatbot.js
  Simple local AI-style bot for triage, emergency detection, TTS and voice input.
  Exposes generate chat UI functions used by app.js
*/

function addChatBubble(text, who='bot'){
  const win = document.getElementById('chatWindow');
  const wrap = document.createElement('div');
  wrap.className = who === 'bot' ? 'bot' : 'user';
  const b = document.createElement('div');
  b.className = 'bubble';
  b.innerHTML = text;
  wrap.appendChild(b);
  win.appendChild(wrap);
  win.scrollTop = win.scrollHeight;
}
function addChatMessage(msg){
  addChatBubble(msg, 'user');
  processChatMessage(msg);
}
window.addChatMessage = addChatMessage;

function speakText(txt){
  if(localStorage.getItem('voice') === '0') return;
  try{ const u = new SpeechSynthesisUtterance(txt); u.lang='en-IN'; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); }catch(e){}
}

async function processChatMessage(text){
  // quick typing effect
  addChatBubble('...', 'bot');
  await new Promise(r => setTimeout(r, 600));
  // remove the typing bubble (last bot bubble with '...')
  const win = document.getElementById('chatWindow');
  const nodes = win.querySelectorAll('.bot');
  if(nodes.length) {
    const last = nodes[nodes.length-1];
    if(last && last.textContent.trim() === '...') last.remove();
  }

  const t = text.toLowerCase();
  // emergency keywords
  if(t.includes('chest') || t.includes('heart') || t.includes('pain in chest')){
    addChatBubble('<strong>⚠️ EMERGENCY</strong><br/>This might be serious. Call ambulance now or press the emergency button.', 'bot');
    speakText('This sounds like an emergency. Please call ambulance now.');
    return;
  }
  if(t.includes('fever') || t.includes('temperature')){
    addChatBubble('For fever — hydrate, rest and check temperature. If >39°C or confused, seek medical care.', 'bot');
    speakText('For fever, hydrate and rest. Seek care if temperature is high.');
    return;
  }
  if(t.includes('dizzy') || t.includes('faint')){
    addChatBubble('If dizzy, sit or lie down. Check your BP & sugar. If you lose consciousness call emergency.', 'bot');
    speakText('Sit or lie down and check vitals.');
    return;
  }
  // fallback personalized
  const user = JSON.parse(localStorage.getItem('current_user') || 'null');
  if(user && user.diseases && user.diseases.length){
    addChatBubble('Based on your conditions ('+user.diseases.slice(0,3).join(', ')+') — monitor vitals and contact caregiver if symptoms worsen.', 'bot');
    speakText('Based on your conditions, monitor your vitals.');
    return;
  }
  addChatBubble("I didn't catch that. Try 'fever', 'cough', 'chest pain' or tell me your symptom in one word.", 'bot');
  speakText("Could you tell me the symptom in one word?");
}

// send button / input
document.addEventListener('DOMContentLoaded', ()=>{
  document.getElementById('sendChat').addEventListener('click', ()=>{
    const m = document.getElementById('chatMessage');
    const txt = m.value.trim(); if(!txt) return; addChatMessage(txt); m.value='';
  });
  document.getElementById('chatMessage').addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ document.getElementById('sendChat').click(); }});
  // voice input
  document.getElementById('voiceChat').addEventListener('click', startVoiceChat);
  // chat open hook (used by app.js)
  window.openChat = function(){ /* focus input when opened */ setTimeout(()=>document.getElementById('chatMessage').focus(),200); };
});

function startVoiceChat(){
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SpeechRec){ alert('Voice not supported by this browser'); return; }
  const rec = new SpeechRec();
  rec.lang = 'en-IN'; rec.interimResults = false; rec.maxAlternatives = 1;
  const voiceBtn = document.getElementById('voiceChat');
  const old = voiceBtn.innerText; voiceBtn.innerText = '🎙️...';
  rec.onresult = function(e){
    const text = e.results[0][0].transcript;
    document.getElementById('chatMessage').value = text;
  };
  rec.onend = function(){ voiceBtn.innerText = old; const v = document.getElementById('chatMessage').value.trim(); if(v) { addChatMessage(v); document.getElementById('chatMessage').value=''; } };
  rec.onerror = function(){ voiceBtn.innerText = old; alert('Voice recognition error'); };
  rec.start();
}
