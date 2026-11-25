// 福音車網站畫面與操作。名冊、搭乘確認和輪班由 Excel 提供，司機可查看聯絡資料和開啟導航。
const icons={
  van:'<path d="M3 17V7a2 2 0 0 1 2-2h10l5 5v7M3 17h2m4 0h6m4 0h2M3 11h17m-6-6v6"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  home:'<path d="M3 10 12 3l9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 21v-7h6v7"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18m-12 5h2m2 0h2"/>',
  shield:'<path d="M12 22s7-3 7-10V5l-7-3-7 3v7c0 7 7 10 7 10z"/><path d="m9 12 2 2 4-4"/>',
  people:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-3-11a4 4 0 0 1 0 8"/><circle cx="9" cy="8" r="4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21v-2a5 5 0 0 1 5-5h6a5 5 0 0 1 5 5v2"/>',
  edit:'<path d="m14 5 5 5m-9 9-5 1 1-5L17 4a2 2 0 0 1 3 3z"/>',
  box:'<path d="M4 4h16v16H4zM8 4v5h8V4M9 15h6"/>',
  arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
  external:'<path d="M13 5h6v6m0-6-9 9m7-1v6H5V7h6"/>',
  clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  pin:'<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/>',
  book:'<path d="M12 7c-2.6-2-5.5-2.6-9-2v13c3.5-.6 6.4 0 9 2 2.6-2 5.5-2.6 9-2V5c-3.5-.6-6.4 0-9 2zM12 7v13"/>',
  phone:'<path d="M6.5 3.5h3l1.3 4-2 1.7a13 13 0 0 0 6 6l1.7-2 4 1.3v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.5 5.7a2 2 0 0 1 2-2.2z"/>',
  info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  close:'<path d="m6 6 12 12M18 6 6 18"/>',
  chevron:'<path d="m6 9 6 6 6-6"/>',
  menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',
  inbox:'<path d="M4 5h16l2 10v4H2v-4zM2 15h6l2 2h4l2-2h6"/>'
};
const icon=name=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const app=document.querySelector('#app');
let data,activeWeek,selectedTrip,toastTimer,loadError,publicWeek,publicSchedule,publicScheduleError,safetyInfo,safetyLoadError,shiftMonth;
let publicWorkspace,guestPickup;
const labels={admin:'管理員',coordinator:'聯絡同工',driver:'司機'};
const statuses={confirmed:['已確認','green'],pending:['待確認','amber'],absent:['請假','gray'],self:['自行前往','gray']};
const siteName='CLC 加樂團契';
const apiOrigin=document.querySelector('meta[name="caleb-api-origin"]')?.content||'';
const adminOrigin=document.querySelector('meta[name="caleb-admin-origin"]')?.content||'';
const onPages=Boolean(apiOrigin);
const staffLogin=adminOrigin?adminOrigin+'/admin-login':'/admin-login';
const readPath=url=>onPages?'/'+(url.searchParams.get('view')||''):url.pathname.replace(/\/$/,'')||'/';
const currentPath=()=>readPath(new URL(location.href));
const pageHref=path=>onPages?(path==='/'?'./':'?view='+encodeURIComponent(path.slice(1))):path;
const signIn=path=>onPages?staffLogin:'/signin-with-chatgpt?return_to='+encodeURIComponent(path);
const week=()=>data?.state.weeks.find(w=>w.date===activeWeek);
const driver=id=>data.state.drivers.find(d=>d.id===id)?.name||'待安排';
const admin=()=>data?.member.role==='admin';
const publicMode=()=>data?.member.role==='public';
const driverMode=()=>data?.member.role==='driver';
const activeDriver=()=>data?.member.driverId;
const trips=()=>week()?.trips.filter(t=>!driverMode()||t.driverId===activeDriver())||[];
const passengers=(trip,leg,schedule=week())=>schedule.rides.filter(r=>r.status==='confirmed'&&r[leg+'Trip']===trip.id)
  .sort((a,b)=>leg==='out'?(a.time||trip.start).localeCompare(b.time||trip.start):0);
