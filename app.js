/* ============ Utilities ============ */
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pad=n=>String(n).padStart(2,'0');
const dstr=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const todayStr=()=>dstr(new Date());
const addDays=n=>{const d=new Date();d.setDate(d.getDate()+n);return dstr(d)};
const toMin=t=>{const [h,m]=t.split(':').map(Number);return h*60+m};
const fmt=m=>pad(Math.floor(m/60))+':'+pad(m%60);
const dt=(d,t)=>{const [y,mo,da]=d.split('-').map(Number);const [h,mi]=t.split(':').map(Number);return new Date(y,mo-1,da,h,mi)};
const fmtDate=d=>{const [y,m,da]=d.split('-').map(Number);return new Date(y,m-1,da).toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'})};
const fmtDur=m=>{const h=Math.floor(m/60),r=m%60;return h&&r?h+' ชม. '+r+' นาที':h?h+' ชม.':r+' นาที'};
const overlap=(a1,a2,b1,b2)=>a1<b2&&b1<a2;
const uid=p=>p+Math.random().toString(36).slice(2,9);
const hashPw=s=>{try{return btoa(unescape(encodeURIComponent('bs::'+s)))}catch(e){return s}};

/* ============ Storage (localStorage with in-memory fallback) ============ */
const store={mem:{},
  get(k,d){try{const v=localStorage.getItem(k);if(v!==null)return JSON.parse(v)}catch(e){return k in this.mem?this.mem[k]:d}return k in this.mem?this.mem[k]:d},
  set(k,v){this.mem[k]=v;try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}},
  del(k){delete this.mem[k];try{localStorage.removeItem(k)}catch(e){}}};
const K={users:'bs_users',tables:'bs_tables',bookings:'bs_bookings',policy:'bs_policy',session:'bs_session',seeded:'bs_seeded_v1'};
const getUsers=()=>store.get(K.users,[]),setUsers=v=>store.set(K.users,v);
const getTables=()=>store.get(K.tables,[]),setTables=v=>store.set(K.tables,v);
const getBookings=()=>store.get(K.bookings,[]),setBookings=v=>store.set(K.bookings,v);
const DEFAULT_POLICY={open:'08:00',close:'20:00',maxHours:3,grace:15,autoApprove:true};
const getPolicy=()=>Object.assign({},DEFAULT_POLICY,store.get(K.policy,{}));
const TYPES=['โต๊ะอ่านหนังสือ','ห้องประชุมกลุ่ม','โต๊ะทำงานส่วนตัว','พื้นที่ส่วนกลาง'];
const ACTIVE=['pending','approved','checked_in'];
const EARLY=15;
const STATUS={pending:'รออนุมัติ',approved:'อนุมัติแล้ว',checked_in:'เช็กอินแล้ว',completed:'ใช้งานเสร็จสิ้น',cancelled:'ยกเลิกโดยผู้ใช้',cancelled_admin:'ยกเลิกโดยผู้ดูแล',rejected:'ถูกปฏิเสธ',no_show:'ถูกยกเลิกเนื่องจากไม่มาแสดงตัว',expired:'หมดเวลาโดยไม่ได้รับอนุมัติ'};
const chip=s=>`<span class="chip s-${s}">${esc(STATUS[s]||s)}</span>`;

/* ============ Theme (light / dark) ============ */
(function(){const t=store.get('bs_theme',null);if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t)})();
const themeNow=()=>document.documentElement.getAttribute('data-theme')||(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
const themeBtn='<button type="button" class="icon-btn theme-btn" aria-label="สลับโหมดมืด/สว่าง"></button>';
function syncTheme(){document.querySelectorAll('.theme-btn').forEach(b=>{const d=themeNow()==='dark';b.textContent=d?'☀':'☾';b.setAttribute('aria-label',d?'สลับเป็นโหมดสว่าง':'สลับเป็นโหมดมืด');b.title=d?'โหมดสว่าง':'โหมดมืด'})}
function wireTheme(){
  syncTheme();
  document.querySelectorAll('.theme-btn').forEach(b=>b.onclick=()=>{
    const n=themeNow()==='dark'?'light':'dark';
    document.documentElement.setAttribute('data-theme',n);store.set('bs_theme',n);syncTheme();
    if(charts.length&&refresh)refresh();
  });
}
if(window.matchMedia)try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{syncTheme();if(charts.length&&refresh)refresh()})}catch(e){}

