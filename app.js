/* app.js
  Main app logic: UI navigation, auth (localStorage), questionnaire, diseases, tracker, profile.
  Relies on charts.js (generateAllCharts) and chatbot.js (chat UI functions).
*/

const API = ''; // not used by default (localStorage)
let CURRENT_USER = JSON.parse(localStorage.getItem('current_user') || 'null');
let token = localStorage.getItem('token') || null;

// helper
const el = id => document.getElementById(id);
const show = screen => {
  ['authScreen','questionScreen','diseaseScreen','trackerScreen','profileScreen'].forEach(s=>el(s).classList.add('hidden'));
  el(screen).classList.remove('hidden');
  highlightStep(screen);
};
const highlightStep = screen => {
  const map = { authScreen:'stepAuth', questionScreen:'stepQuest', diseaseScreen:'stepDiseases', trackerScreen:'stepTrack', profileScreen:'stepProfile' };
  document.querySelectorAll('nav.steps button').forEach(b=>b.style.opacity=0.5);
  el(map[screen]).style.opacity = 1;
};
const toast = msg => { alert(msg); };

// Diseases list
const DISEASES = [
  "Hypertension (High BP)","Diabetes","Alzheimer's / Dementia","Arthritis",
  "Osteoporosis","Heart disease","Asthma","COPD","Kidney disease",
  "Chronic pain","Stroke history","Cancer history","Thyroid problem",
  "Depression / Anxiety","Parkinson's"
];

// Init UI event bindings
function initUI(){
  // auth toggle
  let loginMode = false;
  el('toggleLogin').addEventListener('click', ()=>{
    loginMode = !loginMode;
    el('authTitle').innerText = loginMode ? 'Login' : 'Create Account';
    el('authSubmit').innerText = loginMode ? 'Login' : 'Create';
  });

  el('authSubmit').addEventListener('click', handleAuth);
  el('q_health').addEventListener('change', e => {
    if(e.target.value === 'Yes') el('q_meds_wrap').classList.remove('hidden'); else el('q_meds_wrap').classList.add('hidden');
  });
  el('qNext').addEventListener('click', handleQuestionNext);
  el('qSkip').addEventListener('click', ()=> show('trackerScreen'));

  el('dSave').addEventListener('click', saveDiseasesAndContinue);
  el('dSkip').addEventListener('click', ()=> show('trackerScreen'));

  el('saveTrack').addEventListener('click', saveTrackRecord);
  el('loadTrack').addEventListener('click', loadRecords);

  el('stepAuth').addEventListener('click', ()=> show('authScreen'));
  el('stepQuest').addEventListener('click', ()=> show('questionScreen'));
  el('stepDiseases').addEventListener('click', ()=> { populateDiseases(); show('diseaseScreen'); });
  el('stepTrack').addEventListener('click', ()=> show('trackerScreen'));
  el('stepProfile').addEventListener('click', ()=> { refreshProfile(); show('profileScreen'); });

  el('openChat').addEventListener('click', ()=> {
    el('chatPopup').style.display = 'flex';
    if(window.openChat) window.openChat();
  });
  el('closeChat').addEventListener('click', ()=> el('chatPopup').style.display = 'none');

  el('logoutBtn').addEventListener('click', ()=> {
    token = null; CURRENT_USER = null;
    localStorage.removeItem('token'); localStorage.removeItem('current_user');
    el('logoutBtn').classList.add('hidden');
    show('authScreen');
  });

  // quick populate chat chips (chatbot.js will use container)
  populateChatChips();

  // initial screen
  show('authScreen');
  if(CURRENT_USER){
    el('logoutBtn').classList.remove('hidden');
    // prefill auth fields
    el('in_name').value = CURRENT_USER.name || '';
    el('in_age_range').value = CURRENT_USER.ageRange || '';
    el('in_age_num').value = CURRENT_USER.ageNum || '';
  }

  loadRecords(); // chart load
}