const total=(trip,leg)=>passengers(trip,leg).reduce((sum,r)=>sum+r[leg+'Count'],0);
const b=(label,symbol,action,extra='',value='')=>`<button type="button" class="button ${extra}" data-action="${action}" ${action==='menu'?'aria-label="開啟功能選單"':''} data-value="${esc(value)}">${symbol?icon(symbol):''}${esc(label)}</button>`;
const a=(label,symbol,path,extra='')=>`<a class="button ${extra}" data-nav href="${pageHref(path)}">${symbol?icon(symbol):''}${esc(label)}</a>`;
const badge=(label,color='gray')=>`<span class="badge ${color}">${esc(label)}</span>`;
const heading=(title,sub,actions='')=>`<div class="page-head"><div><h1>${title}</h1><p>${sub}</p></div><div class="actions">${actions}</div></div>`;
const empty=message=>`<div class="panel empty">${esc(message)}</div>`;
const toDate=date=>new Intl.DateTimeFormat('zh-TW',{month:'long',day:'numeric',weekday:'long',timeZone:'Asia/Taipei'}).format(new Date(date+'T12:00:00+08:00'));
const dateShort=date=>date.replace(/-/g,' / ');
const brand=()=>`<a class="brand" data-nav href="${pageHref('/')}"><span class="brand-mark">${icon('van')}</span><span><strong>${siteName}</strong><small>福音車事工</small></span></a>`;
function toast(text) {
  const node=document.querySelector('#toast');
  node.textContent=text;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>node.textContent='',4400);
}
async function request(path,options={}) {
  const response=await fetch(apiOrigin+path,{
    method:options.method||'GET',
    headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},
    body:options.body?JSON.stringify(options.body):undefined
  });
  const body=await response.json().catch(()=>({error:'請重新登入後再試。'}));
  if(!response.ok) throw Object.assign(new Error(body.error||'系統暫時無法完成操作。'),{status:response.status});
  return body;
}
async function load() {
  try {
    if(location.hash.startsWith('#team=')) history.replaceState({},'',location.pathname+location.search);
    [data,publicWorkspace]=await Promise.all([
      onPages?null:request('/api/state').catch(error=>{
        if(error.status===401||error.status===403) return null;
        throw error;
      }),
      request('/api/public-workspace')
    ]);
    data??=publicWorkspace;
    loadError=null;
    if(!data) {
      loadError={status:401};
    } else {
      if(!data.state.weeks.some(w=>w.date===activeWeek)) {
        activeWeek=publicMode()||currentPath()==='/'&&publicWorkspace.state.source?publicWorkspace.state.activeDate:
          data.state.source?.latestDate||[...data.state.weeks].sort((a,b)=>b.date.localeCompare(a.date))[0]?.date;
      }
    }
  } catch(error) {
    loadError=error;
    data=null;
  }
  render();
}
const mainNav=[['/rides','本週接送','van'],['/welcome','本週總覽','home'],['/shifts','司機輪班','calendar'],['/safety','駕駛安全','shield']];
const adminNav=[['/roster','長輩名冊','people'],['/drivers','司機名單','van'],['/manage','匯入服事表','box'],['/members','管理人員權限','user'],['/intake','接送與招募申請','inbox']];
const publicNav=[['/about','認識加樂','book'],['/apply','申請接送','van'],['/volunteer','司機報名','user'],['/schedule','每週接送摘要','calendar']];
const pages=[...mainNav,...adminNav,...publicNav];
function nav(items,path) {
  return items.map(([href,name,symbol])=>`<a class="nav-link ${href===path?'active':''}" data-nav href="${pageHref(href)}" ${href===path?'aria-current="page"':''}>${icon(symbol)}${name}</a>`).join('');
}
function selectWeek() {
  if(!data.state.weeks.length) return '';
  return `<select id="week-picker" aria-label="接送日期" class="select-button">${[...data.state.weeks].sort((a,b)=>b.date.localeCompare(a.date)).map(w=>`<option value="${w.date}" ${w.date===activeWeek?'selected':''}>${dateShort(w.date)}</option>`).join('')}</select>`;
}
function shell(path,content) {
  const title=pages.find(row=>row[0]===path)?.[1]||'福音車事工';
  const guest=!data||publicMode();
  const role=data?.member.role;
  const account=data?.member.name||'';
  return `<div class="shell"><aside class="side">${brand()}<nav aria-label="功能選單"><p class="nav-caption">同工專區</p>
    ${nav(mainNav,path)}${admin()?'<p class="nav-caption second">管理後台</p>'+nav(adminNav,path):''}</nav>
    <div class="side-bottom"><a href="${pageHref('/about')}" data-nav>${icon('external')} 團契介紹</a></div></aside>
    <div class="workspace"><header class="topbar"><div class="crumb">
      ${b('','menu','menu','mobile-menu')}<span>福音車事工</span><span>›</span><strong class="crumb-title">${title}</strong></div>
      <div class="top-actions">${a('返回首頁','home','/','primary')}
        ${guest?`<a class="button" href="${esc(staffLogin)}" target="_top">管理者登入</a>`:`<details class="account-details"><summary class="account"><span class="avatar">${esc(account.slice(0,1))}</span><span>${esc(account)} · ${labels[role]}</span></summary>
        <div class="account-menu">
        ${admin()&&data.teamLink?b('同工共用連結','copy','team-link','quiet'):''}
        ${data?.member.loginProvider==='email'?b('登出','user','admin-logout','quiet'):
          `<a href="${esc(data?.logoutUrl||'/signout-with-chatgpt?return_to=%2Fwelcome')}" target="_top" class="button quiet">登出</a>`}</div></details>`}</div>
    </header>${guest?`<nav class="workspace-nav actions" aria-label="福音車功能">${mainNav.map(([href,name,symbol])=>a(name,symbol,href,path===href?'primary':'')).join('')}</nav>`:''}<main${path==='/rides'?' class="rides-main"':''}>${content}</main>
    <footer class="workspace-footer actions">${publicNav.map(([href,name,symbol])=>a(name,symbol,href,path===href?'primary':'quiet')).join('')}</footer></div></div>`;
}
function hero() {
  const w=week();
  return `<section class="hero soft-hero"><div class="hero-copy"><div class="hero-label">${icon('calendar')}${w?toDate(w.date):'加樂團契'}</div>
  <h2>陪長輩平安到教會</h2><p>${w?((w.group===null?'依加樂服事表安排':w.group?'本週有小組':'本週無小組')+(w.returnTime?'　・　預計 '+w.returnTime+' 回程':'')):'查看每週接送與回程安排。'}</p>
  ${a('查看本週接送','arrow','/rides','quiet')}</div></section>`;
}
function tripCard(t) {
  const out=total(t,'out'),back=total(t,'back');
  const full=t.capacity>0&&Math.max(out,back)>=t.capacity;
  const status=t.capacity>0&&Math.max(out,back)>t.capacity?badge('超過座位','amber'):t.driverId?(full?badge('座位已滿','purple'):badge('已安排','green')):badge('待排司機','amber');
  return `<article class="trip-card"><div class="trip-head"><span class="trip-icon">${icon('van')}</span>
    <h3>${esc(t.name)}</h3>${status}</div><div class="trip-meta">
    <span>${icon('user')}${esc(driver(t.driverId))}　·　${esc(t.vehicle)}</span>
    <span>${icon('clock')}${t.start?esc(t.start)+' 首站':'接送時間待確認'}</span></div>
    <div class="trip-foot"><span>去程 <strong>${out}</strong> 位　回程 <strong>${back}</strong> 位</span>
    ${b('查看','arrow','trip','quiet',t.id)}</div></article>`;
}
function dashboard() {
  if(publicMode()) return publicRideOverview();
  const w=week(),list=trips();
  const out=list.reduce((sum,t)=>sum+total(t,'out'),0),back=list.reduce((sum,t)=>sum+total(t,'back'),0);
  const pending=w&&!driverMode()?data.state.people.filter(p=>!p.inactive).filter(p=>{
    const ride=w.rides.find(r=>r.personId===p.id);
    return !ride||ride.status==='pending'||(ride.status==='confirmed'&&!ride.outTrip&&!ride.backTrip);
  }).length:0;
  const missing=list.filter(t=>!t.driverId).length;
  const stat=(name,symbol,n,unit)=>`<div class="stat"><div class="stat-top"><span class="stat-icon">${icon(symbol)}</span>${name}</div><div class="stat-value">${n}<small>${unit}</small></div></div>`;
  return heading(driverMode()?'我的接送總覽':'本週接送總覽',driverMode()?'查看你的班次、乘客和接送地點。':'掌握本週的乘客、趟次與司機安排。',selectWeek())+
    hero()+`<div class="stats">${stat('去程搭乘','people',out,'位')}${stat('回程搭乘','van',back,'位')}${stat('接送趟次','calendar',list.length,'趟')}${stat(driverMode()?'待回報':'待確認／缺班','info',driverMode()?list.filter(t=>t.actualOut===null||t.actualBack===null).length:pending+missing,driverMode()?'趟':'項')}</div>
    <div class="section-head"><div><h2>本週趟次</h2><p class="muted small">按趟次查看去程上車名單</p></div>${a('查看輪班','arrow','/shifts')}</div>
    ${list.length?'<div class="trip-grid">'+list.map(tripCard).join('')+'</div>':empty('這一週還沒有安排趟次。')}
    ${w?.memo?`<div class="panel notice">${icon('info')}<div><h3>本週提醒</h3><p>${esc(w.memo)}</p></div></div>`:''}`;
}
// 手機以原頁啟動系統 App，避開內嵌瀏覽器可能攔截的新視窗。
const touchDevice=()=>matchMedia('(pointer: coarse)').matches||/Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const embedded=()=>window.top!==window.self;
// 以實際上車點為導航目的地。去除樓層資訊，B1 或側門等提示仍保留於畫面。
const navigationAddress=address=>(address||'').trim().replace(/(號)\s*\d+樓(?:[-之]\d+)?(?:室)?$/,'$1');
const maxMapsStops=10;
const maxMapsUrlLength=2048;