/* ============ Seed demo data ============ */
function seed(){
  const users=[
    {id:'u_admin',name:'ผู้ดูแลระบบ',email:'admin@demo.com',pw:hashPw('admin123'),role:'admin'},
    {id:'u_demo',name:'สมชาย ใจดี',email:'user@demo.com',pw:hashPw('user123'),role:'user'},
    {id:'u_2',name:'พิมพ์ชนก ศรีสุข',email:'pimchanok@demo.com',pw:hashPw('user123'),role:'user'},
    {id:'u_3',name:'ธนภัทร วงศ์ทอง',email:'thanapat@demo.com',pw:hashPw('user123'),role:'user'},
    {id:'u_4',name:'กัญญา มีสุข',email:'kanya@demo.com',pw:hashPw('user123'),role:'user'},
    {id:'u_5',name:'ณัฐวุฒิ แสงจันทร์',email:'nattawut@demo.com',pw:hashPw('user123'),role:'user'}];
  setUsers(users);
  const defs=[['A1',0,2],['A2',0,2],['A3',0,2],['A4',0,2],['B1',1,6],['B2',1,6],['B3',1,8],['C1',2,1],['C2',2,1],['C3',2,1],['D1',3,8],['D2',3,10]];
  const tables=defs.map(([n,t,s],i)=>({id:'t_'+(i+1),name:'โต๊ะ '+n,type:TYPES[t],seats:s,status:n==='B3'?'maintenance':'active'}));
  setTables(tables);
  store.set(K.policy,DEFAULT_POLICY);
  let seedN=42;const rnd=()=>{seedN|=0;seedN=seedN+0x6D2B79F5|0;let t=Math.imul(seedN^seedN>>>15,1|seedN);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
  const bookings=[];const now=new Date();const nowMin=now.getHours()*60+now.getMinutes();
  const act=tables.filter(t=>t.status==='active');
  const add=(date,s,e,status,tb,u)=>{
    if(bookings.some(b=>b.tableId===tb.id&&b.date===date&&ACTIVE.concat(['completed','no_show']).includes(b.status)&&overlap(s,e,toMin(b.start),toMin(b.end))))return false;
    bookings.push({id:uid('b_'),userId:u.id,userName:u.name,tableId:tb.id,tableName:tb.name,type:tb.type,date,start:fmt(s),end:fmt(e),status,createdAt:new Date().toISOString()});return true};
  const people=users.filter(u=>u.role==='user');
  for(let d=-6;d<=0;d++){
    const date=addDays(d),n=d===0?7:5+Math.floor(rnd()*5);
    for(let i=0;i<n;i++){
      const tb=act[Math.floor(rnd()*act.length)],u=people[Math.floor(rnd()*people.length)];
      const s=(8+Math.floor(rnd()*10))*60+(rnd()<.5?0:30),e=Math.min(s+(rnd()<.5?60:120),20*60);
      let st;
      if(d<0){const r=rnd();st=r<.7?'completed':r<.82?'no_show':r<.92?'cancelled':'rejected'}
      else{if(e<=nowMin-15){st=rnd()<.85?'completed':'no_show'}else if(s<=nowMin){st=rnd()<.7?'checked_in':'no_show'}else{st=rnd()<.8?'approved':'pending'}
        if(st==='checked_in'&&e<=nowMin)st='completed'}
      add(date,s,e,st,tb,u)}
  }
  setBookings(bookings);store.set(K.seeded,true);
}
if(!store.get(K.seeded,false)||!getUsers().length)seed();

/* ============ Auth ============ */
const currentUser=()=>{const s=store.get(K.session,null);return s?getUsers().find(u=>u.id===s.userId)||null:null};
const homeOf=u=>u.role==='admin'?'#/admin':'#/book';

/* ============ Booking logic ============ */
function sweep(){
  const p=getPolicy(),now=new Date();let changed=false;const bs=getBookings();
  bs.forEach(b=>{
    const s=dt(b.date,b.start),e=dt(b.date,b.end),deadline=new Date(s.getTime()+p.grace*60000);
    if(b.status==='approved'&&now>deadline){b.status='no_show';changed=true}
    else if(b.status==='pending'&&now>deadline){b.status='expired';changed=true}
    else if(b.status==='checked_in'&&now>=e){b.status='completed';changed=true}
  });
  if(changed)setBookings(bs);return changed;
}
function rangeError(date,s,e){
  const p=getPolicy();
  if(!date)return 'กรุณาเลือกวันที่';
  const sm=toMin(s),em=toMin(e);
  if(em<=sm)return 'เวลาสิ้นสุดต้องอยู่หลังเวลาเริ่มต้น';
  if(sm<toMin(p.open)||em>toMin(p.close))return 'ระบบเปิดให้จองเวลา '+p.open+'–'+p.close+' น.';
  if(date<todayStr())return 'ไม่สามารถจองย้อนหลังได้';
  if(dt(date,s)<new Date())return 'เวลาเริ่มต้นผ่านไปแล้ว กรุณาเลือกช่วงเวลาถัดไป';
  return null;
}
function userMinutes(userId,date){
  return getBookings().filter(b=>b.userId===userId&&b.date===date&&ACTIVE.includes(b.status)).reduce((a,b)=>a+toMin(b.end)-toMin(b.start),0);
}
function validateBooking(userId,tid,date,s,e){
  const p=getPolicy(),t=getTables().find(x=>x.id===tid);
  if(!t)return 'ไม่พบโต๊ะนี้';
  if(t.status!=='active')return 'โต๊ะนี้ปิดปรับปรุง ไม่สามารถจองได้';
  const re=rangeError(date,s,e);if(re)return re;
  const sm=toMin(s),em=toMin(e);
  const bs=getBookings().filter(b=>ACTIVE.includes(b.status)&&b.date===date);
  if(bs.some(b=>b.tableId===tid&&overlap(sm,em,toMin(b.start),toMin(b.end))))return 'โต๊ะนี้ถูกจองในช่วงเวลาดังกล่าวแล้ว';
  const mine=bs.filter(b=>b.userId===userId);
  if(mine.some(b=>overlap(sm,em,toMin(b.start),toMin(b.end))))return 'คุณมีการจองอื่นที่ซ้อนทับกับช่วงเวลานี้';
  const used=userMinutes(userId,date);
  if(used+(em-sm)>p.maxHours*60)return 'จองได้สูงสุด '+p.maxHours+' ชั่วโมงต่อวัน (วันนี้คุณจองไว้แล้ว '+fmtDur(used)+')';
  return null;
}
function createBooking(u,tid,date,s,e){
  const err=validateBooking(u.id,tid,date,s,e);if(err)return {err};
  const t=getTables().find(x=>x.id===tid),p=getPolicy(),bs=getBookings();
  const b={id:uid('b_'),userId:u.id,userName:u.name,tableId:t.id,tableName:t.name,type:t.type,date,start:s,end:e,status:p.autoApprove?'approved':'pending',createdAt:new Date().toISOString()};
  bs.push(b);setBookings(bs);return {b};
}
function setStatus(id,status){const bs=getBookings(),b=bs.find(x=>x.id===id);if(b){b.status=status;setBookings(bs)}}

/* ============ UI helpers ============ */
const $=(s,el)=>(el||document).querySelector(s);
const $$=(s,el)=>Array.from((el||document).querySelectorAll(s));
const app=$('#app');
function toast(msg,isErr){const d=document.createElement('div');d.className='toast'+(isErr?' err':'');d.textContent=msg;$('#toasts').appendChild(d);setTimeout(()=>d.remove(),3400)}
function dialog(html,onMount){const d=$('#dlg');d.innerHTML=html;if(!d.open){try{d.showModal()}catch(e){d.setAttribute('open','')}}if(onMount)onMount(d);return d}
function closeDialog(){const d=$('#dlg');try{d.close()}catch(e){d.removeAttribute('open')}}
function confirmBox(title,body,okLabel,danger){
  return new Promise(res=>{
    dialog(`<h3>${esc(title)}</h3><div>${body}</div><div class="dlg-act" style="margin-top:18px"><button class="btn ghost" id="c-no">ปิด</button><button class="btn ${danger?'danger':''}" id="c-ok">${esc(okLabel)}</button></div>`,d=>{
      $('#c-no',d).onclick=()=>{closeDialog();res(false)};
      $('#c-ok',d).onclick=()=>{closeDialog();res(true)};
      d.oncancel=()=>res(false);
    });
  });
}
const logoHTML='<span class="logo" aria-hidden="true"><i></i><i></i><i></i><i></i></span>';
var refresh=null,charts=[];
function killCharts(){charts.forEach(c=>{try{c.destroy()}catch(e){}});charts=[]}

/* ============ Router ============ */
function go(h){if(location.hash===h)route();else location.hash=h}
function route(){
  refresh=null;killCharts();sweep();
  const h=(location.hash||'').replace(/^#/,'')||'/';
  const u=currentUser(),pub=['/login','/register'];
  if(!u){if(!pub.includes(h)){go('#/login');return}renderAuth(h);return}
  if(pub.includes(h)||h==='/'){go(homeOf(u));return}
  if(u.role==='admin'&&!h.startsWith('/admin')){go('#/admin');return}
  if(u.role==='user'&&h.startsWith('/admin')){go('#/book');return}
  const pages={'/book':renderBook,'/my':renderMy,'/admin':renderDash,'/admin/manage':renderManage};
  if(!pages[h]){go(homeOf(u));return}
  const links=u.role==='admin'?[['/admin','ภาพรวม'],['/admin/manage','จัดการระบบ']]:[['/book','จองโต๊ะ'],['/my','การจองของฉัน']];
  app.innerHTML=`<header class="top"><div class="wrap top-in">
    <a class="brand" href="${homeOf(u)}">${logoHTML}<span>BookSpace</span></a>
    <nav class="nav" aria-label="เมนูหลัก">${links.map(([p,t])=>`<a href="#${p}" class="${h===p?'on':''}" ${h===p?'aria-current="page"':''}>${t}</a>`).join('')}</nav>
    <div class="who"><span class="avatar">${esc((u.name.trim()[0]||'?'))}</span><div class="who-t"><b>${esc(u.name)}</b><small>${u.role==='admin'?'ผู้ดูแลระบบ':'ผู้ใช้งาน'}</small></div>${themeBtn}<button class="btn ghost sm" id="logout">ออกจากระบบ</button></div>
  </div></header><main class="wrap" id="view"></main>`;
  wireTheme();
  $('#logout').onclick=()=>{store.del(K.session);go('#/login')};
  pages[h](u,$('#view'));
  window.scrollTo(0,0);
}
window.addEventListener('hashchange',route);
setInterval(()=>{if(sweep()&&refresh)refresh()},15000);
setInterval(()=>{if(refresh&&currentUser())refresh()},60000);

/* ============ Auth page ============ */
function renderAuth(h){
  const reg=h==='/register';
  const tiles='f t f c t f f t c f t f'.split(' ').map(c=>`<i class="${c}"></i>`).join('');
  app.innerHTML=`<div class="auth">
    <section class="auth-side">
      <div class="brand" style="color:inherit">${logoHTML}<span>BookSpace</span></div>
      <div><h1>จองโต๊ะและพื้นที่ส่วนกลาง เห็นที่ว่างก่อนเดินไป</h1><p style="margin-top:12px">เลือกวัน เวลา และประเภทพื้นที่ แล้วกดที่โต๊ะบนแผนผังเพื่อจองได้ทันที</p></div>
      <div><div class="mini" aria-hidden="true">${tiles}</div>
      <div class="legend-dark" style="margin-top:14px"><span>เขียว = ว่าง</span><span>แดง = มีคนจองแล้ว</span><span>เทา = ปิดปรับปรุง</span></div></div>
    </section>
    <section class="auth-main">${themeBtn}<div class="auth-box">
      <h2>${reg?'สมัครสมาชิก':'เข้าสู่ระบบ'}</h2>
      <p class="muted">${reg?'สร้างบัญชีเพื่อเริ่มจองโต๊ะ':'ใช้อีเมลและรหัสผ่านที่ลงทะเบียนไว้'}</p>
      <div class="tabs" role="tablist"><a href="#/login" class="${reg?'':'on'}">เข้าสู่ระบบ</a><a href="#/register" class="${reg?'on':''}">สมัครสมาชิก</a></div>
      <form id="af" novalidate>
        ${reg?`<div class="field"><label for="a-name">ชื่อ-นามสกุล</label><input class="input" id="a-name" autocomplete="name" required></div>`:''}
        <div class="field"><label for="a-email">อีเมล</label><input class="input" id="a-email" type="email" autocomplete="email" required></div>
        <div class="field"><label for="a-pw">รหัสผ่าน</label><input class="input" id="a-pw" type="password" autocomplete="${reg?'new-password':'current-password'}" required>${reg?'<span class="hint">อย่างน้อย 6 ตัวอักษร</span>':''}</div>
        ${reg?`<div class="field"><label for="a-pw2">ยืนยันรหัสผ่าน</label><input class="input" id="a-pw2" type="password" autocomplete="new-password" required></div>
        <div class="field"><span class="lbl">ประเภทผู้ใช้งาน</span><div class="seg"><label><input type="radio" name="role" value="user" checked> นักศึกษา/พนักงาน</label><label><input type="radio" name="role" value="admin"> ผู้ดูแลระบบ</label></div></div>
        <div class="field" id="code-f" hidden><label for="a-code">รหัสผู้ดูแลระบบ</label><input class="input" id="a-code" autocomplete="off"><span class="hint">ตัวอย่างในเดโม: ADMIN2026</span></div>`:''}
        <div class="err" id="a-err" role="alert"></div>
        <button class="btn block" type="submit">${reg?'สมัครสมาชิก':'เข้าสู่ระบบ'}</button>
      </form>
      ${reg?'':`<div class="demo"><b>บัญชีสำหรับทดลอง</b><div class="muted">ข้อมูลทั้งหมดเก็บในเบราว์เซอร์ของคุณ</div>
        <button class="btn ghost sm" data-fill="user@demo.com|user123" type="button">ผู้ใช้ทั่วไป</button><button class="btn ghost sm" data-fill="admin@demo.com|admin123" type="button">ผู้ดูแลระบบ</button></div>`}
    </div></section></div>`;
  wireTheme();
  const err=m=>{$('#a-err').textContent=m};
  if(reg){$$('input[name=role]').forEach(r=>r.onchange=()=>{$('#code-f').hidden=$('input[name=role]:checked').value!=='admin'})}
  $$('[data-fill]').forEach(b=>b.onclick=()=>{const [e,p]=b.dataset.fill.split('|');$('#a-email').value=e;$('#a-pw').value=p;err('')});
  $('#af').onsubmit=ev=>{
    ev.preventDefault();err('');
    const email=$('#a-email').value.trim().toLowerCase(),pw=$('#a-pw').value;
    if(!/^\S+@\S+\.\S+$/.test(email))return err('รูปแบบอีเมลไม่ถูกต้อง');
    const users=getUsers();
    if(!reg){
      const u=users.find(x=>x.email===email&&x.pw===hashPw(pw));
      if(!u)return err('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
      store.set(K.session,{userId:u.id});toast('ยินดีต้อนรับ '+u.name);go(homeOf(u));return;
    }
    const name=$('#a-name').value.trim(),pw2=$('#a-pw2').value,role=$('input[name=role]:checked').value;
    if(name.length<2)return err('กรุณากรอกชื่อ-นามสกุล');
    if(pw.length<6)return err('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
    if(pw!==pw2)return err('รหัสผ่านและการยืนยันไม่ตรงกัน');
    if(users.some(x=>x.email===email))return err('อีเมลนี้ถูกใช้สมัครแล้ว');
    if(role==='admin'&&$('#a-code').value.trim()!=='ADMIN2026')return err('รหัสผู้ดูแลระบบไม่ถูกต้อง');
    const u={id:uid('u_'),name,email,pw:hashPw(pw),role};users.push(u);setUsers(users);
    store.set(K.session,{userId:u.id});toast('สมัครสมาชิกสำเร็จ');go(homeOf(u));
  };
}

/* ============ User: booking page ============ */
let bs=null;
function defaultSearch(){
  const p=getPolicy(),now=new Date();let date=todayStr();
  let s=Math.max(Math.ceil((now.getHours()*60+now.getMinutes()+1)/30)*30,toMin(p.open));
  if(s+30>toMin(p.close)){date=addDays(1);s=toMin(p.open)}
  return {date,start:fmt(s),end:fmt(Math.min(s+60,toMin(p.close))),type:'all'};
}
function renderBook(u,view){
  const p=getPolicy();if(!bs)bs=defaultSearch();
  const o=toMin(p.open),c=toMin(p.close);
  const slots=(from,to)=>{let a='';for(let m=from;m<=to;m+=30)a+=fmt(m)+'|';return a.split('|').filter(Boolean)};
  view.innerHTML=`<div class="page-h"><h1>จองโต๊ะ</h1><p>เลือกช่วงเวลาที่ต้องการ แล้วกดโต๊ะสีเขียวบนแผนผังเพื่อจอง</p></div>
  <div class="book-layout">
   <aside class="card search"><h2 style="margin-bottom:14px">ค้นหาโต๊ะว่าง</h2>
    <div class="search-fields"><div class="field"><label for="f-date">วันที่</label><input class="input" type="date" id="f-date" min="${todayStr()}" max="${addDays(30)}" value="${bs.date}"></div>
    <div class="row"><div class="field"><label for="f-start">เริ่ม</label><select class="input" id="f-start"></select></div>
    <div class="field"><label for="f-end">สิ้นสุด</label><select class="input" id="f-end"></select></div></div>
    <div class="field"><label for="f-type">ประเภทพื้นที่</label><select class="input" id="f-type"><option value="all">ทุกประเภท</option>${TYPES.map(t=>`<option>${esc(t)}</option>`).join('')}</select></div></div>
    <div class="quota" id="quota"></div>
   </aside>
   <section class="card"><div class="card-h"><h2>แผนผังพื้นที่</h2><span id="summary" class="muted"></span></div>
    <div class="legend"><span><i class="sw free"></i>ว่าง</span><span><i class="sw taken"></i>มีคนจองแล้ว</span><span><i class="sw closed"></i>ปิดปรับปรุง</span></div>
    <div id="msg"></div><div class="plan"><div class="plan-grid" id="plan"></div><div class="door">ทางเข้า</div></div>
   </section></div>`;
  const fs=$('#f-start'),fe=$('#f-end'),ft=$('#f-type'),fd=$('#f-date');
  function fillSelects(){
    fs.innerHTML=slots(o,c-30).map(t=>`<option ${t===bs.start?'selected':''}>${t}</option>`).join('');
    fe.innerHTML=slots(toMin(bs.start)+30,c).map(t=>`<option ${t===bs.end?'selected':''}>${t}</option>`).join('');
  }
  if(!slots(o,c-30).includes(bs.start)||toMin(bs.start)>=c){bs.start=p.open;bs.end=fmt(Math.min(o+60,c))}
  if(toMin(bs.end)<=toMin(bs.start))bs.end=fmt(Math.min(toMin(bs.start)+60,c));
  fillSelects();ft.value=bs.type;
  fd.onchange=()=>{bs.date=fd.value;draw()};
  fs.onchange=()=>{bs.start=fs.value;if(toMin(bs.end)<=toMin(bs.start))bs.end=fmt(Math.min(toMin(bs.start)+60,c));fillSelects();draw()};
  fe.onchange=()=>{bs.end=fe.value;draw()};
  ft.onchange=()=>{bs.type=ft.value;draw()};
  function draw(){
    const {date,start,end,type}=bs,rErr=rangeError(date,start,end);
    const act=getBookings().filter(b=>ACTIVE.includes(b.status)&&b.date===date);
    const sm=toMin(start),em=toMin(end);let free=0,total=0;
    $('#msg').innerHTML=rErr?`<div class="notice" role="alert">${esc(rErr)}</div>`:'';
    $('#plan').innerHTML=getTables().map(t=>{
      let st='free',mine=false;
      if(t.status!=='active')st='closed';
      else{const hit=act.find(b=>b.tableId===t.id&&overlap(sm,em,toMin(b.start),toMin(b.end)));if(hit){st='taken';mine=hit.userId===u.id}}
      const dim=type!=='all'&&t.type!==type;
      if(!dim){total++;if(st==='free')free++}
      const label=st==='free'?'ว่าง':st==='taken'?(mine?'คุณจองไว้':'มีคนจองแล้ว'):'ปิดปรับปรุง';
      return `<button class="tile ${st}${dim?' dim':''}" data-id="${t.id}" ${st==='free'&&!dim?'':'disabled'} aria-label="${esc(t.name)} ${label}"><b>${esc(t.name)}</b><small>${esc(t.type)}</small><span class="seats" aria-hidden="true">${'<i></i>'.repeat(Math.min(t.seats,8))}</span><span class="st">${label} · ${t.seats} ที่นั่ง</span></button>`;
    }).join('')||'<p class="muted">ยังไม่มีโต๊ะในระบบ</p>';
    $('#summary').textContent=rErr?'':'ว่าง '+free+' จาก '+total+' โต๊ะ';
    const used=userMinutes(u.id,date),max=p.maxHours*60;
    $('#quota').innerHTML=`<b>สิทธิ์การจองของวันที่เลือก</b><div>ใช้ไปแล้ว ${fmtDur(used)} จากสูงสุด ${p.maxHours} ชม.</div><div class="bar"><b style="width:${Math.min(100,used/max*100)}%"></b></div>`;
  }
  $('#plan').onclick=ev=>{
    const b=ev.target.closest('.tile');if(!b||b.disabled)return;
    const t=getTables().find(x=>x.id===b.dataset.id),{date,start,end}=bs;
    const err=validateBooking(u.id,t.id,date,start,end);
    if(err){toast(err,true);draw();return}
    dialog(`<h3>ยืนยันการจอง</h3><dl class="sum"><dt>โต๊ะ</dt><dd>${esc(t.name)} (${esc(t.type)})</dd><dt>วันที่</dt><dd>${fmtDate(date)}</dd><dt>เวลา</dt><dd>${start}–${end} น. (${fmtDur(toMin(end)-toMin(start))})</dd></dl>
      <p class="hint">กรุณาเช็กอินภายใน ${p.grace} นาทีหลังเวลาเริ่ม มิฉะนั้นระบบจะยกเลิกและคืนโต๊ะอัตโนมัติ</p>
      <div class="dlg-act" style="margin-top:16px"><button class="btn ghost" id="b-no">ปิด</button><button class="btn" id="b-ok">ยืนยันการจอง</button></div>`,d=>{
      $('#b-no',d).onclick=closeDialog;
      $('#b-ok',d).onclick=()=>{const r=createBooking(u,t.id,date,start,end);closeDialog();
        if(r.err){toast(r.err,true)}else{toast(r.b.status==='approved'?'จอง '+t.name+' สำเร็จ':'ส่งคำขอจอง '+t.name+' แล้ว รอผู้ดูแลอนุมัติ')}
        draw()};
    });
  };
  refresh=draw;draw();
}

/* ============ User: my bookings ============ */
let myTab='up';
function renderMy(u,view){
  const p=getPolicy();
  view.innerHTML=`<div class="page-h"><h1>การจองของฉัน</h1><p>ยกเลิกได้ก่อนถึงเวลาใช้งาน และต้องเช็กอินภายใน ${p.grace} นาทีนับจากเวลาเริ่ม</p></div>
  <div class="tabs" style="max-width:420px"><button type="button" data-t="up">กำลังจะมาถึง</button><button type="button" data-t="hist">ประวัติการจอง</button></div><div id="list"></div>`;
  $$('.tabs button').forEach(b=>b.onclick=()=>{myTab=b.dataset.t;draw()});
  function draw(){
    const p=getPolicy(),now=new Date();
    $$('.tabs button').forEach(b=>b.classList.toggle('on',b.dataset.t===myTab));
    const mine=getBookings().filter(b=>b.userId===u.id);
    const upc=b=>ACTIVE.includes(b.status);
    let list=mine.filter(b=>myTab==='up'?upc(b):!upc(b));
    list.sort((a,b)=>myTab==='up'?(a.date+a.start).localeCompare(b.date+b.start):(b.date+b.start).localeCompare(a.date+a.start));
    if(!list.length){$('#list').innerHTML=`<div class="card empty"><b>${myTab==='up'?'ยังไม่มีการจองที่กำลังจะมาถึง':'ยังไม่มีประวัติการจอง'}</b>${myTab==='up'?'<a class="btn" href="#/book" style="margin-top:12px">จองโต๊ะ</a>':''}</div>`;return}
    $('#list').innerHTML=`<div class="cards">`+list.map(b=>{
      const s=dt(b.date,b.start),e=dt(b.date,b.end);
      const canCancel=(b.status==='pending'||b.status==='approved')&&now<s;
      let ci='';
      if(b.status==='approved'){
        const open=new Date(s.getTime()-EARLY*60000),dead=new Date(s.getTime()+p.grace*60000);
        if(now<open)ci=`<button class="btn" disabled>เช็กอินเข้าใช้งาน</button><span class="hint" style="align-self:center">เช็กอินได้ตั้งแต่ ${fmt(toMin(b.start)-EARLY)} น.</span>`;
        else{const left=Math.max(0,Math.ceil((dead-now)/60000));ci=`<button class="btn" data-act="in" data-id="${b.id}">เช็กอินเข้าใช้งาน</button><span class="hint" style="align-self:center">เหลือเวลาเช็กอิน ${left} นาที</span>`}
      }
      return `<article class="card bk"><div class="bk-top"><div><h3>${esc(b.tableName)}</h3><span class="muted">${esc(b.type)}</span></div>${chip(b.status)}</div>
        <dl><dt>วันที่</dt><dd>${fmtDate(b.date)}</dd><dt>เวลา</dt><dd>${b.start}–${b.end} น.</dd></dl>
        <div class="bk-act">${ci}${canCancel?`<button class="btn danger" data-act="cancel" data-id="${b.id}">ยกเลิกการจอง</button>`:''}</div></article>`;
    }).join('')+`</div>`;
  }
  $('#list').onclick=async ev=>{
    const b=ev.target.closest('[data-act]');if(!b)return;
    const bk=getBookings().find(x=>x.id===b.dataset.id);if(!bk)return;
    if(b.dataset.act==='cancel'){
      if(dt(bk.date,bk.start)<=new Date()){toast('เลยเวลาเริ่มใช้งานแล้ว ไม่สามารถยกเลิกได้',true);draw();return}
      if(await confirmBox('ยกเลิกการจอง?',`<p>${esc(bk.tableName)} · ${fmtDate(bk.date)} ${bk.start}–${bk.end} น.</p>`,'ยกเลิกการจอง',true)){setStatus(bk.id,'cancelled');toast('ยกเลิกการจองแล้ว');draw()}
    }else{
      sweep();const cur=getBookings().find(x=>x.id===bk.id);
      if(cur.status!=='approved'){toast('การจองนี้ถูกยกเลิกเนื่องจากไม่มาแสดงตัวแล้ว',true);draw();return}
      setStatus(bk.id,'checked_in');toast('เช็กอินสำเร็จ ขอให้ใช้งานอย่างมีความสุข');draw();
    }
  };
  refresh=draw;draw();
}

/* ============ Admin: dashboard ============ */
function renderDash(u,view){
  const bk=getBookings(),today=todayStr(),now=new Date(),tables=getTables();
  const todayB=bk.filter(b=>b.date===today);
  const dead=['rejected','cancelled','cancelled_admin','expired'];
  const inUse=bk.filter(b=>b.status==='checked_in'&&dt(b.date,b.start)<=now&&now<dt(b.date,b.end)).length;
  const ns=bk.filter(b=>b.status==='no_show').length,nsToday=todayB.filter(b=>b.status==='no_show').length;
  const reached=bk.filter(b=>['no_show','completed','checked_in'].includes(b.status)).length;
  const pending=bk.filter(b=>b.status==='pending').length;
  const activeTables=tables.filter(t=>t.status==='active').length;
  view.innerHTML=`<div class="page-h"><h1>ภาพรวมการใช้งาน</h1><p>สรุปจากข้อมูลการจองทั้งหมดในระบบ</p></div>
  ${pending?`<div class="alert"><span>มี ${pending} คิวรอการอนุมัติ</span><a class="btn sm" href="#/admin/manage" id="go-q">ไปจัดการคิว</a></div>`:''}
  <div class="kpis">
   <div class="card kpi"><div class="ic" style="background:var(--info-bg);color:var(--info)" aria-hidden="true">▤</div><div><div class="v">${todayB.length}</div><div class="l">การจองทั้งหมดวันนี้</div><div class="s">ยกเลิก/ปฏิเสธ ${todayB.filter(b=>dead.includes(b.status)).length} รายการ</div></div></div>
   <div class="card kpi"><div class="ic" style="background:var(--free-bg);color:var(--free)" aria-hidden="true">●</div><div><div class="v">${inUse}</div><div class="l">โต๊ะที่กำลังใช้งานอยู่</div><div class="s">จาก ${activeTables} โต๊ะที่เปิดใช้งาน</div></div></div>
   <div class="card kpi"><div class="ic" style="background:var(--taken-bg);color:var(--taken)" aria-hidden="true">✕</div><div><div class="v">${ns}</div><div class="l">จองแล้วไม่มา (No-Show)</div><div class="s">วันนี้ ${nsToday} · คิดเป็น ${reached?Math.round(ns/reached*100):0}% ของการจองที่ถึงเวลา</div></div></div>
  </div>
  <div class="charts">
   <div class="card"><div class="card-h"><h2>ประเภทพื้นที่ที่ถูกจองมากที่สุด</h2></div><div class="chart-box"><canvas id="c-pie" role="img" aria-label="กราฟวงกลมสัดส่วนประเภทพื้นที่"></canvas></div></div>
   <div class="card"><div class="card-h"><h2>ช่วงเวลาที่มีคนใช้งานหนาแน่น</h2></div><div class="chart-box"><canvas id="c-bar" role="img" aria-label="กราฟแท่งจำนวนการจองรายชั่วโมง"></canvas></div></div>
  </div>`;
  const valid=bk.filter(b=>!dead.includes(b.status));
  const byType={};valid.forEach(b=>{byType[b.type]=(byType[b.type]||0)+1});
  const hours={};valid.forEach(b=>{for(let h=Math.floor(toMin(b.start)/60);h<Math.ceil(toMin(b.end)/60);h++)hours[h]=(hours[h]||0)+1});
  const p=getPolicy(),keys=Object.keys(hours).map(Number);
  const lo=Math.min(Math.floor(toMin(p.open)/60),...keys),hi=Math.max(Math.ceil(toMin(p.close)/60)-1,...keys);
  const hl=[];for(let h=lo;h<=hi;h++)hl.push(h);
  if(typeof Chart==='undefined'){$$('.chart-box').forEach(b=>b.innerHTML='<p class="muted">โหลดไลบรารีกราฟไม่สำเร็จ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต</p>');return}
  const css=getComputedStyle(document.documentElement),ink=css.getPropertyValue('--ink').trim()||'#10243A',line=css.getPropertyValue('--line').trim()||'#ccc';
  Chart.defaults.font.family="'IBM Plex Sans Thai',system-ui,sans-serif";Chart.defaults.color=ink;
  const pal=['#F58A33','#4A6FD0','#2E9E75','#C4546E'];
  const tl=TYPES.filter(t=>byType[t]);
  charts.push(new Chart($('#c-pie'),{type:'pie',data:{labels:tl,datasets:[{data:tl.map(t=>byType[t]),backgroundColor:tl.map(t=>pal[TYPES.indexOf(t)%4]),borderColor:css.getPropertyValue('--surface').trim()||'#fff',borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'},tooltip:{callbacks:{label:c=>' '+c.label+': '+c.parsed+' ครั้ง'}}}}}));
  charts.push(new Chart($('#c-bar'),{type:'bar',data:{labels:hl.map(h=>pad(h)+':00'),datasets:[{label:'จำนวนการจอง',data:hl.map(h=>hours[h]||0),backgroundColor:'#F58A33',borderRadius:5}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{precision:0},grid:{color:line}},x:{grid:{display:false}}}}}));
  refresh=()=>{killCharts();renderDash(u,view)};
}

/* ============ Admin: manage ============ */
let mTab='tables',editId=null,qf={text:'',status:'all'};
function renderManage(u,view){
  view.innerHTML=`<div class="page-h"><h1>จัดการระบบ</h1><p>ตั้งค่าพื้นที่ นโยบายการจอง และดูแลคิวทั้งหมด</p></div>
  <div class="tabs" style="max-width:560px"><button type="button" data-t="tables">จัดการพื้นที่</button><button type="button" data-t="policy">สิทธิ์การจอง</button><button type="button" data-t="queue">คิวและผู้ใช้งาน</button></div><div id="pane"></div>`;
  const pane=$('#pane');
  function show(){
    $$('.tabs button',view).forEach(b=>b.classList.toggle('on',b.dataset.t===mTab));
    refresh=null;
    if(mTab==='tables')tablesPane();else if(mTab==='policy')policyPane();else queuePane();
  }
  $$('.tabs button',view).forEach(b=>b.onclick=()=>{mTab=b.dataset.t;editId=null;show()});

  function tablesPane(){
    const ed=editId&&getTables().find(t=>t.id===editId);
    pane.innerHTML=`<div class="mgr">
     <form class="card" id="tf" novalidate><h2 style="margin-bottom:14px">${ed?'แก้ไขโต๊ะ':'เพิ่มโต๊ะใหม่'}</h2>
      <div class="field"><label for="t-name">ชื่อ/เบอร์โต๊ะ</label><input class="input" id="t-name" value="${ed?esc(ed.name):''}" placeholder="เช่น โต๊ะ A5"></div>
      <div class="field"><label for="t-type">ประเภทพื้นที่</label><select class="input" id="t-type">${TYPES.map(t=>`<option ${ed&&ed.type===t?'selected':''}>${esc(t)}</option>`).join('')}</select></div>
      <div class="field"><label for="t-seats">จำนวนที่นั่ง</label><input class="input" id="t-seats" type="number" min="1" max="30" value="${ed?ed.seats:2}"></div>
      <div class="err" id="t-err" role="alert"></div>
      <div style="display:flex;gap:8px"><button class="btn" type="submit">${ed?'บันทึกการแก้ไข':'เพิ่มโต๊ะ'}</button>${ed?'<button class="btn ghost" type="button" id="t-cancel">ยกเลิก</button>':''}</div></form>
     <div class="card"><div class="card-h"><h2>โต๊ะทั้งหมด (${getTables().length})</h2></div><div class="tbl-wrap"><table><thead><tr><th>โต๊ะ</th><th>ประเภท</th><th>ที่นั่ง</th><th>สถานะ</th><th>เปิดใช้งาน</th><th></th></tr></thead><tbody id="t-body"></tbody></table></div>
     <p class="hint" style="margin-top:10px">เมื่อสลับเป็น “ปิดปรับปรุง” ผู้ใช้จะจองโต๊ะนั้นไม่ได้ ส่วนการจองเดิมที่มีอยู่ให้ยกเลิกได้ที่แท็บคิวและผู้ใช้งาน</p></div></div>`;
    drawTables();
    $('#t-cancel')&&($('#t-cancel').onclick=()=>{editId=null;tablesPane()});
    $('#tf').onsubmit=ev=>{
      ev.preventDefault();const err=m=>{$('#t-err').textContent=m};
      const name=$('#t-name').value.trim(),type=$('#t-type').value,seats=parseInt($('#t-seats').value,10);
      if(!name)return err('กรุณากรอกชื่อโต๊ะ');
      if(!(seats>=1&&seats<=30))return err('จำนวนที่นั่งต้องอยู่ระหว่าง 1–30');
      const ts=getTables();
      if(ts.some(t=>t.name.toLowerCase()===name.toLowerCase()&&t.id!==editId))return err('มีโต๊ะชื่อนี้อยู่แล้ว');
      if(ed){Object.assign(ts.find(t=>t.id===editId),{name,type,seats});toast('บันทึกการแก้ไขแล้ว')}
      else{ts.push({id:uid('t_'),name,type,seats,status:'active'});toast('เพิ่ม '+name+' แล้ว')}
      setTables(ts);editId=null;tablesPane();
    };
  }
  function drawTables(){
    $('#t-body').innerHTML=getTables().map(t=>`<tr><td><b>${esc(t.name)}</b></td><td>${esc(t.type)}</td><td>${t.seats}</td>
      <td><span class="chip ${t.status==='active'?'s-active':'s-maint'}">${t.status==='active'?'เปิดใช้งาน':'ปิดปรับปรุง'}</span></td>
      <td><button class="switch" role="switch" aria-checked="${t.status==='active'}" aria-label="เปิดใช้งาน ${esc(t.name)}" data-act="tog" data-id="${t.id}"></button></td>
      <td><div class="acts"><button class="btn ghost sm" data-act="edit" data-id="${t.id}">แก้ไข</button><button class="btn danger sm" data-act="del" data-id="${t.id}">ลบ</button></div></td></tr>`).join('');
    $('#t-body').onclick=async ev=>{
      const b=ev.target.closest('[data-act]');if(!b)return;
      const ts=getTables(),t=ts.find(x=>x.id===b.dataset.id);if(!t)return;
      if(b.dataset.act==='tog'){t.status=t.status==='active'?'maintenance':'active';setTables(ts);
        toast(t.status==='active'?t.name+' เปิดใช้งานแล้ว':t.name+' ปิดปรับปรุงแล้ว ผู้ใช้จะจองไม่ได้');drawTables()}
      else if(b.dataset.act==='edit'){editId=t.id;tablesPane();window.scrollTo(0,0)}
      else{
        const open=getBookings().filter(x=>x.tableId===t.id&&ACTIVE.includes(x.status)&&dt(x.date,x.end)>new Date());
        if(open.length){toast('ลบไม่ได้: มี '+open.length+' คิวที่ยังไม่สิ้นสุด ให้ยกเลิกคิวก่อน หรือเลือกปิดปรับปรุง',true);return}
        if(await confirmBox('ลบ '+t.name+'?','<p>ประวัติการจองเดิมจะยังคงอยู่ในระบบ</p>','ลบโต๊ะ',true)){setTables(ts.filter(x=>x.id!==t.id));toast('ลบ '+t.name+' แล้ว');if(editId===t.id)editId=null;tablesPane()}
      }
    };
  }

  function policyPane(){
    const p=getPolicy();
    pane.innerHTML=`<form class="card" id="pf" style="max-width:560px" novalidate><h2 style="margin-bottom:14px">เงื่อนไขการจอง</h2>
      <div class="row"><div class="field"><label for="p-open">เวลาเปิดระบบประจำวัน</label><input class="input" type="time" id="p-open" step="1800" value="${p.open}"></div>
      <div class="field"><label for="p-close">เวลาปิดระบบประจำวัน</label><input class="input" type="time" id="p-close" step="1800" value="${p.close}"></div></div>
      <div class="row"><div class="field"><label for="p-max">จองสูงสุดต่อวัน (ชั่วโมง/คน)</label><input class="input" type="number" id="p-max" min="1" max="12" step="0.5" value="${p.maxHours}"></div>
      <div class="field"><label for="p-grace">เช็กอินภายใน (นาที)</label><input class="input" type="number" id="p-grace" min="5" max="60" value="${p.grace}"></div></div>
      <div class="field"><div class="sw-row"><button type="button" class="switch" role="switch" id="p-auto" aria-checked="${p.autoApprove}" aria-labelledby="p-auto-l"></button><label id="p-auto-l">อนุมัติการจองอัตโนมัติ</label></div><span class="hint">ถ้าปิด ทุกการจองจะอยู่สถานะ “รออนุมัติ” จนกว่าผู้ดูแลจะกดอนุมัติ</span></div>
      <div class="err" id="p-err" role="alert"></div><button class="btn" type="submit">บันทึกเงื่อนไข</button>
      <div class="danger-zone"><b>ข้อมูลตัวอย่าง</b><p class="hint" style="margin:4px 0 10px">ล้างข้อมูลทั้งหมดในเบราว์เซอร์นี้ แล้วโหลดข้อมูลตัวอย่างใหม่</p><button class="btn danger sm" type="button" id="p-reset">รีเซ็ตข้อมูลตัวอย่าง</button></div></form>`;
    $('#p-auto').onclick=e=>{const b=e.currentTarget;b.setAttribute('aria-checked',b.getAttribute('aria-checked')!=='true')};
    $('#pf').onsubmit=ev=>{
      ev.preventDefault();const err=m=>{$('#p-err').textContent=m};
      const open=$('#p-open').value,close=$('#p-close').value,mh=parseFloat($('#p-max').value),gr=parseInt($('#p-grace').value,10);
      if(!open||!close)return err('กรุณากรอกเวลาเปิดและปิดระบบ');
      if(toMin(close)<=toMin(open))return err('เวลาปิดต้องอยู่หลังเวลาเปิด');
      if(toMin(close)-toMin(open)<30)return err('ช่วงเวลาเปิดระบบต้องมีอย่างน้อย 30 นาที');
      if(!(mh>=1&&mh<=12))return err('ชั่วโมงสูงสุดต่อวันต้องอยู่ระหว่าง 1–12');
      if(!(gr>=5&&gr<=60))return err('เวลาเช็กอินต้องอยู่ระหว่าง 5–60 นาที');
      store.set(K.policy,{open,close,maxHours:mh,grace:gr,autoApprove:$('#p-auto').getAttribute('aria-checked')==='true'});
      err('');toast('บันทึกเงื่อนไขแล้ว');bs=null;
    };
    $('#p-reset').onclick=async()=>{if(await confirmBox('รีเซ็ตข้อมูลทั้งหมด?','<p>ผู้ใช้ โต๊ะ และการจองที่สร้างเองจะถูกลบ และคุณจะต้องเข้าสู่ระบบใหม่</p>','รีเซ็ตข้อมูล',true)){[K.users,K.tables,K.bookings,K.policy,K.session,K.seeded].forEach(k=>store.del(k));seed();bs=null;toast('รีเซ็ตข้อมูลแล้ว');go('#/login')}};
  }

  function queuePane(){
    pane.innerHTML=`<div class="card"><div class="card-h"><h2>คิวการจองทั้งหมด</h2><span class="muted" id="q-count"></span></div>
     <div class="filters"><input class="input" id="q-text" type="search" placeholder="ค้นหาชื่อผู้ใช้หรือเบอร์โต๊ะ" aria-label="ค้นหา" value="${esc(qf.text)}">
     <select class="input" id="q-status" aria-label="กรองตามสถานะ"><option value="all">ทุกสถานะ</option>${Object.keys(STATUS).map(k=>`<option value="${k}" ${qf.status===k?'selected':''}>${STATUS[k]}</option>`).join('')}</select></div>
     <div class="tbl-wrap q-scroll"><table><thead><tr><th>ผู้จอง</th><th>โต๊ะ</th><th>วันที่</th><th>เวลา</th><th>สถานะ</th><th>การดำเนินการ</th></tr></thead><tbody id="q-body"></tbody></table></div></div>`;
    $('#q-text').oninput=e=>{qf.text=e.target.value;drawQ()};
    $('#q-status').onchange=e=>{qf.status=e.target.value;drawQ()};
    $('#q-body').onclick=async ev=>{
      const b=ev.target.closest('[data-act]');if(!b)return;
      const bk=getBookings().find(x=>x.id===b.dataset.id);if(!bk)return;
      const act=b.dataset.act,desc=`<p>${esc(bk.userName)} · ${esc(bk.tableName)}<br>${fmtDate(bk.date)} ${bk.start}–${bk.end} น.</p>`;
      if(act==='ok'){setStatus(bk.id,'approved');toast('อนุมัติคิวแล้ว')}
      else if(act==='no'){if(!await confirmBox('ปฏิเสธคิวนี้?',desc,'ปฏิเสธคิว',true))return;setStatus(bk.id,'rejected');toast('ปฏิเสธคิวแล้ว')}
      else{if(!await confirmBox('ยกเลิกคิวนี้?',desc+'<p class="hint">โต๊ะจะกลับเป็นว่างทันที</p>','ยกเลิกคิว',true))return;setStatus(bk.id,'cancelled_admin');toast('ยกเลิกคิวแล้ว')}
      drawQ();
    };
    drawQ();refresh=drawQ;
  }
  function drawQ(){
    const body=$('#q-body');if(!body)return;
    const t=qf.text.trim().toLowerCase();
    let list=getBookings().filter(b=>(qf.status==='all'||b.status===qf.status)&&(!t||b.userName.toLowerCase().includes(t)||b.tableName.toLowerCase().includes(t)));
    list.sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start));
    $('#q-count').textContent='พบ '+list.length+' รายการ';
    body.innerHTML=list.slice(0,150).map(b=>`<tr><td>${esc(b.userName)}</td><td>${esc(b.tableName)}</td><td>${fmtDate(b.date)}</td><td>${b.start}–${b.end}</td><td>${chip(b.status)}</td>
      <td><div class="acts">${b.status==='pending'?`<button class="btn sm" data-act="ok" data-id="${b.id}">อนุมัติ</button><button class="btn danger sm" data-act="no" data-id="${b.id}">ปฏิเสธ</button>`:''}${ACTIVE.includes(b.status)?`<button class="btn ghost sm" data-act="cx" data-id="${b.id}">ยกเลิกคิว</button>`:''}${ACTIVE.includes(b.status)?'':'<span class="muted">—</span>'}</div></td></tr>`).join('')||'<tr><td colspan="6" class="muted" style="text-align:center;padding:28px">ไม่พบรายการที่ตรงกับคำค้นหา</td></tr>';
  }
  show();
}

route();