// AUTH handler (local storage only)
function handleAuth(){
  const name = el('in_name').value.trim();
  const ageRange = el('in_age_range').value;
  const ageNum = el('in_age_num').value;
  const phone = el('in_phone').value.trim();
  const email = el('in_email').value.trim();
  const caretaker = el('in_caretaker').value.trim();
  const userid = el('in_userid').value.trim();
  const password = el('in_password').value;

  const modeLogin = el('authTitle').innerText.trim().toLowerCase().includes('login');
  if(modeLogin){
    if(!userid || !password){ toast('Enter userid and password'); return; }
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const found = users.find(u=>u.userid===userid && u.password === password);
    if(found){
      CURRENT_USER = found;
      token = 'local-'+btoa(userid);
      localStorage.setItem('token', token);
      localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));
      el('logoutBtn').classList.remove('hidden');
      show('questionScreen');
      toast('Logged in locally');
    } else {
      toast('No local account found. Create one.');
    }
    return;
  }

  // register
  if(!userid || !password || !name){ toast('Name, userid and password required'); return; }
  const users = JSON.parse(localStorage.getItem('users') || '[]');
  if(users.find(u=>u.userid === userid)){ toast('UserID exists. Pick another.'); return; }
  const userObj = { name, ageRange, ageNum, phone, email, caretaker, userid, password, questionnaire:{}, diseases:[], created: Date.now() };
  users.push(userObj);
  localStorage.setItem('users', JSON.stringify(users));
  CURRENT_USER = userObj;
  token = 'local-'+btoa(userid);
  localStorage.setItem('token', token);
  localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));
  el('logoutBtn').classList.remove('hidden');
  show('questionScreen');
  toast('Account created (local).');
}

// Questionnaire
function handleQuestionNext(){
  const q = { age: el('q_age').value, hasHealthIssues: el('q_health').value, takesMeds: el('q_meds').value };
  // save to current user
  if(!CURRENT_USER) CURRENT_USER = {};
  CURRENT_USER.questionnaire = q;
  localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));
  // if has health issues, go to disease screen
  if(q.hasHealthIssues === 'Yes'){ populateDiseases(); show('diseaseScreen'); }
  else show('trackerScreen');
}

// Diseases UI populate
function populateDiseases(){
  const container = el('diseasesList'); container.innerHTML = '';
  const saved = (CURRENT_USER && CURRENT_USER.diseases) || JSON.parse(localStorage.getItem('diseases_'+getLocalId()) || '[]');
  DISEASES.forEach(d=>{
    const btn = document.createElement('button');
    btn.className = 'chip';
    btn.innerText = d;
    if(saved.includes(d)) btn.classList.add('sel');
    btn.addEventListener('click', ()=> btn.classList.toggle('sel'));
    container.appendChild(btn);
  });
}

// Save diseases
function saveDiseasesAndContinue(){
  const selected = Array.from(el('diseasesList').querySelectorAll('.chip.sel')).map(b=>b.innerText);
  if(!CURRENT_USER) CURRENT_USER = {};
  CURRENT_USER.diseases = selected;
  localStorage.setItem('current_user', JSON.stringify(CURRENT_USER));
  // also save separate key for quick ref
  localStorage.setItem('diseases_'+getLocalId(), JSON.stringify(selected));
  show('trackerScreen');
  toast('Diseases saved');
}

// Tracker: save record
function saveTrackRecord(){
  const name = el('t_name').value.trim() || (CURRENT_USER && CURRENT_USER.name) || 'Patient';
  const sys = el('t_sys').value.trim();
  const dia = el('t_dia').value.trim();
  const sugar = el('t_sugar').value.trim();
  const pulse = el('t_pulse').value.trim();
  const weight = el('t_weight').value.trim();
  if(!sys || !dia){ toast('Enter BP values'); return; }
  const bp = `${sys}/${dia}`;
  const rec = { name, bp, sugar, pulse, weight, ts: Date.now() };

  saveLocalRecord(rec);
  toast('Saved locally');
  loadRecords();
}