function navigationUrl(stops) {
  if(!stops.length||stops.length>maxMapsStops) return '';
  const destination=stops.at(-1);
  const params=new URLSearchParams({api:'1',destination,travelmode:'driving',dir_action:'navigate'});
  if(stops.length>1) params.set('waypoints',stops.slice(0,-1).join('|'));
  const url='https://www.google.com/maps/dir/?'+params.toString();
  return url.length<=maxMapsUrlLength?url:'';
}
function navigationLink(url,label) {
  if(!url) return '';
  return `<a class="button primary navigation-link" href="${esc(url)}"
    target="${touchDevice()?(embedded()?'_top':'_self'):'_blank'}" rel="noreferrer noopener">${icon('pin')}${esc(label)}</a>`;
}

// 優先使用當週上車點，再用名冊上車點或住家地址。
// 店名隨上車地址顯示，門牌仍獨立提供給導航。
function pickupDisplay(p,override='') {
  if(override) return override;
  const address=p.pickup||p.home||'';
  return address&&p.pickupLabel?address+'（'+p.pickupLabel+'）':address;
}

function pickupPoint(p,ride) {
  return {address:pickupDisplay(p,ride?.pickup),nav:navigationAddress(ride?.pickup||p.pickupNav||p.pickup||p.home)};
}
// 使用原生 tel: 連結交給手機撥號，分開顯示手機與市話。
function phoneLink(raw,label) {
  const display=(raw||'').trim();
  const normalized=display.normalize('NFKC').replace(/[\s()\-‐‑–—]/g,'');
  if(!/^\+?\d{3,16}$/.test(normalized)) return '';
  return `<a class="button dial-link" href="tel:${esc(normalized)}" ${touchDevice()&&embedded()?'target="_top"':''}>${icon('phone')}<span>${esc(label)} <strong>${esc(display)}</strong></span></a>`;
}
function phoneLinks(person) {
  const entries=[['撥打手機',person.phone],['撥打市話',person.landline]];
  const seen=new Set();
  return entries.flatMap(([label,field])=>(field||'').split(/[\n/、，,；;]/).map(value=>{
    const key=value.normalize('NFKC').replace(/[^0-9+]/g,'');
    if(seen.has(key)) return '';
    const link=phoneLink(value,label);
    if(link) seen.add(key);
    return link;
  })).join('');
}

// 隨行人員與主乘客同站上車。
function companionLabel(ride) {
  const number=ride?.outCompanions??0;
  const name=ride?.outCompanion?.trim();
  if(!number&&!name) return '';
  return [name||'姓名未填',number?number+' 位':''].filter(Boolean).join(' · ');
}
function pickupCountLabel(list) {
  const all=list.reduce((sum,ride)=>sum+ride.outCount,0);
  const accompanying=list.reduce((sum,ride)=>sum+(ride.outCompanions??0),0);
  return accompanying?`${all-accompanying}+ ${accompanying} 位（共 ${all} 位）`:`${all} 位`;
}

function stopCard(p,r,pickup,time,assignment='') {
  const navigation=navigationLink(navigationUrl(pickup.nav?[pickup.nav]:[]),'Google 導航');
  const accompanying=companionLabel(r);
  const count=r?.outCount;
  const phones=phoneLinks(p);
  return `<div class="stop-card${navigation?' has-navigation':''}">
    <details class="stop-disclosure">
      <summary class="stop-summary">
        <span class="stop-time">${esc(time||'待確認')}</span>
        <span class="stop-identity">
          <strong class="stop-name">${esc(p.name)}</strong>
          ${accompanying?'<span class="stop-companion-badge">有隨行</span>':''}
        </span>
        <span class="stop-chevron">${icon('chevron')}</span>
      </summary>
      <div class="stop-detail"><dl class="contact-details">
    ${accompanying?`<div class="stop-companion-detail"><dt>${icon('people')}隨行人員</dt><dd>${esc(accompanying)}</dd></div>`:''}
    ${assignment}
    <dt>上車點地址</dt><dd>${esc(pickup.address||'Excel 未填')}</dd>
    <dt>住家地址</dt><dd>${esc(p.home||'Excel 未填')}</dd>
    <dt>上車時間</dt><dd>${esc(r?.time||p.pickupTime||'Excel 未填')}</dd>
    ${count>1?'<dt>搭乘人數</dt><dd>共 '+esc(count)+' 位</dd>':''}
    <dt>手機</dt><dd>${esc(p.phone||'Excel 未填')}</dd>
    <dt>市內電話</dt><dd>${esc(p.landline||'Excel 未填')}</dd></dl>
    ${phones?`<div class="actions">${phones}</div>`:''}</div></details>${navigation}</div>`;
}

