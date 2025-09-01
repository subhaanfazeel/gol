const api=(p)=>`/api${p}`
let APP={data:null}

async function fetchData(){
  try{
    let res=await fetch(api('/data')); let j=await res.json(); APP.data=j.data;
    document.getElementById('greet').textContent = APP.data.name ? `Hey ${APP.data.name}` : 'Tap Start';
    renderMain();
    renderTasks();
    renderNonneg();
    renderShop();
    renderDiary();
    renderStats();
    if(j.missed_day){ showPunishment(j.punishment); if(APP.data.settings.sounds) play('ping'); }
  }catch(e){ console.error(e); document.getElementById('main').textContent='Offline or backend error'; }
}

function showPunishment(msg){ alert('Punishment: '+msg); }

function show(tab){
  document.querySelectorAll('.view .card').forEach(s=>s.classList.add('hidden'));
  document.getElementById(tab).classList.remove('hidden');
}

function renderMain(){
  const el=document.getElementById('main');
  el.innerHTML = `<h3>Streak: ${APP.data.streak} 🔥 | Best: ${APP.data.best_streak}</h3><p>Coins: ${APP.data.shop.coins}</p>`;
  el.innerHTML += `<h4>Non-Negotiables</h4><ul>${APP.data.non_negotiables.map(n=>`<li>${n}</li>`).join('')}</ul>`;
}

async function promptNameAndStart(){
  let n=document.getElementById('startName').value || '';
  await fetch(api('/name'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:n})});
  document.getElementById('splash').classList.add('hidden');
  fetchData();
}

function startApp(){ promptNameAndStart(); }

// TASKS
function renderTasks(){
  const el=document.getElementById('tasks');
  if(!APP.data.tasks.length){ el.innerHTML='<h3>Tasks</h3><p>No tasks</p><button onclick="addTask()">Add Task</button>'; return; }
  el.innerHTML = '<h3>Tasks</h3><ul>'+APP.data.tasks.map((t,i)=>`<li>${t.done? '✅':'⬜'} ${t.task} ${(t.deadline? (' - '+deadlineLabel(t.deadline)):'')} <button onclick="toggle(${i})">Toggle</button></li>`).join('')+'</ul><button onclick="addTask()">Add Task</button>';
}
async function toggle(i){ await fetch(api(`/tasks/toggle/${i}`),{method:'POST'}); fetchData(); }
async function addTask(){ let task=prompt('Task'); if(!task) return; let dl=prompt('Deadline (YYYY-MM-DD HH:MM) or blank'); await fetch(api('/tasks/add'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({task:task,deadline:dl})}); fetchData(); }

function deadlineLabel(d){ let diff=new Date(d)-new Date(); if(diff<0) return 'FAILED'; let days=Math.floor(diff/86400000); if(days>0) return days+'d left'; let hrs=Math.floor(diff/3600000); return hrs+'h left'; }

// NON-NEG
async function addNon(){ let rule=prompt('New non-negotiable'); if(!rule) return; await fetch(api('/nonneg/add'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({rule})}); fetchData(); }
async function deleteNon(i){ await fetch(api(`/nonneg/delete/${i}`),{method:'POST'}); fetchData(); }
function renderNonneg(){ const el=document.getElementById('nonneg'); el.innerHTML = '<h3>Non-Negotiables</h3><button onclick="addNon()">Add</button><ul>'+APP.data.non_negotiables.map((n,i)=>`<li>${n} <button onclick="deleteNon(${i})">X</button></li>`).join('')+'</ul>'; }

// SHOP
async function renderShop(){ const el=document.getElementById('shop'); let r=await fetch(api('/shop')); let j=await r.json(); el.innerHTML = '<h3>Shop</h3><p>Coins: '+APP.data.shop.coins+'</p><ul>'+j.catalog.map(it=>`<li>${it.name} - ${it.price} <button onclick="buy(${it.id})">Buy</button></li>`).join('')+'</ul>'; }
async function buy(id){ let r=await fetch(api(`/shop/buy/${id}`),{method:'POST'}); let j=await r.json(); if(j.error) alert(j.error); else { APP.data=j.shop; fetchData(); } }

// DIARY
async function renderDiary(){ const el=document.getElementById('diary'); el.innerHTML='<h3>Diary</h3><button onclick="addDiary()">Add Entry</button><ul>'+APP.data.diary.map(e=>`<li>${e.ts}: ${e.text}</li>`).join('')+'</ul>'; }
async function addDiary(){ let entry=prompt('Diary entry'); if(!entry) return; await fetch(api('/diary/add'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({entry})}); fetchData(); }

// STATS
async function renderStats(){ const el=document.getElementById('stats'); let r=await fetch(api('/stats')); let j=await r.json(); el.innerHTML='<h3>Stats</h3><p>Tasks completed: '+j.stats.tasks_completed+'</p>'; }

// SETTINGS
async function renderSettings(){ const el=document.getElementById('settings'); el.innerHTML='<h3>Settings</h3><label><input type="checkbox" id="sSound"> Sounds</label><br><button onclick="saveSettings()">Save</button>'; document.getElementById('sSound').checked = APP.data.settings.sounds; }
async function saveSettings(){ let v=document.getElementById('sSound').checked; await fetch(api('/settings'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sounds:v})}); fetchData(); alert('Saved'); }

function play(id){ try{ if(!APP.data.settings.sounds) return; document.getElementById(id).play().catch(()=>{}); }catch(e){} }

document.addEventListener('DOMContentLoaded',()=>{ fetchData(); document.getElementById('splash').classList.remove('hidden'); });