// local record helpers
function getLocalId(){ if(token && token.startsWith('local-')) return token; if(CURRENT_USER && CURRENT_USER.userid) return 'user_'+CURRENT_USER.userid; const cu = JSON.parse(localStorage.getItem('current_user') || 'null'); if(cu && cu.userid) return 'user_'+cu.userid; return 'anon'; }
function saveLocalRecord(rec){
  const key = 'records_'+getLocalId();
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  arr.push(rec);
  localStorage.setItem(key, JSON.stringify(arr));
}
function loadRecords(){
  const key = 'records_'+getLocalId();
  const arr = JSON.parse(localStorage.getItem(key) || '[]');
  renderRecords(arr);
  if(window.generateAllCharts) window.generateAllCharts(arr);
}
function renderRecords(records){
  const ul = el('recentList'); ul.innerHTML = '';
  if(!records || records.length===0){ ul.innerHTML = '<li>No records</li>'; el('lastVitals').innerText = 'No vitals yet'; return; }
  records.slice().reverse().forEach(r=>{
    const li = document.createElement('li');
    const date = new Date(r.ts || Date.now()).toLocaleString();
    li.innerText = `${date} — ${r.name} — BP: ${r.bp} — Sugar:${r.sugar || '-'} — Pulse:${r.pulse || '-'} — Wt:${r.weight || '-'}`;
    ul.appendChild(li);
  });
  const last = records[records.length-1];
  if(last) el('lastVitals').innerText = `BP: ${last.bp} • Sugar: ${last.sugar || '-'} • Pulse: ${last.pulse || '-'} • Weight: ${last.weight || '-'}`;
}

// Profile refresh
function refreshProfile(){
  const u = CURRENT_USER || JSON.parse(localStorage.getItem('current_user') || 'null') || {};
  el('profileHi').innerText = `Hi, ${u.name || 'User'}!`;
  el('p_name').innerText = u.name || '-';
  el('p_age').innerText = u.ageNum || u.ageRange || '-';
  el('p_phone').innerText = u.phone || '-';
  el('p_email').innerText = u.email || '-';
  el('p_ct').innerText = u.caretaker || '-';
  const qLocal = JSON.parse(localStorage.getItem('current_user') || '{}').questionnaire || {};
  el('p_health').innerText = qLocal.hasHealthIssues || (u.questionnaire && u.questionnaire.hasHealthIssues) || 'Unknown';
  el('p_meds').innerText = qLocal.takesMeds || (u.questionnaire && u.questionnaire.takesMeds) || 'Unknown';
  const ds = (u.diseases && u.diseases.length) ? u.diseases.join(', ') : (localStorage.getItem('diseases_'+getLocalId()) || '-');
  el('p_ds').innerText = ds;
}

// chat chips (hooked by chatbot.js later)
function populateChatChips(){
  const chips = ['fever','cough','chest pain','dizzy','breathless','vomit'];
  const container = el('chatChips'); container.innerHTML = '';
  chips.forEach(c=>{
    const b = document.createElement('button'); b.className='chip'; b.innerText=c;
    b.addEventListener('click', ()=> {
      if(window.addChatMessage) window.addChatMessage(c);
    });
    container.appendChild(b);
  });
}

// dark and voice toggles
el('darkToggle').addEventListener('click', ()=> {
  document.body.classList.toggle('dark');
  localStorage.setItem('theme', document.body.classList.contains('dark') ? 'dark' : 'light');
});
el('voiceToggle').addEventListener('click', ()=>{
  const cur = (localStorage.getItem('voice') === '0') ? '1' : '0';
  localStorage.setItem('voice', cur);
  el('voiceToggle').innerText = cur === '0' ? '🔈' : '🔊';
});
if(localStorage.getItem('theme') === 'dark') document.body.classList.add('dark');
if(localStorage.getItem('voice') === null) localStorage.setItem('voice','1');

// Initialize on load
document.addEventListener('DOMContentLoaded', ()=> {
  initUI();
  // attempt to load current user from storage
  const stored = JSON.parse(localStorage.getItem('current_user') || 'null');
  if(stored){ CURRENT_USER = stored; el('logoutBtn').classList.remove('hidden'); }
});