function pickupList(trip,schedule=week(),people=data.state.people) {
  const rides=passengers(trip,'out',schedule);
  const rows=rides.map(ride=>{
    const rider=people.find(p=>p.id===ride.personId);
    return {ride,rider,pickup:pickupPoint(rider,ride)};
  });
  const addresses=rows.map(({pickup})=>pickup.nav).filter(address=>address&&navigationUrl([address]));
  const missing=rows.length-addresses.length;
  const fullRoute=navigationUrl(addresses);
  return `<section class="panel ride-panel pickup-list">
    <div class="section-head pickup-heading">
      <div class="pickup-title"><h3>去程上車</h3>${badge(pickupCountLabel(rides),'purple')}</div>
      ${navigationLink(fullRoute,'整趟 Google 導航')}
    </div>
    ${missing?`<p class="route-note">有 ${missing} 位乘客的上車點無法用於導航。</p>`:''}
    ${addresses.length&&!fullRoute?'<p class="route-note">此趟無法一次帶入所有上車點，請使用各乘客的導航按鈕。</p>':''}
    ${rows.map(({ride,rider,pickup})=>stopCard(rider,ride,pickup,ride.time||trip.start)).join('')||
    '<p class="muted ride-empty">這一程尚無乘客。</p>'}</section>`;
}
function maskedPickupList(stops) {
  return `<section class="panel ride-panel pickup-list">
    <div class="section-head"><h3>去程上車</h3></div>
    <button type="button" class="pickup-mask" data-action="unlock-rides">
      <span class="pickup-mask-preview" aria-hidden="true">
        ${'<span class="pickup-mask-row"><span></span><span></span><span></span></span>'.repeat(Math.max(1,Math.min(6,stops)))}
      </span>
      <span class="pickup-mask-label">${icon('shield')} 點此查看接送名單</span>
    </button>
  </section>`;
}
function publicRideOverview() {
  const w=week();
  const count=w?.totalPeople??0;
  const status=w?.confirmed?`接送總人數 <strong>${count} 位</strong>`:'搭乘待確認';
  const cards=trips().map(trip=>{
    const counts=w?.tripCounts?.find(item=>item.id===trip.id);
    return `<article class="trip-card"><h3>${esc(trip.name)}</h3>
    <p class="trip-meta">${esc(driver(trip.driverId))}${trip.start?' · '+esc(trip.start):''}
    ${w.confirmed&&counts?`<span>去程 ${counts.out} 位 · 回程參考 ${counts.back} 位</span>`:''}</p></article>`;
  }).join('');
  return heading('本週總覽',w?toDate(w.date)+'｜'+status:'本週尚未匯入接送安排',a('查看本週接送','van','/rides','primary'))+
    (cards?`<div class="trip-grid">${cards}</div>`:empty('本週尚無接送趟次。'));
}

