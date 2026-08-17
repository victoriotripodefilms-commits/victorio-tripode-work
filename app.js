
const STORAGE_KEY = "vtwork_v1";
const currency = new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0});
const dateFmt = new Intl.DateTimeFormat("es-AR",{weekday:"short",day:"2-digit",month:"short"});
const longDateFmt = new Intl.DateTimeFormat("es-AR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

const demoData = {
  settings:{privacy:false},
  jobs:[
    {
      id:"j1", origin:"propio", eventType:"Boda", service:"Foto + Video", date:"2026-08-22",
      start:"17:00", end:"03:00", contractor:"Mariana López", honorees:"Mariana & Joaquín",
      phone:"3534001122", venue:"Salón La Toscana", city:"Villa María", guests:180,
      status:"reservado", notes:"Civil y fiesta. Llegar 30 minutos antes.",
      total:1450000, paymentMode:"30% + cuotas", paid:700000,
      costs:[
        {name:"Segundo videógrafo",hours:9,amount:180000},
        {name:"Asistente",hours:7,amount:90000},
        {name:"Viáticos",hours:0,amount:35000}
      ]
    },
    {
      id:"j2", origin:"productora", eventType:"15 años", service:"Video", date:"2026-08-23",
      start:"19:30", end:"04:00", producer:"Luz Films", producerContact:"Marcos",
      venue:"Espacio Márquez", city:"Córdoba", ownVehicle:true, status:"confirmado",
      total:210000, paid:0, dueDate:"2026-08-28", notes:"Llevar gimbal y luz LED.",
      costs:[{name:"Combustible",hours:0,amount:26000}]
    },
    {
      id:"j3", origin:"propio", eventType:"15 años", service:"Foto", date:"2026-08-29",
      start:"18:00", end:"02:30", contractor:"Laura Benítez", honorees:"Emma",
      phone:"3534123456", venue:"Salón Roma", city:"Villa Nueva", guests:120,
      status:"presupuestado", notes:"Sesión exterior incluida.",
      total:780000, paymentMode:"Contado", paid:0, costs:[]
    },
    {
      id:"j4", origin:"productora", eventType:"Boda", service:"Foto", date:"2026-09-05",
      start:"16:00", end:"02:00", producer:"Marea Producciones", producerContact:"Sofía",
      venue:"Estancia El Prado", city:"Bell Ville", ownVehicle:false, status:"confirmado",
      total:190000, paid:0, dueDate:"2026-09-10", notes:"Segundo fotógrafo.",
      costs:[]
    },
    {
      id:"j5", origin:"propio", eventType:"Boda", service:"Foto + Video", date:"2026-07-18",
      start:"15:00", end:"03:30", contractor:"Lucía Pérez", honorees:"Lucía & Mateo",
      phone:"3534556677", venue:"Quinta Las Moras", city:"Villa María", guests:210,
      status:"cobrado", notes:"",
      total:1320000, paymentMode:"30% + cuotas", paid:1320000,
      costs:[
        {name:"Segundo fotógrafo",hours:10,amount:160000},
        {name:"Videógrafo",hours:10,amount:210000},
        {name:"Viáticos",hours:0,amount:25000}
      ]
    }
  ]
};

let state = loadState();
let currentView = "agenda";
let agendaMode = "list";
let contactTab = "clientes";

function clone(x){return JSON.parse(JSON.stringify(x))}
function loadState(){
  const raw = localStorage.getItem(STORAGE_KEY);
  if(!raw) return clone(demoData);
  try{return JSON.parse(raw)}catch(e){return clone(demoData)}
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function el(id){return document.getElementById(id)}
function showToast(msg){
  const t=el("toast"); t.textContent=msg; t.classList.remove("hidden");
  setTimeout(()=>t.classList.add("hidden"),2200);
}
function safe(v){return (v??"").toString().replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function isoDate(d){return new Date(d+"T12:00:00")}
function money(n){return currency.format(Number(n||0))}
function jobIncome(j){return Number(j.total||0)}
function jobCosts(j){return (j.costs||[]).reduce((s,c)=>s+Number(c.amount||0),0)}
function jobProfit(j){return jobIncome(j)-jobCosts(j)}
function outstanding(j){return Math.max(0,Number(j.total||0)-Number(j.paid||0))}
function originLabel(j){return j.origin==="propio"?"PROPIO":`PRODUCTORA${j.producer?" · "+j.producer:""}`}
function partyName(j){return j.origin==="propio"?(j.honorees||j.contractor||j.eventType):(j.producer||"Productora")}
function statusLabel(s){
  const map={consulta:"Consulta",presupuestado:"Presupuestado",reservado:"Reservado",realizado:"Realizado",entregado:"Entregado",cobrado:"Cobrado",confirmado:"Confirmado",pendiente_cobro:"Pendiente de cobro"};
  return map[s]||s||"—";
}

function setView(name){
  currentView=name;
  document.querySelectorAll(".view").forEach(v=>v.classList.remove("active"));
  el("view-"+name).classList.add("active");
  document.querySelectorAll("[data-nav]").forEach(b=>b.classList.toggle("active",b.dataset.nav===name));
  if(name==="agenda") renderAgenda();
  if(name==="trabajos") renderJobs();
  if(name==="contactos") renderContacts();
  if(name==="finanzas") renderFinances();
}
function renderAll(){
  el("todayLabel").textContent = longDateFmt.format(new Date());
  document.body.classList.toggle("privacy-on",!!state.settings.privacy);
  renderAgenda(); renderJobs(); renderContacts(); initFinanceMonths(); renderFinances();
}

function renderAgenda(){
  document.querySelectorAll("[data-agenda-mode]").forEach(b=>b.classList.toggle("active",b.dataset.agendaMode===agendaMode));
  const list=el("agendaList"), cal=el("calendarView");
  if(agendaMode==="calendar"){list.classList.add("hidden");cal.classList.remove("hidden");renderCalendar();return}
  cal.classList.add("hidden");list.classList.remove("hidden");
  const today = new Date(); today.setHours(0,0,0,0);
  const jobs = state.jobs.filter(j=>isoDate(j.date)>=today).sort((a,b)=>a.date.localeCompare(b.date)||a.start.localeCompare(b.start));
  if(!jobs.length){list.innerHTML='<div class="empty-state">No hay próximos trabajos.</div>';return}
  let html="", last="";
  jobs.forEach(j=>{
    if(j.date!==last){html+=`<div class="agenda-day">${safe(longDateFmt.format(isoDate(j.date)))}</div>`;last=j.date}
    html+=`<article class="job-row" data-open-job="${j.id}">
      <div class="job-time">${safe(j.start)}–${safe(j.end)}</div>
      <div class="job-main">
        <div class="job-title">${safe(j.eventType)} · ${safe(j.service)}</div>
        <div class="job-meta">
          <span class="pill ${j.origin==="propio"?"own":"producer"}">${safe(originLabel(j))}</span>
          <span>${safe(j.venue||"Sin salón")}</span><span>·</span><span>${safe(j.city||"")}</span>
        </div>
      </div><div class="job-arrow">→</div>
    </article>`
  });
  list.innerHTML=html;
}
function renderCalendar(){
  const base=new Date(); const y=base.getFullYear(), m=base.getMonth();
  const first=new Date(y,m,1), days=new Date(y,m+1,0).getDate();
  const start=(first.getDay()+6)%7;
  const labels=["L","M","X","J","V","S","D"];
  let html=`<div class="calendar-head"><h3>${first.toLocaleDateString("es-AR",{month:"long",year:"numeric"})}</h3><span class="muted">Vista mensual</span></div><div class="calendar-grid">`;
  labels.forEach(x=>html+=`<div class="cal-label">${x}</div>`);
  for(let i=0;i<start;i++) html+='<div class="cal-day empty"></div>';
  for(let d=1;d<=days;d++){
    const dt=new Date(y,m,d), key=`${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
    const js=state.jobs.filter(j=>j.date===key);
    html+=`<div class="cal-day ${new Date().toDateString()===dt.toDateString()?"today":""}">
      <div class="cal-num">${d}</div>
      ${js.slice(0,3).map(j=>`<span class="cal-dot ${j.origin==="propio"?"own":"producer"}" data-open-job="${j.id}">${safe(j.eventType)} · ${safe(j.start)}</span>`).join("")}
    </div>`
  }
  html+="</div>";el("calendarView").innerHTML=html;
}

function renderJobs(){
  const q=(el("jobsSearch")?.value||"").toLowerCase(), f=el("jobsFilter")?.value||"all";
  let jobs=[...state.jobs].sort((a,b)=>b.date.localeCompare(a.date));
  jobs=jobs.filter(j=>{
    const hay=[j.contractor,j.honorees,j.producer,j.venue,j.city,j.eventType,j.service].join(" ").toLowerCase();
    if(q && !hay.includes(q)) return false;
    if(f==="propio"&&j.origin!=="propio") return false;
    if(f==="productora"&&j.origin!=="productora") return false;
    if(f==="pendiente"&&outstanding(j)<=0) return false;
    return true;
  });
  el("jobsTable").innerHTML=jobs.length?jobs.map(j=>`<article class="work-card" data-open-job="${j.id}">
    <span class="pill ${j.origin==="propio"?"own":"producer"}">${safe(originLabel(j))}</span>
    <h3>${safe(j.eventType)} · ${safe(partyName(j))}</h3>
    <p>${dateFmt.format(isoDate(j.date))} · ${safe(j.start)}–${safe(j.end)}</p>
    <p>${safe(j.venue||"Sin salón")} · ${safe(j.city||"")}</p>
    <p><span class="status ${outstanding(j)===0?"paid":"pending"}">${safe(statusLabel(j.status))}</span></p>
    <div class="card-money sensitive"><span>${money(j.total)}</span><strong class="money-strong">${money(jobProfit(j))} neto</strong></div>
  </article>`).join(""):'<div class="empty-state">No encontré trabajos con ese filtro.</div>';
}

function renderContacts(){
  document.querySelectorAll("[data-contact-tab]").forEach(b=>b.classList.toggle("active",b.dataset.contactTab===contactTab));
  let items=[];
  if(contactTab==="clientes"){
    const map=new Map();
    state.jobs.filter(j=>j.origin==="propio").forEach(j=>{
      const key=j.phone||j.contractor;
      if(!map.has(key)) map.set(key,{name:j.contractor||"Cliente",sub:j.phone||"",jobs:0,total:0});
      const x=map.get(key);x.jobs++;x.total+=Number(j.total||0);
    }); items=[...map.values()];
  } else if(contactTab==="productoras"){
    const map=new Map();
    state.jobs.filter(j=>j.origin==="productora").forEach(j=>{
      const key=j.producer||"Productora";
      if(!map.has(key)) map.set(key,{name:key,sub:j.producerContact||"",jobs:0,total:0});
      const x=map.get(key);x.jobs++;x.total+=Number(j.total||0);
    }); items=[...map.values()];
  } else {
    const map=new Map();
    state.jobs.forEach(j=>(j.costs||[]).filter(c=>/asistente|fotógrafo|videógrafo|cámara/i.test(c.name)).forEach(c=>{
      const key=c.name;if(!map.has(key))map.set(key,{name:key,sub:"Equipo",jobs:0,total:0});
      const x=map.get(key);x.jobs++;x.total+=Number(c.amount||0);
    }));items=[...map.values()];
  }
  el("contactsList").innerHTML=items.length?items.map(x=>`<article class="contact-card">
    <h3>${safe(x.name)}</h3><p>${safe(x.sub)}</p><p>${x.jobs} trabajo${x.jobs!==1?"s":""}</p>
    <p class="sensitive"><strong>${money(x.total)}</strong> acumulado</p>
  </article>`).join(""):'<div class="empty-state">Todavía no hay contactos en esta categoría.</div>';
}

function initFinanceMonths(){
  const sel=el("financeMonth"); if(!sel)return;
  const keys=[...new Set(state.jobs.map(j=>j.date.slice(0,7)))].sort().reverse();
  const old=sel.value; sel.innerHTML=keys.map(k=>{
    const [y,m]=k.split("-"); const d=new Date(+y,+m-1,1);
    return `<option value="${k}">${d.toLocaleDateString("es-AR",{month:"long",year:"numeric"})}</option>`;
  }).join("");
  if(keys.includes(old))sel.value=old;
}
function renderFinances(){
  const sel=el("financeMonth"); if(!sel)return;
  const month=sel.value||[...new Set(state.jobs.map(j=>j.date.slice(0,7)))].sort().reverse()[0];
  const jobs=state.jobs.filter(j=>j.date.startsWith(month||""));
  const income=jobs.reduce((s,j)=>s+jobIncome(j),0), costs=jobs.reduce((s,j)=>s+jobCosts(j),0), profit=income-costs, pending=jobs.reduce((s,j)=>s+outstanding(j),0);
  const own=jobs.filter(j=>j.origin==="propio").reduce((s,j)=>s+jobIncome(j),0);
  const prod=jobs.filter(j=>j.origin==="productora").reduce((s,j)=>s+jobIncome(j),0);
  el("financeContent").innerHTML=`<div class="metric-grid sensitive">
    <div class="metric-card"><small>Facturación</small><strong>${money(income)}</strong></div>
    <div class="metric-card"><small>Costos</small><strong>${money(costs)}</strong></div>
    <div class="metric-card"><small>Ganancia neta</small><strong>${money(profit)}</strong></div>
    <div class="metric-card"><small>Pendiente de cobro</small><strong>${money(pending)}</strong></div>
  </div>
  <div class="finance-grid finance-private">
    <div class="work-card"><h3>Trabajos del mes</h3><table class="finance-table"><thead><tr><th>Trabajo</th><th>Ingreso</th><th>Neto</th></tr></thead><tbody>
      ${jobs.map(j=>`<tr><td>${safe(j.eventType)} · ${safe(partyName(j))}</td><td>${money(j.total)}</td><td>${money(jobProfit(j))}</td></tr>`).join("")}
    </tbody></table></div>
    <div class="work-card"><h3>Origen de ingresos</h3>
      <div class="detail-list sensitive">
        <div class="detail-item"><span>Clientes propios</span><strong>${money(own)}</strong></div>
        <div class="detail-item"><span>Productoras</span><strong>${money(prod)}</strong></div>
        <div class="detail-item"><span>Costos registrados</span><strong>${money(costs)}</strong></div>
      </div>
    </div>
  </div>`;
}

function openJob(id){
  const j=state.jobs.find(x=>x.id===id); if(!j)return;
  const info=j.origin==="propio"?`
    <div class="detail-item"><span>Contratante</span><strong>${safe(j.contractor||"—")}</strong></div>
    <div class="detail-item"><span>Agasajado/s</span><strong>${safe(j.honorees||"—")}</strong></div>
    <div class="detail-item"><span>Teléfono</span><strong>${safe(j.phone||"—")}</strong></div>
    <div class="detail-item"><span>Invitados</span><strong>${safe(j.guests||"—")}</strong></div>`:`
    <div class="detail-item"><span>Productora</span><strong>${safe(j.producer||"—")}</strong></div>
    <div class="detail-item"><span>Contacto</span><strong>${safe(j.producerContact||"—")}</strong></div>
    <div class="detail-item"><span>Vehículo propio</span><strong>${j.ownVehicle?"Sí":"No"}</strong></div>
    <div class="detail-item"><span>Fecha estimada de cobro</span><strong>${safe(j.dueDate||"—")}</strong></div>`;
  el("modalContent").innerHTML=`<div class="modal-hero">
    <span class="pill ${j.origin==="propio"?"own":"producer"}">${safe(originLabel(j))}</span>
    <h2>${safe(j.eventType)} · ${safe(partyName(j))}</h2>
    <p class="muted">${safe(longDateFmt.format(isoDate(j.date)))} · ${safe(j.start)}–${safe(j.end)} · ${safe(j.venue)} · ${safe(j.city)}</p>
  </div>
  <div class="detail-grid">
    <div class="detail-box"><h3>Datos</h3><div class="detail-list">
      <div class="detail-item"><span>Servicio</span><strong>${safe(j.service||"—")}</strong></div>${info}
      <div class="detail-item"><span>Estado</span><strong>${safe(statusLabel(j.status))}</strong></div>
    </div></div>
    <div class="detail-box sensitive"><h3>Finanzas</h3><div class="detail-list">
      <div class="detail-item"><span>Total</span><strong>${money(j.total)}</strong></div>
      <div class="detail-item"><span>Cobrado</span><strong>${money(j.paid)}</strong></div>
      <div class="detail-item"><span>Pendiente</span><strong>${money(outstanding(j))}</strong></div>
      <div class="detail-item"><span>Costos</span><strong>${money(jobCosts(j))}</strong></div>
      <div class="detail-item"><span>Ganancia neta</span><strong>${money(jobProfit(j))}</strong></div>
    </div></div>
  </div>
  <div class="detail-box" style="margin-top:12px"><h3>Notas</h3><p>${safe(j.notes||"Sin notas.")}</p></div>
  <div class="detail-box sensitive" style="margin-top:12px"><h3>Costos cargados</h3><div class="detail-list">
    ${(j.costs||[]).length?(j.costs||[]).map(c=>`<div class="detail-item"><span>${safe(c.name)}${c.hours?` · ${c.hours} h`:""}</span><strong>${money(c.amount)}</strong></div>`).join(""):"<span class='muted'>Sin costos cargados.</span>"}
  </div></div>
  <div class="modal-actions">
    <div class="inline-actions">
      <button class="mini-btn" data-edit-job="${j.id}">Editar</button>
      <button class="mini-btn danger" data-delete-job="${j.id}">Eliminar</button>
    </div>
    <button class="primary-btn" data-edit-job="${j.id}">EDITAR TRABAJO</button>
  </div>`;
  el("modalBackdrop").classList.remove("hidden");
}

function jobForm(j={}){
  const own=(j.origin||"propio")==="propio";
  return `<form id="jobForm">
    <div class="modal-hero"><p class="eyebrow">${j.id?"EDITAR":"NUEVO"} TRABAJO</p><h2>${j.id?"Actualizar trabajo":"Agregar a la agenda"}</h2></div>
    <div class="form-section"><h3>Tipo de trabajo</h3><div class="form-grid">
      <label>Origen<select name="origin" id="originSelect"><option value="propio" ${own?"selected":""}>Cliente propio</option><option value="productora" ${!own?"selected":""}>Otra productora</option></select></label>
      <label>Tipo de evento<input name="eventType" value="${safe(j.eventType||"")}" placeholder="Boda, 15 años…"></label>
      <label>Servicio<select name="service"><option ${j.service==="Foto"?"selected":""}>Foto</option><option ${j.service==="Video"?"selected":""}>Video</option><option ${j.service==="Foto + Video"?"selected":""}>Foto + Video</option></select></label>
      <label>Fecha<input type="date" name="date" value="${safe(j.date||"")}"></label>
      <label>Horario inicio<input type="time" name="start" value="${safe(j.start||"")}"></label>
      <label>Horario fin<input type="time" name="end" value="${safe(j.end||"")}"></label>
      <label>Salón<input name="venue" value="${safe(j.venue||"")}"></label>
      <label>Ciudad<input name="city" value="${safe(j.city||"")}"></label>
    </div></div>

    <div id="ownFields" class="form-section ${own?"":"hidden"}"><h3>Cliente propio</h3><div class="form-grid">
      <label>Nombre contratante<input name="contractor" value="${safe(j.contractor||"")}"></label>
      <label>Nombre agasajado/s<input name="honorees" value="${safe(j.honorees||"")}"></label>
      <label>Teléfono<input name="phone" value="${safe(j.phone||"")}"></label>
      <label>Cantidad de invitados<input type="number" name="guests" value="${safe(j.guests||"")}"></label>
      <label>Forma de pago<select name="paymentMode"><option ${j.paymentMode==="Contado"?"selected":""}>Contado</option><option ${j.paymentMode==="30% + cuotas"?"selected":""}>30% + cuotas</option></select></label>
      <label>Estado<select name="statusOwn">${["consulta","presupuestado","reservado","realizado","entregado","cobrado"].map(x=>`<option value="${x}" ${j.status===x?"selected":""}>${statusLabel(x)}</option>`).join("")}</select></label>
    </div></div>

    <div id="producerFields" class="form-section ${!own?"":"hidden"}"><h3>Trabajo para productora</h3><div class="form-grid">
      <label>Productora / quién te contrata<input name="producer" value="${safe(j.producer||"")}"></label>
      <label>Contacto<input name="producerContact" value="${safe(j.producerContact||"")}"></label>
      <label>Vehículo propio<select name="ownVehicle"><option value="true" ${j.ownVehicle?"selected":""}>Sí</option><option value="false" ${j.ownVehicle===false?"selected":""}>No</option></select></label>
      <label>Fecha estimada de cobro<input type="date" name="dueDate" value="${safe(j.dueDate||"")}"></label>
      <label>Estado<select name="statusProducer">${["confirmado","realizado","pendiente_cobro","cobrado"].map(x=>`<option value="${x}" ${j.status===x?"selected":""}>${statusLabel(x)}</option>`).join("")}</select></label>
    </div></div>

    <div class="form-section"><h3>Dinero</h3><div class="form-grid">
      <label>Total / lo que cobrás<input type="number" name="total" value="${safe(j.total||0)}"></label>
      <label>Ya cobrado<input type="number" name="paid" value="${safe(j.paid||0)}"></label>
    </div></div>
    <div class="form-section"><h3>Notas</h3><textarea name="notes">${safe(j.notes||"")}</textarea></div>
    <div class="modal-actions"><button type="button" class="secondary-btn" id="cancelForm">Cancelar</button><button class="primary-btn" type="submit">GUARDAR TRABAJO</button></div>
  </form>`;
}
function openForm(id){
  const j=id?state.jobs.find(x=>x.id===id):{};
  el("modalContent").innerHTML=jobForm(j||{});
  el("modalBackdrop").classList.remove("hidden");
  el("originSelect").addEventListener("change",e=>{
    const own=e.target.value==="propio";
    el("ownFields").classList.toggle("hidden",!own); el("producerFields").classList.toggle("hidden",own);
  });
  el("cancelForm").onclick=closeModal;
  el("jobForm").onsubmit=e=>{
    e.preventDefault(); const fd=new FormData(e.target), obj=Object.fromEntries(fd.entries());
    const origin=obj.origin;
    const old=j?.id?j:{costs:[]};
    const job={...old,id:j?.id||("j"+Date.now()),origin,eventType:obj.eventType,service:obj.service,date:obj.date,start:obj.start,end:obj.end,venue:obj.venue,city:obj.city,
      total:Number(obj.total||0),paid:Number(obj.paid||0),notes:obj.notes,costs:old.costs||[]};
    if(origin==="propio") Object.assign(job,{contractor:obj.contractor,honorees:obj.honorees,phone:obj.phone,guests:Number(obj.guests||0),paymentMode:obj.paymentMode,status:obj.statusOwn});
    else Object.assign(job,{producer:obj.producer,producerContact:obj.producerContact,ownVehicle:obj.ownVehicle==="true",dueDate:obj.dueDate,status:obj.statusProducer});
    if(j?.id) state.jobs=state.jobs.map(x=>x.id===j.id?job:x); else state.jobs.push(job);
    saveState(); closeModal(); initFinanceMonths(); renderAll(); showToast(j?.id?"Trabajo actualizado":"Trabajo agregado a la agenda");
  }
}
function closeModal(){el("modalBackdrop").classList.add("hidden")}
function deleteJob(id){
  if(!confirm("¿Eliminar este trabajo?"))return;
  state.jobs=state.jobs.filter(x=>x.id!==id);saveState();closeModal();initFinanceMonths();renderAll();showToast("Trabajo eliminado");
}

document.addEventListener("click",e=>{
  const nav=e.target.closest("[data-nav]"); if(nav){setView(nav.dataset.nav);return}
  const job=e.target.closest("[data-open-job]"); if(job){openJob(job.dataset.openJob);return}
  const edit=e.target.closest("[data-edit-job]"); if(edit){openForm(edit.dataset.editJob);return}
  const del=e.target.closest("[data-delete-job]"); if(del){deleteJob(del.dataset.deleteJob);return}
  const ag=e.target.closest("[data-agenda-mode]"); if(ag){agendaMode=ag.dataset.agendaMode;renderAgenda();return}
  const ct=e.target.closest("[data-contact-tab]"); if(ct){contactTab=ct.dataset.contactTab;renderContacts();return}
});
el("newJobBtn").onclick=()=>openForm();
el("modalClose").onclick=closeModal;
el("modalBackdrop").onclick=e=>{if(e.target===el("modalBackdrop"))closeModal()}
el("jobsSearch").oninput=renderJobs; el("jobsFilter").onchange=renderJobs;
el("financeMonth").onchange=renderFinances;
el("privacyBtn").onclick=()=>{
  state.settings.privacy=!state.settings.privacy;saveState();document.body.classList.toggle("privacy-on",state.settings.privacy);
  showToast(state.settings.privacy?"Modo discreto activado":"Modo discreto desactivado");
};
el("exportBtn").onclick=()=>{
  const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="victorio-tripode-work-backup.json";a.click();URL.revokeObjectURL(a.href);
};
el("importInput").onchange=e=>{
  const f=e.target.files[0];if(!f)return;const r=new FileReader();
  r.onload=()=>{try{state=JSON.parse(r.result);saveState();initFinanceMonths();renderAll();showToast("Backup importado")}catch{alert("El archivo no es un backup válido.")}};r.readAsText(f)
};
el("resetDemoBtn").onclick=()=>{if(confirm("¿Restaurar los datos de demostración?")){state=clone(demoData);saveState();initFinanceMonths();renderAll();showToast("Datos demo restaurados")}};

if("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(()=>{});
initFinanceMonths();renderAll();