function ridesPage() {
  const w=week(),list=trips();
  if(publicMode()&&(!w||w.date!==data.state.activeDate)) return heading('本週接送','查看本週已確認的接送乘客。')+empty('這一週還沒有接送安排。');
  if(!w) return heading('本週接送','查看與確認乘客搭乘狀況。',selectWeek())+empty('目前沒有接送紀錄。');
  const browserHint=touchDevice()&&(embedded()||/Line\//i.test(navigator.userAgent))
    ?`<div class="panel small">如果導航或撥號被內建瀏覽器攔截，請用 Safari 或 Chrome 開啟。${embedded()?'<a class="button quiet" href="'+pageHref('/rides')+'" target="_top">開啟完整頁面</a>':''}</div>`:'';
  const t=list.find(item=>item.id===selectedTrip)||(!admin()?list[0]:null);
  const tabs=`<div class="ride-tabs" role="group" aria-label="接送趟次">${admin()?`<button type="button" class="button" data-action="all-rides" aria-pressed="${!t}">搭乘確認</button>`:''}${list.map(item=>`<button type="button" class="button" data-action="trip" data-value="${esc(item.id)}" aria-pressed="${t?.id===item.id}">${esc(item.name)}</button>`).join('')}</div>`;
  if(t||!admin()) {
    const trip=t||list[0];
    const pickup=trip&&(publicMode()
      ?guestPickup?.date===w.date
        ?pickupList(trip,guestPickup,guestPickup.people)
        :maskedPickupList(w.tripCounts?.find(item=>item.id===trip.id)?.stops??0)
      :pickupList(trip));
    return heading('本週接送',toDate(w.date),publicMode()?'':selectWeek())+
      browserHint+tabs+(trip?`<div class="ride-trip-head">
        <h2>${esc(trip.name)}</h2>
        <div class="ride-driver-row"><span class="ride-driver-highlight">${icon('user')}司機 <strong>${esc(driver(trip.driverId))}</strong></span><span>${esc(trip.vehicle)}</span></div>
      </div>${pickup}`:
      empty('這一週沒有分配給你的趟次。'));
  }
  const confirmed=w.rides.filter(r=>r.status==='confirmed'&&(r.outTrip||r.backTrip)).length;
  return heading('本週接送',toDate(w.date),selectWeek())+browserHint+tabs+
    `<div class="section-head"><div><h2>搭乘確認</h2><p class="muted small">已確認並安排 ${confirmed} 位長輩</p></div></div>
    <section class="panel ride-panel ride-roster" aria-label="搭乘確認名單">
      ${data.state.people.filter(p=>!p.inactive).map(p=>{
        const r=w.rides.find(x=>x.personId===p.id);
        const [label,color]=statuses[r?.status||'pending'];
        const tripName=id=>w.trips.find(x=>x.id===id)?.name||'—';
        const tripDetail=leg=>esc(tripName(r?.[leg+'Trip']))+(r?.[leg+'Trip']?' · '+esc(r[leg+'Count'])+' 位':'');
        return stopCard(p,r,pickupPoint(p,r),r?.time||w.trips.find(t=>t.id===r?.outTrip)?.start||p.pickupTime,
          `<dt>狀態</dt><dd>${badge(label,color)}</dd><dt>去程</dt><dd>${tripDetail('out')}</dd>
          <dt>回程參考</dt><dd>${tripDetail('back')}</dd>`);
      }).join('')||'<p class="muted ride-empty">目前沒有乘客。</p>'}</section>`;
}
const taipeiToday=()=>{
  const parts=new Intl.DateTimeFormat('en',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
  return ['year','month','day'].map(type=>parts.find(part=>part.type===type).value).join('-');
};
const shiftDate=(year,month,day=1)=>new Date(Date.UTC(year,month,day));
const dateKey=date=>date.toISOString().slice(0,10);

// 選定司機才啟用連結。按鈕本身標明訂閱對象，連結只包含該司機的班表。
function chooseCalendar() {
  const calendars=(data.calendars||[]).filter(item=>!driverMode()||item.id===activeDriver());
  if(!calendars.length) {toast('目前沒有可加入的司機班表。');return;}
  showDialog('加入我的 Google 行事曆',`<label class="wide">請選擇你的姓名
    <select id="calendar-driver"><option value="">選擇司機</option>${calendars.map(item=>option(item.id,item.name,'')).join('')}</select></label>
    <div class="wide actions"><a id="calendar-confirm" class="button primary" target="${embedded()?'_top':touchDevice()?'_self':'_blank'}" rel="noopener noreferrer" hidden></a>
    <button id="calendar-copy" class="button" type="button" hidden>複製訂閱網址</button></div>`);
  const select=document.querySelector('#calendar-driver');
  const confirm=document.querySelector('#calendar-confirm');
  const copy=document.querySelector('#calendar-copy');
  const selected=()=>calendars.find(item=>item.id===select.value);
  select.addEventListener('change',()=>{
    const item=selected();
    confirm.hidden=copy.hidden=!item;
    if(item) {
      confirm.href=apiOrigin+item.path+'/google';
      confirm.textContent='加入'+item.name+'的班表';
    } else {
      confirm.removeAttribute('href');
    }
  });
  copy.addEventListener('click',async()=>{
    const item=selected();
    if(!item) return;
    const url=new URL(item.path+'.ics',apiOrigin||location.origin).href;
    try {await navigator.clipboard.writeText(url);toast('訂閱網址已複製。');}
    catch {showDialog('訂閱網址',`<input class="wide" aria-label="訂閱網址" readonly value="${esc(url)}">`);}
  });
}

// 依 Excel 的日期和分派建立月曆，未填時間的班次仍列出日期。
function shifts() {
  const today=taipeiToday();
  if(!shiftMonth){
    const upcoming=driverMode()?data.state.weeks.filter(w=>w.date>=today&&w.trips.some(t=>t.driverId===activeDriver()))
      .map(w=>w.date).sort()[0]:null;
    shiftMonth=(upcoming||today).slice(0,7);
  }
  const [year,month]=shiftMonth.split('-').map(Number);
  const first=shiftDate(year,month-1);
  const days=shiftDate(year,month,0).getUTCDate();
  const firstDay=first.getUTCDay();
  const names=new Map(data.state.drivers.filter(d=>!d.inactive).map(d=>[d.id,d.name]));
  const dates=new Map(data.state.weeks.filter(w=>w.date.startsWith(shiftMonth+'-')).map(w=>[w.date,w.trips.filter(t=>names.has(t.driverId)&&(!driverMode()||t.driverId===activeDriver()))]));
  const grid=Array.from({length:Math.ceil((firstDay+days)/7)*7},(_,i)=>{
    const day=i-firstDay+1;
    const date=dateKey(shiftDate(year,month-1,day));
    const inside=day>=1&&day<=days;
    const list=inside?(dates.get(date)||[]):[];
    return `<div class="shift-day ${inside?'':'outside'} ${date===today?'shift-today':''}">
      <span class="shift-day-number">${Number(date.slice(-2))}</span>
      ${list.map(t=>`<a class="shift-event" href="#shift-${date}" title="${esc(t.name+'｜'+names.get(t.driverId))}">${esc(names.get(t.driverId))}<span>${esc(t.name)}</span></a>`).join('')}
    </div>`;
  }).join('');
  const agenda=[...dates.entries()].sort(([a],[b])=>a.localeCompare(b)).filter(([,list])=>list.length).map(([date,list])=>
    `<section class="panel shift-agenda" id="shift-${date}"><h3>${toDate(date)}</h3>
    ${list.map(t=>`<div class="shift-agenda-row"><strong>${esc(t.name)}</strong><span>${esc(names.get(t.driverId))}</span><span class="muted">${esc(t.start||'時間待確認')}</span>
    ${!publicMode()||date===data.state.activeDate?b('看接送','arrow','calendar-trip','quiet',date+'|'+t.id):''}</div>`).join('')}</section>`).join('');
  const driverName=driverMode()?names.get(activeDriver())||data.member.name:'';
  return heading(driverMode()?'我的輪班':'司機輪班',driverMode()?esc(driverName)+'｜個人接送班表':'依 Excel 顯示現行司機的接送班次。')+
    `<section class="panel shift-calendar"><div class="section-head shift-toolbar"><h2 aria-live="polite">${year} 年 ${month} 月</h2>
    <div class="actions shift-calendar-actions">${b('加入我的 Google 行事曆','calendar','choose-calendar','primary')}${b('‹ 上個月',null,'calendar-month','',-1)}${b('本月',null,'calendar-month','',0)}${b('下個月 ›',null,'calendar-month','',1)}</div></div>
    <div class="shift-grid">${[...'日一二三四五六'].map(d=>'<div class="shift-weekday">'+d+'</div>').join('')}${grid}</div></section>`+
    (agenda||empty('這個月沒有匯入的輪班。'))+
    '<p class="small muted">首次訂閱請在電腦網頁版確認。若 Google 未帶入班表，可在選好姓名後複製訂閱網址。</p>';
}
// 司機頁顯示新版教會用車文件和快速聯絡方式，原檔只供同工開啟。
function safety() {
  const guide=safetyInfo;
  if(!guide) return heading('駕駛安全','教會福音車管理及使用辦法')+
    empty(safetyLoadError?'暫時無法讀取駕駛安全文件。':'正在讀取駕駛安全文件…');
  const pdf=guide.contacts?`<a class="button" href="/api/safety-guide.pdf" target="_blank" rel="noopener">${icon('book')} 開啟訓練原檔（PDF）</a>`:'';
  return heading('駕駛安全','教會福音車管理及使用辦法｜'+esc(guide.date)+'更新',pdf)+
    (guide.contacts?`<div class="panel notice">${icon('info')}<div><h3>用車窗口</h3><p>教會統編 ${esc(guide.taxId)}</p>
    <div class="actions safety-contacts">${guide.contacts.map(c=>phoneLink(c.phone,c.name)).join('')}</div></div></div>`:'')+
    `<div class="panel safety-guide">${guide.sections.map((section,index)=>`<details ${index===0?'open':''}><summary>${esc(section.title)}</summary>
    <ul>${section.lines.map(line=>'<li>'+esc(line)+'</li>').join('')}</ul></details>`).join('')}</div>`;
}
function roster() {
  return heading('長輩名冊','名冊依《加樂服事表》的「長輩接送」工作表顯示。',a('更新 Excel','box','/manage','primary'))+
  `<div class="table-wrap"><table><thead><tr><th scope="col">編號</th><th>長輩</th><th>狀態</th><th>參考搭車時間</th><th>上車時間</th><th>上車點</th><th>住家地址</th><th>電話</th><th>接送資訊</th></tr></thead><tbody>
  ${[...data.state.people].sort((a,b)=>Number(Boolean(a.inactive))-Number(Boolean(b.inactive))).map((p,index)=>`<tr class="${p.inactive?'inactive-rider':''}"><td class="roster-number">${p.inactive?'':index+1}</td><td><strong>${esc(p.name)}</strong></td>
  <td>${p.inactive?badge('暫停搭車'):badge('每週確認','green')}</td>
  <td>${esc(p.referenceTime||'—')}</td><td>${esc(p.pickupTime||'—')}</td><td>${esc(pickupDisplay(p)||'—')}</td><td>${esc(p.home||'—')}</td>
  <td>${esc([p.phone,p.landline].filter(Boolean).join(' / ')||'—')}</td><td>${b('查看','user','stop','',p.id+'|out')}</td></tr>`).join('')}</tbody></table></div>`;
}
// 管理員可依 Excel 查看現行與灰底暫停服事的司機資料，保留原始列序。
function driverRoster() {
  const drivers=[...data.state.drivers].sort((a,b)=>Number(Boolean(a.inactive))-Number(Boolean(b.inactive)));
  const current=drivers.filter(d=>!d.inactive).length;
  return heading('司機名單','依 Excel 顯示，現行 '+current+' 位，暫停服事 '+(drivers.length-current)+' 位。',a('更新 Excel','box','/manage','primary'))+
    `<div class="table-wrap"><table><thead><tr><th>司機</th><th>狀態</th><th>小組</th><th>電話</th><th>車牌</th><th>車款／型號</th><th>電子郵件</th><th>備註</th></tr></thead><tbody>
    ${drivers.map(d=>`<tr class="${d.inactive?'inactive-rider':''}"><td><strong>${esc(d.name)}</strong></td>
    <td>${d.inactive?badge(d.status||'暫停服事'):badge('現行司機','green')}</td>
    <td>${esc(d.group||'—')}</td><td>${phoneLink(d.phone,'撥打')||esc(d.phone||'—')}</td>
    <td>${esc(d.plates||'—')}</td><td>${esc(d.model||'—')}</td><td>${esc(d.email||'—')}</td><td>${esc(d.note||'—')}</td></tr>`).join('')}</tbody></table></div>`;
}
function manage() {
  const source=data.state.source;
  return heading('匯入服事表','儲存 Google 雲端服事表連結，更新檔案後按「從雲端更新」。')+
    `<section class="panel"><div class="section-head"><div><h2>目前使用的服事表</h2>
      <p class="muted">${source?esc(source.fileName):'尚未匯入'}</p></div>${badge(source?'已同步':'待匯入',source?'green':'amber')}</div>
      ${source?`<p>最新搭乘確認日期　${esc(source.latestDate||'尚未確認')}</p>
        <p class="muted small">上次同步　${esc(new Intl.DateTimeFormat('zh-TW',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Taipei'}).format(new Date(source.importedAt)))}</p>`:''}
    </section>
    <section class="panel"><h2>Google 雲端服事表</h2>
      <p class="muted excel-help">請貼上最新加樂服事表雲端連結</p>
      <form id="excel-sync"><label>Google 雲端檔案連結<input required name="url" type="url" maxlength="2000" placeholder="貼上 Google 雲端檔案連結" value="${esc(source?.cloudUrl||'')}"></label>
      <p id="excel-status" class="form-error" role="status"></p>
      <div class="form-foot"><button type="submit" class="button primary">${icon('box')}${source?.cloudUrl?'從雲端更新':'儲存連結並更新'}</button></div></form>
    </section>`;
}

async function syncWorkbook(form) {
  const status=form.querySelector('#excel-status');
  const submit=form.querySelector('button[type="submit"]');
  status.textContent='正在讀取雲端服事表…';
  submit.disabled=true;
  try {
    const result=await request('/api/excel-link',{method:'POST',body:{url:form.elements.url.value.trim()}});
    activeWeek=result.latestDate||undefined;
    selectedTrip=null;
    await load();
    toast('已從雲端更新 '+result.weeks+' 週的資料。');
  } catch(error) {status.textContent=error.message;}
  finally {submit.disabled=false;}
}
let membersCache=null,intakeCache=null;
function members() {
  return heading('管理人員權限','管理員可使用此處登記的 Gmail 登入後台。',b('新增帳號','plus','member','primary'))+
    (membersCache?`<div class="table-wrap"><table><thead><tr><th>姓名</th><th>登入電郵</th><th>角色</th><th>綁定司機</th><th>操作</th></tr></thead><tbody>
    ${membersCache.members.map(m=>`<tr><td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${badge(labels[m.role],'purple')}</td><td>${m.driver_id?esc(driver(m.driver_id)):'—'}</td>
    <td>${b('編輯','edit','member','',m.email)}${m.email!==membersCache.self?b('移除',null,'remove-member','danger',m.email):''}</td></tr>`).join('')}</tbody></table></div>`:empty('正在讀取同工帳號…'))+
    '<div class="panel"><h3>網站角色</h3><p>管理員可維護名冊、班次、申請與權限。聯絡同工可更新每週搭乘。司機只可查閱及回報自己負責的趟次。</p></div>';
}
function intake() {
  return heading('接送與招募申請','查看從團契對外頁面送出的申請。')+
    (intakeCache?`<div class="panel">${intakeCache.items.map(m=>`<div class="list-row"><span class="avatar">${esc(m.name.slice(0,1))}</span>
      <div><strong>${esc(m.name)} · ${m.kind==='ride'?'接送申請':'司機報名'}</strong><p>${esc(m.phone)}　${esc(m.note)}</p>
      <p class="muted small">${esc(m.created_at.slice(0,10))}</p></div>${badge(m.status==='done'?'已處理':'待處理',m.status==='done'?'green':'amber')}
      ${b(m.status==='done'?'重開':'標為完成',null,'intake-status','',m.id)}</div>`).join('')||'<p class="muted">目前沒有申請。</p>'}</div>`:empty('正在讀取申請…'));
}
// 團契介紹、申請和接送摘要共用本週總覽的版面。
function publicContent(path) {
  if(path==='/about') return `<div class="caleb-story">
      <header class="story-heading"><h1>認識加樂</h1><p>我們是為主預備道路，陪長輩回家的幸福運將。</p></header>
      <figure class="verse-card" aria-labelledby="verse-heading">
        <h2 id="verse-heading">以賽亞書 46:4</h2>
        <blockquote>
          <p>「即使你們年老髮白的時候，<br>我仍然一如既往地扶持你們。<br>我造了你們，必照顧你們，<br>扶持你們，拯救你們。」</p>
          <p lang="en">I will be your God throughout your lifetime<br>— until your hair is white with age.<br>I made you, and I will care for you.<br>I will carry you along and save you.</p>
        </blockquote>
      </figure>
      <section class="story-video" aria-labelledby="caleb-video-title">
        <h2 id="caleb-video-title">加樂接送影片</h2>
        <div class="story-player"><video src="${onPages?'./':'/'}caleb-intro.mp4?v=audio2" controls playsinline preload="metadata" aria-labelledby="caleb-video-title"></video></div>
      </section>
    </div>`;
  if(path==='/schedule'){
    const weeks=publicSchedule?.weeks||[];
    const selected=weeks.find(w=>w.date===publicWeek);
    const picker=weeks.length?`<select class="select-button" id="public-week-picker" aria-label="接送日期">${[...weeks].reverse().map(w=>option(w.date,dateShort(w.date),publicWeek)).join('')}</select>`:'';
    const trips=selected?.trips.map(t=>`<article class="trip-card"><h3>${esc(t.name)}</h3>
      <p class="trip-meta">${selected.confirmed?`去程 ${t.out} 位　回程參考 ${t.back} 位`:'搭乘待確認'}</p></article>`).join('');
    const summary=selected
      ?`接送總人數 ${selected.confirmed?'<strong>'+selected.totalPeople+' 位</strong>':'待確認'}`
      :'查看各週的接送趟次與人數。';
    return heading('每週接送摘要',summary,picker)+
      (trips?`<div class="trip-grid">${trips}</div>`:empty(publicScheduleError?'暫時無法讀取接送摘要。':publicSchedule?'這一週尚無接送趟次。':'正在讀取接送摘要…'));
  }
  const ride=path==='/apply';
  return heading(ride?'長輩接送申請':'司機報名',ride?'留下聯絡資訊，同工會與你確認搭乘需求及可安排的車趟。':'留下聯絡資訊，同工會與你確認可服事的時段及駕駛安全講習。')+
    `<section class="panel">${b('填寫表單','arrow','apply','primary',ride?'ride':'driver')}</section>`;
}
async function loadPublicSchedule() {
  if(publicSchedule) return;
  try {
    publicSchedule=await request('/api/public-schedule');
    publicWeek=publicSchedule.latestDate||publicSchedule.weeks.at(-1)?.date;
  } catch {
    publicScheduleError=true;
  }
  if(showPublicSchedule(currentPath())) render();
}
const showPublicSchedule=path=>path==='/schedule';
const isPickupPath=path=>path==='/'||path==='/rides';
function render() {
  const path=currentPath();
  if(!isPickupPath(path)||!publicMode()) guestPickup=null;
  if(publicNav.some(([href])=>href===path)) {
    app.innerHTML=shell(path,publicContent(path));
    return;
  }
  if(!data) {
    const message=loadError?.message||'登入後即可查看你的接送安排。';
    const needsAuth=!loadError||loadError.status===401;
    app.innerHTML=`<div class="public-shell"><header class="public-nav">${brand()}${a('團契首頁','home','/welcome')}</header>
      <main><section class="panel sign-in"><h1>福音車同工專區</h1><p>${esc(message)}</p>
      ${needsAuth&&!onPages?`<a class="button primary" href="${signIn(path)}" target="_top">登入同工專區</a>`:b('重新載入',null,'reload','primary')}</section></main></div>`;
    return;
  }
  const screens={'/':ridesPage,'/welcome':dashboard,'/rides':ridesPage,'/shifts':shifts,'/safety':safety,'/roster':roster,'/drivers':driverRoster,'/manage':manage,'/members':members,'/intake':intake};
  const protectedPage=adminNav.some(row=>row[0]===path);
  if(protectedPage&&!admin()) {
    app.innerHTML=shell(path,heading('管理後台','請使用管理者帳號登入。')+
      `<a class="button primary" href="${esc(staffLogin)}" target="_top">登入後台</a>`);
    return;
  }
  app.innerHTML=shell(path==='/'?'/rides':path,screens[path]?.()||empty('找不到此頁面。'));
}

async function refreshExtra(path=currentPath()) {
  if(!data||(path!=='/safety'&&!admin())) return;
  try {
    if(path==='/safety') {
      if(safetyInfo) return;
      safetyInfo=await request(publicMode()?'/api/public-safety-guide':'/api/safety-guide');
      safetyLoadError=false;
    }
    else if(path==='/members') membersCache=await request('/api/members');
    else if(path==='/intake') intakeCache=await request('/api/intake');
    else return;
    if(currentPath()===path&&!document.querySelector('dialog[open]')) render();
  } catch(error) {
    if(path==='/safety') {safetyLoadError=true;if(currentPath()===path) render();}
    toast(error.message);
  }
}
function navigate(path) {
  if(data&&((publicMode()&&path==='/rides')||(path==='/'&&publicWorkspace.state.source))&&activeWeek!==publicWorkspace.state.activeDate) {
    activeWeek=publicWorkspace.state.activeDate;
    selectedTrip=null;
  }
  if(currentPath()!==path) history.pushState({},'',pageHref(path));
  render();
  refreshExtra(path);
  if(showPublicSchedule(path)) loadPublicSchedule();
  window.scrollTo(0,0);
}
function showDialog(title,body,submit,label='儲存') {
  document.querySelector('dialog')?.remove();
  const dialog=document.createElement('dialog');
  dialog.innerHTML=`<div class="dialog-inner"><div class="dialog-head"><h2 id="dialog-title">${esc(title)}</h2>
    <button class="button quiet" type="button" data-close aria-label="關閉">${icon('close')}</button></div>
    <form><div class="form-grid">${body}</div><p class="form-error" role="alert"></p>
    <div class="form-foot"><button type="button" class="button" data-close>${submit?'取消':'關閉'}</button>
    ${submit?`<button type="submit" class="button primary">${esc(label)}</button>`:''}</div></form></div>`;
  dialog.setAttribute('aria-labelledby','dialog-title');
  document.body.append(dialog);
  dialog.querySelectorAll('[data-close]').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('close',()=>dialog.remove());
  dialog.querySelector('form').addEventListener('submit',async event=>{
    event.preventDefault();
    if(!submit) return;
    const button=dialog.querySelector('[type=submit]');
    const error=dialog.querySelector('.form-error');
    error.textContent='';
    button.disabled=true;
    try {
      const result=await submit(Object.fromEntries(new FormData(event.target)));
      dialog.close();
      toast(result||'已儲存');
    } catch(problem) {
      error.textContent=problem.message;
    } finally {button.disabled=false;}
  });
  dialog.showModal();
}
function unlockRides() {
  const currentData=data;
  showDialog('請輸入司機手機號碼',
    '<label class="wide">手機號碼<input name="phone" type="tel" inputmode="tel" placeholder="請輸入司機手機號碼" maxlength="40" autocomplete="off" required autofocus></label>',
    async fields=>{
      const dialog=document.querySelector('dialog[open]');
      const result=await request('/api/team-state',{method:'POST',body:{phone:fields.phone}});
      if(!isPickupPath(currentPath())||data!==currentData||!dialog?.open||!dialog.isConnected) return;
      if(result.date!==activeWeek) throw new Error('本週接送日期已更新，請重新整理後再試。');
      guestPickup=result;
      render();
      return '已開啟接送名單';
    },'確認');
}
const input=(label,name,value='',options={})=>{
  const {type='text',wide=false,required=false,max=180,min='',upper=''}=options;
  return `<label class="${wide?'wide':''}">${esc(label)}<input name="${name}" type="${type}" value="${esc(value)}" maxlength="${max}" ${min!==''?'min="'+min+'"':''} ${upper!==''?'max="'+upper+'"':''} ${required?'required':''}></label>`;
};
const area=(label,name,value='',max=240)=>`<label class="wide">${esc(label)}<textarea name="${name}" rows="3" maxlength="${max}">${esc(value)}</textarea></label>`;
const option=(id,name,selected)=>`<option value="${esc(id)}" ${selected===id?'selected':''}>${esc(name)}</option>`;
const select=(label,name,options,value='')=>`<label>${esc(label)}<select name="${name}">${options.map(([id,text])=>option(id,text,value)).join('')}</select></label>`;
function editActual(id) {
  const t=trips().find(item=>item.id===id);
  showDialog('回報實際搭乘｜'+t.name,
    input('去程實際人數','actualOut',t.actualOut??'',{type:'number',min:0,upper:100})+
    input('回程實際人數','actualBack',t.actualBack??'',{type:'number',min:0,upper:100})+
    `<p class="wide muted small">原安排去程 ${total(t,'out')} 位、回程 ${total(t,'back')} 位。</p>`,
    async fields=>{
      const number=key=>fields[key]===''?null:Number(fields[key]);
      await request('/api/actual',{method:'PUT',body:{revision:data.revision,date:activeWeek,trip:id,actualOut:number('actualOut'),actualBack:number('actualBack')}});
      await load();
    });
}
function editMember(email) {
  const m=membersCache?.members.find(item=>item.email===email);
  showDialog(m?'編輯同工帳號':'新增同工帳號',
    input('顯示姓名','name',m?.name,{required:true,max:60})+
    (m?`<label>登入電郵<input type="email" name="email" value="${esc(m.email)}" readonly></label>`:input('登入電郵','email','',{type:'email',required:true,max:160}))+
    select('網站角色','role',Object.entries(labels),m?.role||'coordinator')+
    select('綁定司機（僅司機角色）','driver_id',[['','未綁定'],...data.state.drivers.map(d=>[d.id,d.name])],m?.driver_id),
    async fields=>{
      await request('/api/members',{method:'PUT',body:fields});
      membersCache=await request('/api/members');
      await load();
    });
}
function removeMember(email) {
  showDialog('移除同工帳號',`<p class="wide">移除 ${esc(email)} 的網站使用權限？</p>`,async ()=>{
    await request('/api/members',{method:'DELETE',body:{email}});
    membersCache=await request('/api/members');
    render();
  },'移除');
}
function openApply(kind) {
  showDialog(kind==='ride'?'長輩接送申請':'福音車司機報名',
    input('姓名','name','',{required:true,max:60})+input('聯絡電話','phone','',{type:'tel',required:true,max:60})+
    area(kind==='ride'?'希望接送的區域或其他需求':'可服事時段或其他備註','note','',400)+
    '<div class="trap" aria-hidden="true"><label>網站<input name="website" tabindex="-1" autocomplete="off"></label></div>'+
    '<p class="wide muted small">送出後，由加樂團契同工使用聯絡資料與你確認安排。</p>',
    async fields=>{await request('/api/intake',{method:'POST',body:{...fields,kind}});return '已送出，同工會與你聯絡。';},'送出申請');
}
const actions={
  menu:()=>document.querySelector('.side').classList.toggle('open'),
  reload:load,
  trip:id=>{selectedTrip=id;navigate('/rides');},
  'all-rides':()=>{selectedTrip=null;navigate('/rides');},
  'calendar-month':value=>{
    const step=Number(value);
    const [year,month]=shiftMonth.split('-').map(Number);
    shiftMonth=step?dateKey(shiftDate(year,month-1+step)).slice(0,7):taipeiToday().slice(0,7);
    render();
  },
  'calendar-trip':value=>{
    [activeWeek,selectedTrip]=value.split('|');
    navigate('/rides');
  },
  'choose-calendar':chooseCalendar,
  'unlock-rides':unlockRides,
  'team-link':()=>showDialog('同工共用連結',`<p class="wide">開啟連結即可查看本週接送名單。</p>
    <input class="wide" aria-label="同工共用連結" readonly value="${esc(data.teamLink)}">`,
    async()=>{await navigator.clipboard.writeText(data.teamLink);return '同工共用連結已複製。';},'複製連結'),
  actual:editActual,member:editMember,'remove-member':removeMember,apply:openApply,
  'admin-logout':async()=>{
    const {url}=await request('/api/admin-logout',{method:'POST',body:{}});
    location.assign(url);
  },
  'intake-status':async id=>{
    const item=intakeCache.items.find(row=>row.id===id);
    await request('/api/intake',{method:'PATCH',body:{id,status:item.status==='done'?'new':'done'}});
    await refreshExtra('/intake');
    toast('已更新申請狀態');
  }
};
app.addEventListener('click',async event=>{
  const link=event.target.closest('a[data-nav]');
  if(link&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey&&event.button===0) {
    event.preventDefault();
    const path=readPath(new URL(link.href));
    if(isPickupPath(path)) selectedTrip=null;
    navigate(path);
    return;
  }
  const button=event.target.closest('button[data-action]');
  if(!button) return;
  try {await actions[button.dataset.action]?.(button.dataset.value);} catch(error) {toast(error.message);}
});
app.addEventListener('submit',event=>{
  if(event.target.id!=='excel-sync') return;
  event.preventDefault();
  syncWorkbook(event.target);
});
app.addEventListener('change',event=>{
  if(event.target.id==='public-week-picker') {publicWeek=event.target.value;render();return;}
  if(event.target.id==='week-picker') {
    activeWeek=event.target.value;
    selectedTrip=null;
    render();
  }
});
window.addEventListener('popstate',()=>{render();refreshExtra();if(showPublicSchedule(currentPath())) loadPublicSchedule();});
if(publicNav.some(([href])=>href===currentPath())) render();
if(showPublicSchedule(currentPath())) loadPublicSchedule();
load().then(()=>refreshExtra());
