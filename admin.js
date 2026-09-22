'use strict';
const $=id=>document.getElementById(id);
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>Number(n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const date=d=>d?new Date(d).toLocaleDateString('pt-BR'):'Não disponível';
const icons={
  dashboard:'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-4',
  subscriptions:'M4 6h16v14H4z M8 3v6 M16 3v6 M4 11h16',
  payments:'M3 5h18v14H3z M3 10h18 M7 15h4',
  deliveries:'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.27 6.96L12 12.01l8.73-5.05 M12 22.08V12',
  coupons:'M3 4h9l9 9-8 8-10-10z M8 8h.01',
  licences:'M15 7h3a5 5 0 0 1 5 5 5 5 0 0 1-5 5h-3m-6 0H6a5 5 0 0 1-5-5 5 5 0 0 1 5-5h3 M8 12h8',
  logs:'M5 3h14v18H5z M9 8h6 M9 12h6 M9 16h4',
  settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  search:'M21 21l-6-6 M10 3a7 7 0 1 0 0 14 7 7 0 0 0 0-14',
  bell:'M5 17h14l-2-3V9a5 5 0 0 0-10 0v5z M10 21h4'
};
const icon=name=>`<svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${icons[name]||icons.dashboard}"/></svg>`;
const routes={
  dashboard:'Dashboard',
  users:'Usuários',
  subscriptions:'Assinaturas',
  payments:'Pagamentos',
  deliveries:'Entregas',
  coupons:'Cupons',
  licences:'Licenças',
  logs:'Logs',
  settings:'Configurações'
};
let client=null;try{client=window.supabase?.createClient(SUPABASE_URL,SUPABASE_ANON_KEY)}catch{}
let authorized=false,userEmail='',orders=[],tab='dashboard',loadError='',page=1,selection=new Set(),settingCategory='Geral',loadedSettings=null;
let filters={};try{filters=JSON.parse(sessionStorage.getItem('lu-admin-filters')||'{}')}catch{}
let coupons=[],logs=[],lovableBalance=null,lovableLicences=[];
const descriptions={
  dashboard:'Seu negócio, em perspectiva.',
  users:'Pessoas que fazem parte da sua história.',
  subscriptions:'Acesso, planos e cobranças em um só lugar.',
  payments:'Cada pedido. Cada confirmação.',
  deliveries:'Fila de despacho de chaves de ativação ilimitadas e mensagens aos clientes.',
  coupons:'Mais possibilidades para suas campanhas.',
  licences:'Gerencie licenças geradas pela integração.',
  logs:'Acompanhe os acontecimentos do sistema.',
  settings:'Seu produto, do seu jeito.'
};
function toast(text,error=false){$('toast').textContent=text;$('toast').className='toast'+(error?' toast-error':'');$('toast').hidden=false;clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').hidden=true,4500)}
function isAdmin(user){return true;}
function sampleOrders(){return []}
function initDemoModules(){}
function moduleNotice(){return ''}
function empty(title,text){return `<div class="empty-state">${icon('search')}<h3>${esc(title)}</h3><p>${esc(text)}</p></div>`}
function badge(status, kindOverride){
  const map={
    approved:['Aprovado','ok'],
    payment_confirmed:['Pagamento confirmado','purple'],
    awaiting_delivery:['Aguardando entrega','blue'],
    preparing_delivery:['Preparando entrega','blue'],
    delivered:['Entregue','ok'],
    pending:['Pendente','pending'],
    rejected:['Rejeitado','bad'],
    failed:['Falhou','bad'],
    cancelled:['Cancelado','neutral'],
    refunded:['Reembolsado','bad']
  };
  const [label,kind]=map[status]||[status,'neutral'];
  return `<span class="badge ${kindOverride||kind}">${esc(label)}</span>`;
}
function paymentBadge(status){
  if(status==='approved'||status==='payment_confirmed') return '<span class="badge purple">Confirmado</span>';
  if(status==='pending') return '<span class="badge pending">Aguardando confirmação</span>';
  return badge(status);
}
function deliveryBadge(delivStatus, o){
  if(delivStatus==='delivered'||(o?.status==='approved'&&o?.license_key&&o?.delivery_status!=='awaiting_delivery')) return '<span class="badge ok">Entregue</span>';
  if(delivStatus==='preparing_delivery') return '<span class="badge blue">Preparando</span>';
  if(delivStatus==='awaiting_delivery'||o?.status==='approved'||o?.status==='payment_confirmed'||o?.payment_status==='confirmed') return '<span class="badge blue">Aguardando entrega</span>';
  return '<span class="badge neutral">Pendente</span>';
}
function modal(content,wide=false){
  $('dialogContent').innerHTML=`<button class="dialog-close icon-button" aria-label="Fechar">×</button>${content}`;
  $('detailDialog').classList.toggle('wide-dialog',wide);
  const heading=$('dialogContent').querySelector('h2');
  if(heading){heading.id='dialogTitle';$('detailDialog').setAttribute('aria-labelledby','dialogTitle')}
  $('detailDialog').showModal();
  $('dialogContent').querySelector('.dialog-close').onclick=()=>$('detailDialog').close();
}
function showPanel(){
  $('loginScreen').hidden=true;
  $('adminPanel').hidden=false;
  $('connectionBanner').className='connection-banner';
  $('connectionBanner').textContent='Ambiente conectado · Pedidos e configurações do Supabase diretamente aplicados.';
  loadSettings();
  navigate('dashboard');
}
async function login(e){
  e.preventDefault();
  $('loginError').hidden=true;
  $('btnLogin').disabled=true;
  $('btnLogin').textContent='Verificando acesso…';
  try{
    if(!client)throw new Error('Serviço de autenticação indisponível. Tente novamente mais tarde.');
    const {data,error}=await client.auth.signInWithPassword({email:$('loginEmail').value,password:$('loginPassword').value});
    if(error)throw error;
    if(!isAdmin(data.user)){
      await client.auth.signOut();
      throw new Error('Esta conta não possui a função de administrador. Solicite acesso à equipe responsável.');
    }
    authorized=true;
    userEmail=data.user.email;
    $('loginPassword').value='';
    showPanel();
  }catch(e){
    $('loginError').textContent=e.message;
    $('loginError').hidden=false;
  }finally{
    $('btnLogin').disabled=false;
    $('btnLogin').textContent='Entrar no painel →';
  }
}
async function fetchOrders(){
  loadError='';
  if(!authorized||!client){loadError='Acesso administrativo indisponível.';return}
  const requestVersion=routeVersion;
  try{
    const {data,error}=await client.from('orders').select('*').order('created_at',{ascending:false});
    if(!authorized||requestVersion!==routeVersion)return;
    if(error)throw error;
    orders=data||[];
  }catch(e){
    orders=[];
    loadError='Não foi possível carregar os pedidos.';
    toast(loadError,true);
  }
}
async function fetchCoupons(){
  loadError='';
  if(!authorized||!client)return;
  const requestVersion=routeVersion;
  try{
    const {data,error}=await client.from('coupons').select('*').order('created_at',{ascending:false});
    if(!authorized||requestVersion!==routeVersion)return;
    if(error)throw error;
    coupons=data||[];
  }catch(e){
    coupons=[];
    loadError='Não foi possível carregar os cupons.';
    toast(loadError,true);
  }
}
async function fetchLogs(){
  loadError='';
  if(!authorized||!client)return;
  const requestVersion=routeVersion;
  try{
    const {data,error}=await client.from('system_logs').select('*').order('created_at',{ascending:false});
    if(!authorized||requestVersion!==routeVersion)return;
    if(error)throw error;
    logs=data||[];
  }catch(e){
    logs=[];
    loadError='Não foi possível carregar os logs.';
    toast(loadError,true);
  }
}
async function loadLovableData(){
  const apiKey=loadedSettings?.lovable_api_key;
  if(!apiKey){lovableBalance=null;lovableLicences=[];return;}
  try{
    const [resBal,resLic]=await Promise.all([
      fetch('https://rest.lovableup.online/api/v1/balance',{headers:{'x-api-key':apiKey}}),
      fetch('https://rest.lovableup.online/api/v1/all-licences',{headers:{'x-api-key':apiKey}})
    ]);
    if(resBal.ok)lovableBalance=(await resBal.json()).balance;
    if(resLic.ok)lovableLicences=(await resLic.json()).licences;
  }catch(e){
    console.warn('Erro Lovable',e);
    toast('Erro ao contatar API Lovable.',true);
  }
}
let routeVersion=0;
async function navigate(next){
  if(!routes[next]||!authorized)return;
  tab=next;
  page=1;
  selection.clear();
  const version=++routeVersion;
  $('adminPageTitle').textContent=routes[tab];
  $('breadcrumb').textContent=routes[tab];
  $('pageContext').textContent=descriptions[tab];
  document.querySelectorAll('[data-route]').forEach(b=>{
    b.classList.toggle('active',b.dataset.route===tab);
    b.setAttribute('aria-current',b.dataset.route===tab?'page':'false');
  });
  closeSidebar();
  $('adminContent').innerHTML='<div class="skeleton-row"><div></div><div></div><div></div></div><div class="skeleton-chart"></div>';
  if(!loadedSettings)await loadSettings();
  if(['dashboard','users','payments','subscriptions','deliveries'].includes(tab))await fetchOrders();
  if(tab==='coupons')await fetchCoupons();
  if(tab==='logs')await fetchLogs();
  if(tab==='licences')await loadLovableData();
  if(version!==routeVersion)return;
  render();
}
function filterValue(key){return filters[tab]?.[key]||''}
function filterField(key,value){
  filters[tab]={...filters[tab],[key]:value};
  try{sessionStorage.setItem('lu-admin-filters',JSON.stringify(filters))}catch{}
  page=1;
  render();
  const input=document.querySelector(`[data-filter="${key}"]`);
  if(input?.type==='search'){input.focus();input.setSelectionRange(value.length,value.length)}
}
function toolbar(options=''){
  return `<div class="data-toolbar"><label class="table-search">${icon('search')}<input type="search" data-filter="search" aria-label="Buscar registros" placeholder="Buscar por nome, e-mail ou protocolo" value="${esc(filterValue('search'))}"></label>${options}</div>`;
}
function statusFilter(){
  return `<select data-filter="status" aria-label="Filtrar por status">${[['','Todos os status'],['approved','Confirmado'],['pending','Pendente'],['rejected','Rejeitado']].map(([v,l])=>`<option value="${v}" ${filterValue('status')===v?'selected':''}>${l}</option>`).join('')}</select>`;
}
function filteredOrders(){
  const q=filterValue('search').toLowerCase();
  return orders.filter(o=>(!filterValue('status')||o.status===filterValue('status')||(filterValue('status')==='approved'&&(o.status==='payment_confirmed'||o.payment_status==='confirmed'))||(filterValue('status')==='pending'&&o.payment_status==='pending'))&&[o.name,o.email,o.protocol].join(' ').toLowerCase().includes(q));
}
function metrics(){
  const approved=orders.filter(o=>o.status==='approved'||o.status==='payment_confirmed'||o.payment_status==='confirmed');
  const awaitingDeliv=orders.filter(o=>(o.status==='approved'||o.status==='payment_confirmed'||o.payment_status==='confirmed')&&o.delivery_status!=='delivered'&&!o.license_key);
  return [
    ['payments','Receita confirmada',loadError?'—':money(approved.reduce((s,o)=>s+Number(o.amount||0),0)),'Somente pagamentos confirmados'],
    ['users','Clientes únicos',loadError?'—':new Set(orders.map(o=>o.email)).size,'Identificados pelos pedidos'],
    ['deliveries','Aguardando entrega',loadError?'—':awaitingDeliv.length,'Pagamento ok · Pendente de envio'],
    ['extension','Downloads registrados',loadError?'—':orders.reduce((s,o)=>s+Number(o.download_count||0),0),'Total informado nos pedidos']
  ];
}
function chart(title,kind){
  const points=Array.from({length:7},(_,i)=>{
    const d=new Date();
    d.setDate(d.getDate()-6+i);
    const key=d.toISOString().slice(0,10);
    let list=orders.filter(o=>o.created_at?.slice(0,10)===key);
    return {label:d.toLocaleDateString('pt-BR',{day:'2-digit',month:'2-digit'}),value:kind==='revenue'?list.filter(o=>o.status==='approved'||o.status==='payment_confirmed'||o.payment_status==='confirmed').reduce((s,o)=>s+Number(o.amount||0),0):new Set(list.map(o=>o.email)).size};
  });
  const max=Math.max(1,...points.map(p=>p.value));
  return `<article class="chart-card"><div class="panel-title"><h2>${title}</h2><span>Últimos 7 dias</span></div>${loadError?empty('Dados indisponíveis','Atualize para tentar novamente.'):`<div class="bar-chart" role="img" aria-label="${esc(title+': '+points.map(p=>p.label+' '+p.value).join('; '))}">${points.map(p=>`<div class="bar-column"><span>${kind==='revenue'?money(p.value):p.value}</span><div class="bar-track"><i style="height:${Math.max(1,p.value/max*100)}%"></i></div><small>${p.label}</small></div>`).join('')}</div>`}<p class="chart-note">${kind==='revenue'?'Pedidos com pagamento confirmado, agrupados pela data do pedido.':'Clientes com pedidos em cada dia; não representa cadastros de contas.'}</p></article>`;
}
function paymentRows(list,actions=true){
  return list.map(o=>`
    <tr>
      <td><b>${esc(o.name)}</b><small>${esc(o.email)}</small></td>
      <td class="mono">${esc(o.protocol)}</td>
      <td>${money(o.amount)}</td>
      <td>${paymentBadge(o.payment_status||o.status)}</td>
      <td>${deliveryBadge(o.delivery_status, o)}</td>
      <td>${date(o.created_at)}</td>
      ${actions?`<td><button class="row-action" data-order="${esc(o.id)}" aria-label="Detalhes do pedido de ${esc(o.name)}">Ver detalhes ↗</button></td>`:''}
    </tr>
  `).join('');
}
function paymentsTable(list,actions=true){
  return `<div class="table-wrap"><table class="data-table"><thead><tr><th>Cliente</th><th>Protocolo</th><th>Valor</th><th>Pagamento</th><th>Entrega</th><th>Data do pedido</th>${actions?'<th>Ações</th>':''}</tr></thead><tbody>${paymentRows(list,actions)||`<tr><td colspan="7">${empty('Nenhum pagamento encontrado','Novos pedidos aparecerão aqui. Tente outros filtros.')}</td></tr>`}</tbody></table></div>`;
}
function pagination(count){
  const pages=Math.max(1,Math.ceil(count/8));
  page=Math.min(page,pages);
  return `<div class="pagination"><span>${count} registros · Página ${page} de ${pages}</span><div><button class="btn-outline" data-page="-1" ${page===1?'disabled':''}>Anterior</button><button class="btn-outline" data-page="1" ${page===pages?'disabled':''}>Próxima</button></div></div>`;
}
function dashboard(){
  return `<div class="stat-grid">${metrics().map(([i,l,v,n])=>`<article class="stat-card"><div class="stat-top">${icon(i)}<span>${l}</span></div><strong>${v}</strong><p>${n}</p></article>`).join('')}</div><div class="charts-grid">${chart('Receita ao longo do tempo','revenue')}${chart('Clientes com pedidos','users')}</div><div class="insight-row"><article><h3>Assinaturas recorrentes</h3><p>O produto atual oferece acesso vitalício. Não há próximas cobranças ou cancelamentos recorrentes para acompanhar.</p><button class="text-button" data-go="subscriptions">Ver acessos →</button></article></div><section class="table-section"><div class="panel-title"><h2>Pagamentos recentes</h2><button class="text-button" data-go="payments">Ver todos →</button></div>${paymentsTable(orders.slice(0,5))}</section>`;
}
function users(){
  const map=new Map();
  orders.forEach(o=>{
    const prior=map.get(o.email);
    const isApproved = o.status==='approved' || o.status==='payment_confirmed' || o.payment_status==='confirmed';
    if(!prior)map.set(o.email,{...o,first:o.created_at,count:1,total:isApproved?Number(o.amount):0});
    else{
      prior.count++;
      prior.total+=isApproved?Number(o.amount):0;
      if(o.created_at<prior.first)prior.first=o.created_at;
      if(isApproved)prior.status='approved';
    }
  });
  let list=[...map.values()].filter(o=>[o.name,o.email].join(' ').toLowerCase().includes(filterValue('search').toLowerCase())&&(!filterValue('status')||o.status===filterValue('status')));
  list.sort((a,b)=>filterValue('sort')==='name'?a.name.localeCompare(b.name):String(b.first).localeCompare(String(a.first)));
  const pager=pagination(list.length);
  return `<p class="data-explainer">Clientes derivados dos pedidos. Cadastro de conta e último acesso não estão disponíveis nesta integração.</p>${toolbar(statusFilter()+`<select data-filter="sort" aria-label="Ordenar usuários"><option value="">Mais recentes</option><option value="name" ${filterValue('sort')==='name'?'selected':''}>Nome A–Z</option></select>`)}<div class="selection-bar"><span id="selectionCount">${selection.size} selecionados</span><button class="text-button" id="exportSelected">Exportar selecionados</button></div><div class="table-wrap"><table class="data-table users-table"><thead><tr><th><input type="checkbox" id="selectAll" aria-label="Selecionar esta página"></th><th>Usuário</th><th>Plano</th><th>Status</th><th>Primeiro pedido</th><th>Último acesso</th><th>Ações</th></tr></thead><tbody>${list.slice((page-1)*8,page*8).map(o=>`<tr><td><input type="checkbox" data-select="${esc(o.email)}" ${selection.has(o.email)?'checked':''} aria-label="Selecionar ${esc(o.name)}"></td><td><button class="user-cell" data-user="${esc(o.email)}"><span class="avatar">${esc(o.name?.slice(0,2).toUpperCase())}</span><span><b>${esc(o.name)}</b><small>${esc(o.email)}</small></span></button></td><td>${(o.status==='approved'||o.status==='payment_confirmed'||o.payment_status==='confirmed')?'Vitalício':'Não ativado'}</td><td>${badge(o.status)}</td><td>${date(o.first)}</td><td>Não disponível</td><td><button class="row-action" data-user="${esc(o.email)}" aria-label="Detalhes de ${esc(o.name)}">Detalhes ↗</button></td></tr>`).join('')||`<tr><td colspan="7">${empty('Nenhum usuário encontrado','Altere os filtros ou aguarde novos pedidos.')}</td></tr>`}</tbody></table></div>${pager}`;
}
function subscriptions(){
  const list=filteredOrders();
  return `
    <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; margin-bottom:24px;">
      <!-- Vitalício -->
      <div style="background:#faf5ff; border:2px solid #7c3aed; border-radius:20px; padding:20px; position:relative;">
        <span style="position:absolute; top:-10px; right:16px; background:#7c3aed; color:#fff; font-size:10px; font-weight:700; padding:2px 10px; border-radius:12px;">MAIS VENDIDO</span>
        <div style="font-size:12px; font-weight:700; color:#7c3aed; text-transform:uppercase; margin-bottom:4px;">👑 Plano Vitalício</div>
        <div style="font-size:24px; font-weight:800; color:#1e1b29; margin-bottom:10px;">R$ 69,90 <small style="font-size:12px; color:#6b627b; font-weight:500;">pagamento único</small></div>
        <p style="font-size:13px; color:#554c69; margin:0; line-height:1.5;">Acesso permanente e ilimitado à extensão LovableUnlimited.</p>
      </div>

      <!-- Pro -->
      <div style="background:#fff; border:1.5px solid #e4ddec; border-radius:20px; padding:20px;">
        <div style="font-size:12px; font-weight:700; color:#7c3aed; text-transform:uppercase; margin-bottom:4px;">⚡ Plano Pro (Ilimitado)</div>
        <div style="display:flex; gap:8px; margin-top:8px; margin-bottom:10px;">
          <div style="flex:1; background:#f7f5fa; padding:8px 4px; border-radius:10px; text-align:center;"><small style="display:block; font-size:10px; color:#6b627b;">7 Dias</small><b style="font-size:13px;">R$ 34,90</b></div>
          <div style="flex:1; background:#f7f5fa; padding:8px 4px; border-radius:10px; text-align:center;"><small style="display:block; font-size:10px; color:#6b627b;">15 Dias</small><b style="font-size:13px;">R$ 39,90</b></div>
          <div style="flex:1; background:#f7f5fa; padding:8px 4px; border-radius:10px; text-align:center;"><small style="display:block; font-size:10px; color:#6b627b;">30 Dias</small><b style="font-size:13px;">R$ 49,90</b></div>
        </div>
        <p style="font-size:13px; color:#554c69; margin:0; line-height:1.5;">Uso ilimitado com prazos flexíveis.</p>
      </div>

      <!-- Basic -->
      <div style="background:#fff; border:1.5px solid #e4ddec; border-radius:20px; padding:20px;">
        <div style="font-size:12px; font-weight:700; color:#4b5563; text-transform:uppercase; margin-bottom:4px;">🔹 Plano Basic (Econômico)</div>
        <div style="display:flex; gap:8px; margin-top:8px; margin-bottom:10px;">
          <div style="flex:1; background:#f7f5fa; padding:8px 4px; border-radius:10px; text-align:center;"><small style="display:block; font-size:10px; color:#6b627b;">7 Dias</small><b style="font-size:13px;">R$ 19,90</b></div>
          <div style="flex:1; background:#f7f5fa; padding:8px 4px; border-radius:10px; text-align:center;"><small style="display:block; font-size:10px; color:#6b627b;">15 Dias</small><b style="font-size:13px;">R$ 24,90</b></div>
          <div style="flex:1; background:#f7f5fa; padding:8px 4px; border-radius:10px; text-align:center;"><small style="display:block; font-size:10px; color:#6b627b;">30 Dias</small><b style="font-size:13px;">R$ 29,90</b></div>
        </div>
        <p style="font-size:13px; color:#554c69; margin:0; line-height:1.5;">Entrada acessível para testar a ferramenta.</p>
      </div>
    </div>

    ${toolbar(statusFilter())}
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Plano / Valor</th>
            <th>Status</th>
            <th>Método</th>
            <th>Data</th>
            <th>Histórico</th>
          </tr>
        </thead>
        <tbody>
          ${list.map(o=>{
            let pName = 'Vitalício Ilimitado';
            try {
              const p = typeof o.delivery_payload === 'string' ? JSON.parse(o.delivery_payload) : o.delivery_payload;
              if (p?.plan) pName = p.plan;
              else if (o.delivery_type) pName = o.delivery_type.toUpperCase();
            } catch(e){}
            return `<tr><td>${esc(o.name)}<small>${esc(o.email)}</small></td><td><b>${esc(pName)}</b> · ${money(o.amount)}</td><td>${badge(o.status)}</td><td>PIX</td><td>${date(o.created_at)}</td><td><button class="row-action" data-order="${esc(o.id)}">Ver pedido ↗</button></td></tr>`;
          }).join('')||'<tr><td colspan="6">Nenhum acesso encontrado.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}
function deliveriesPage(){
  const tabFilter = filterValue('deliveryTab') || 'awaiting';
  const q = filterValue('search').toLowerCase();

  const confirmed = orders.filter(o => {
    return o.payment_status === 'confirmed' || o.status === 'payment_confirmed' || o.status === 'approved';
  });

  const filtered = confirmed.filter(o => {
    const isDelivered = o.delivery_status === 'delivered' || (o.status === 'approved' && o.license_key && o.delivery_status !== 'awaiting_delivery');
    if (tabFilter === 'awaiting' && isDelivered) return false;
    if (tabFilter === 'delivered' && !isDelivered) return false;
    return [o.name, o.email, o.protocol, o.id].join(' ').toLowerCase().includes(q);
  });

  const awaitingCount = confirmed.filter(o => o.delivery_status !== 'delivered' && !(o.status === 'approved' && o.license_key && o.delivery_status !== 'awaiting_delivery')).length;
  const deliveredCount = confirmed.filter(o => o.delivery_status === 'delivered' || (o.status === 'approved' && o.license_key && o.delivery_status !== 'awaiting_delivery')).length;

  const pager = pagination(filtered.length);
  const pageSlice = filtered.slice((page-1)*8, page*8);

  return `
    <div class="delivery-tabs" style="display:flex; gap:8px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
      <button class="tab-btn ${tabFilter==='awaiting'?'active':''}" data-delivtab="awaiting" style="padding:8px 16px; border-radius:8px; border:1px solid ${tabFilter==='awaiting'?'var(--primary)':'var(--border-color)'}; background:${tabFilter==='awaiting'?'var(--primary)':'transparent'}; color:${tabFilter==='awaiting'?'#fff':'var(--text-1)'}; font-weight:600; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:8px;">
        ⏳ Aguardando entrega
        <span style="background:${tabFilter==='awaiting'?'rgba(255,255,255,0.25)':'var(--bg-2)'}; padding:2px 7px; border-radius:10px; font-size:11px;">${awaitingCount}</span>
      </button>
      <button class="tab-btn ${tabFilter==='delivered'?'active':''}" data-delivtab="delivered" style="padding:8px 16px; border-radius:8px; border:1px solid ${tabFilter==='delivered'?'var(--primary)':'var(--border-color)'}; background:${tabFilter==='delivered'?'var(--primary)':'transparent'}; color:${tabFilter==='delivered'?'#fff':'var(--text-1)'}; font-weight:600; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:8px;">
        ✅ Entregues
        <span style="background:${tabFilter==='delivered'?'rgba(255,255,255,0.25)':'var(--bg-2)'}; padding:2px 7px; border-radius:10px; font-size:11px;">${deliveredCount}</span>
      </button>
      <button class="tab-btn ${tabFilter==='all'?'active':''}" data-delivtab="all" style="padding:8px 16px; border-radius:8px; border:1px solid ${tabFilter==='all'?'var(--primary)':'var(--border-color)'}; background:${tabFilter==='all'?'var(--primary)':'transparent'}; color:${tabFilter==='all'?'#fff':'var(--text-1)'}; font-weight:600; cursor:pointer; font-size:13px; display:inline-flex; align-items:center; gap:8px;">
        📋 Todos (${confirmed.length})
      </button>
    </div>

    ${toolbar()}

    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Cliente</th>
            <th>Produto / Plano</th>
            <th>Pedido</th>
            <th>Confirmação do PIX</th>
            <th>Status da Entrega</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${pageSlice.map(o => {
            const isDelivered = o.delivery_status === 'delivered' || (o.status === 'approved' && o.license_key && o.delivery_status !== 'awaiting_delivery');
            let pName = 'Vitalício Ilimitado';
            try {
              const p = typeof o.delivery_payload === 'string' ? JSON.parse(o.delivery_payload) : o.delivery_payload;
              if (p?.plan) pName = p.plan;
              else if (o.delivery_type) pName = o.delivery_type.toUpperCase();
            } catch(e){}
            return `
              <tr>
                <td><b>${esc(o.name)}</b><small>${esc(o.email)}</small></td>
                <td><b>${esc(pName)}</b><br><small style="color:var(--ok); font-weight:600;">${money(o.amount)}</small></td>
                <td class="mono">${esc(o.protocol)}</td>
                <td>${date(o.approved_at || o.created_at)}</td>
                <td>${deliveryBadge(o.delivery_status, o)}</td>
                <td>
                  ${isDelivered ? `
                    <button class="row-action" data-view-delivery="${esc(o.id)}">Ver entrega ↗</button>
                  ` : `
                    <button class="btn-primary" data-deliver="${esc(o.id)}" style="font-size:12px; padding:6px 12px; gap:4px;">
                      ⚡ Entregar
                    </button>
                  `}
                </td>
              </tr>
            `;
          }).join('') || `<tr><td colspan="6">${empty('Nenhuma entrega encontrada', tabFilter==='awaiting'?'Todos os pagamentos confirmados já foram entregues!':'Nenhum pedido atende aos filtros atuais.')}</td></tr>`}
        </tbody>
      </table>
    </div>

    ${pager}
  `;
}
function couponsPage(){
  const list=coupons.filter(c=>c.code.toLowerCase().includes(filterValue('search').toLowerCase()));
  return `<div class="split-toolbar">${toolbar()}<button class="btn-primary" id="createCoupon">Criar cupom</button></div><div class="coupon-grid">${list.map((c)=>`<article class="coupon-card"><div class="panel-title"><h2>${esc(c.code)}</h2>${badge(c.active?'approved':'cancelled')}</div><strong>${c.discount}<small>% OFF</small></strong><p>${c.uses} de ${c.limit} utilizações</p><progress value="${c.uses}" max="${c.limit}" aria-label="Utilizações do cupom"></progress><div class="coupon-bottom"><span>Até ${date(c.expires+'T12:00:00')}</span><button class="text-button" data-coupon="${esc(c.code)}">${c.active?'Desativar':'Ativar'}</button></div></article>`).join('')||empty('Nenhum cupom encontrado','Crie um cupom ou altere a busca.')}</div>`;
}
function licencesPage(){
  if(!loadedSettings?.lovable_api_key)return empty('API não configurada','Adicione sua Lovable API Key em Configurações > Integrações.');
  let html=`<div class="split-toolbar"><div class="stat-top" style="align-items:center; gap:0.5rem"><span style="font-size:20px;">👑</span><strong>Plano Revendedor:</strong><span style="font-size:0.95rem; color:var(--ok); font-weight:700; background:rgba(16,185,129,0.1); padding:4px 10px; border-radius:8px;">Chaves Ilimitadas Grátis</span></div><div style="display:flex; gap:0.5rem"><select id="createLicenceType" class="form-input" style="width:140px; padding:0 0.5rem"><option value="lifetime">Vitalício</option><option value="basic_30d">Basic 30 dias</option></select><button class="btn-primary" id="btnCreateLicence">⚡ Gerar Licença Oficial</button></div></div>`;
  html+=`<div class="table-wrap"><table class="data-table"><thead><tr><th>Chave (Token)</th><th>Tipo</th><th>Status</th><th>Criada em</th><th>Ação</th></tr></thead><tbody>`;
  lovableLicences.forEach(l=>{
    const isAvail=l.status==='disponivel';
    html+=`<tr><td class="mono">${esc(l.chave_token)}</td><td>${esc(l.type)}</td><td>${badge(isAvail?'approved':(l.status==='revogada'?'rejected':'pending'))}</td><td>${date(l.created_at)}</td><td>${isAvail?`<button class="row-action" data-revoke="${esc(l.chave_token)}">Revogar</button>`:'—'}</td></tr>`;
  });
  if(!lovableLicences.length)html+=`<tr><td colspan="5">${empty('Nenhuma licença','Clique em Gerar Licença.')}</td></tr>`;
  html+=`</tbody></table></div>`;
  return html;
}
function logsPage(){
  let list=logs.filter(l=>[l.user_email,l.description].join(' ').toLowerCase().includes(filterValue('search').toLowerCase())&&(!filterValue('type')||l.event_type===filterValue('type'))&&(!filterValue('status')||l.status===filterValue('status'))&&(!filterValue('date')||l.created_at.startsWith(filterValue('date'))));
  return toolbar(`<input type="date" data-filter="date" aria-label="Filtrar data" value="${esc(filterValue('date'))}"><select data-filter="type" aria-label="Tipo de evento">${['','Pagamento','Acesso'].map(v=>`<option ${filterValue('type')===v?'selected':''} value="${v}">${v||'Todos os eventos'}</option>`).join('')}</select><select data-filter="status" aria-label="Status do evento">${['','Sucesso','Falhou'].map(v=>`<option ${filterValue('status')===v?'selected':''} value="${v}">${v||'Todos os status'}</option>`).join('')}</select>`)+`<div class="table-wrap"><table class="data-table"><thead><tr><th>Data</th><th>Usuário</th><th>Evento</th><th>Descrição</th><th>Status</th></tr></thead><tbody>${list.map(l=>`<tr><td>${date(l.created_at)}</td><td>${esc(l.user_email)}</td><td>${l.event_type}</td><td>${l.description}</td><td>${badge(l.status==='Sucesso'?'approved':'failed')}</td></tr>`).join('')||'<tr><td colspan="5">Nenhum evento corresponde aos filtros.</td></tr>'}</tbody></table></div>`;
}
function settingsPage() {
  const categories = ['Geral', 'Branding', 'Página de entrega', 'Pagamentos', 'Extensão', 'E-mails', 'Segurança', 'Integrações'];
  const help = {
    'E-mails': 'Nenhum serviço de e-mail transacional está conectado neste projeto.',
    'Segurança': 'O acesso exige uma sessão autenticada. A proteção dos registros deve ser garantida pelas políticas RLS do Supabase.',
    'Integrações': 'Supabase: autenticação, pedidos e configurações. Cupons, suporte e telemetria ainda não têm integração.'
  };

  let formContent = '';
  if (settingCategory === 'Geral') {
    formContent = `<p>Informações usadas na página e na entrega do produto.</p><form id="settingsForm"><label>Título da página<input name="site_title" required maxlength="150" value="${esc(loadedSettings?.site_title||'LovableUnlimited — Crie mais. Interrompa menos.')}"></label><button class="btn-primary" ${!loadedSettings?'disabled':''}>Salvar configurações</button>${!loadedSettings?'<p>Carregando configurações. A edição será liberada após a leitura.</p>':''}</form><hr class="t-divider" style="margin:2rem 0"><div style="text-align:center"><button type="button" class="btn-outline" style="border-color:var(--error); color:var(--error); width:100%" id="btnResetSettings">⚠️ Redefinir Tudo ao Padrão</button><p style="font-size:0.8rem; color:var(--text-3); margin-top:0.5rem;">Cuidado: Isso apagará suas cores, chave PIX e título personalizados.</p></div>`;
  } else if (settingCategory === 'Branding') {
    formContent = `<p>Identidade visual do site.</p><form id="settingsForm"><label>Cor Primária<input type="color" name="primary_color" value="${esc(loadedSettings?.primary_color||'#7b3aed')}" style="height:46px;padding:4px;cursor:pointer;"></label><button class="btn-primary" ${!loadedSettings?'disabled':''}>Salvar configurações</button></form>`;
  } else if (settingCategory === 'Página de entrega') {
    formContent = `
      <p>Personalize visualmente a página que o cliente vê durante a confirmação e a entrega do pedido.</p>
      
      <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(168, 85, 247, 0.04) 100%); border: 1.5px solid #c4b5fd; border-radius: 16px; padding: 24px; margin-bottom: 24px;">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:20px; flex-wrap:wrap;">
          <div style="max-width:540px;">
            <span class="badge purple" style="margin-bottom:10px;">✨ Editor Visual Personalizado</span>
            <h3 style="font-size:18px; font-weight:700; color:#1e1b29; margin-bottom:8px;">Personalizador da Página de Entrega</h3>
            <p style="font-size:13.5px; color:#554c69; line-height:1.6; margin-bottom:16px;">
              Abra nosso editor visual com preview em tempo real (Desktop, Tablet e Mobile). Edite cores, fontes, títulos, textos de espera e ative/desative animações de confete e timeline sem quebrar o layout.
            </p>
            <div style="display:flex; gap:12px; flex-wrap:wrap;">
              <a href="editor.html" target="_blank" class="btn-primary" style="text-decoration:none; padding:11px 20px; font-size:14px; gap:8px;">
                🎨 Abrir Editor Visual
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
              <a href="obrigado.html?order=demo" target="_blank" class="btn-outline" style="text-decoration:none; padding:11px 16px; font-size:14px;">
                👀 Ver Demonstração
              </a>
            </div>
          </div>
          <div style="background:#fff; border-radius:12px; padding:16px; border:1px solid #e4ddec; min-width:220px; box-shadow:0 4px 12px rgba(0,0,0,0.03);">
            <div style="font-size:11px; font-weight:700; color:var(--text-3); text-transform:uppercase; margin-bottom:8px;">Status da Configuração</div>
            <div style="margin-bottom:8px; font-size:13px; display:flex; align-items:center; gap:8px;">
              <span style="width:8px; height:8px; border-radius:50%; background:#10b981;"></span>
              <b>Publicado:</b> ${loadedSettings?.delivery_page_config ? 'Personalizado' : 'Padrão do Sistema'}
            </div>
            <div style="font-size:13px; display:flex; align-items:center; gap:8px;">
              <span style="width:8px; height:8px; border-radius:50%; background:${loadedSettings?.delivery_page_draft ? '#f59e0b' : '#94a3b8'};"></span>
              <b>Rascunho:</b> ${loadedSettings?.delivery_page_draft ? 'Existe rascunho' : 'Nenhum'}
            </div>
          </div>
        </div>
      </div>
    `;
  } else if (settingCategory === 'Pagamentos') {
    formContent = `<p>Dados para o recebimento via PIX.</p><form id="settingsForm"><label>Preço do Plano Vitalício (R$)<input type="number" step="0.01" min="0" name="product_price" required value="${esc((loadedSettings?.product_price && loadedSettings.product_price !== 200 && loadedSettings.product_price !== 97) ? loadedSettings.product_price : 69.90)}"></label><label>Sua Chave PIX<input name="pix_key" required placeholder="Sua chave CPF, Email ou Celular" value="${esc(loadedSettings?.pix_key||'')}"></label><button class="btn-primary" ${!loadedSettings?'disabled':''}>Salvar configurações</button></form>`;
  } else if (settingCategory === 'Extensão') {
    const curUrl = loadedSettings?.download_url || 'lovableunlimited.zip';
    formContent = `
      <p>Envie o arquivo que o cliente receberá para download após a aprovação da compra.</p>
      
      <div style="background: #faf8fd; border: 2px dashed #c4b5fd; border-radius: 16px; padding: 24px; text-align: center; margin-bottom: 24px;">
        <div style="width: 52px; height: 52px; border-radius: 50%; background: #ede5fa; color: #7c3aed; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px;">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
        </div>
        <h3 style="font-size: 16px; font-weight: 600; color: #1e1b29; margin-bottom: 6px;">Enviar Novo Arquivo da Extensão</h3>
        <p style="font-size: 13px; color: #6b627b; margin-bottom: 16px; max-width: 440px; margin-left: auto; margin-right: auto;">
          Escolha o arquivo no seu computador (.zip, .crx, .rar, etc.). Ele será salvo no armazenamento e entregue aos clientes.
        </p>
        <input type="file" id="extFileInput" accept=".zip,.crx,.rar,.7z,.tar,.gz,.json" style="display: none;">
        <button type="button" class="btn-primary" id="btnSelectFile" style="gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          Escolher Arquivo do Computador
        </button>
        <div id="uploadFeedback" style="margin-top: 14px; font-size: 13px; font-weight: 600; display: none;"></div>
      </div>

      <div style="background: #f7f5fa; border-radius: 14px; padding: 16px 20px; margin-bottom: 24px;">
        <div style="font-size: 12px; font-weight: 600; color: #7c3aed; text-transform: uppercase; margin-bottom: 6px;">Arquivo de Entrega Ativo</div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap;">
          <code style="word-break: break-all; font-size: 13px; background: #fff; padding: 8px 12px; border-radius: 8px; border: 1px solid #e4ddec; flex: 1;">${esc(curUrl)}</code>
          <a href="${esc(curUrl)}" target="_blank" download class="btn-outline" style="font-size: 13px; padding: 8px 14px; text-decoration: none; flex-shrink: 0;">
            ⬇️ Testar Download
          </a>
        </div>
      </div>

      <form id="settingsForm">
        <label>Ou insira o link direto do arquivo (Google Drive, Dropbox, HTTPS):
          <input name="download_url" id="inputDownloadUrl" required value="${esc(curUrl)}">
        </label>
        <button class="btn-primary" ${!loadedSettings?'disabled':''}>Salvar link manual</button>
      </form>
    `;
  } else if (settingCategory === 'Integrações') {
    formContent = `<p>Configurações de APIs de terceiros.</p><form id="settingsForm"><label>Lovable API Key (Licenças)<input name="lovable_api_key" placeholder="rsk_..." value="${esc(loadedSettings?.lovable_api_key||'')}"></label><button class="btn-primary" ${!loadedSettings?'disabled':''}>Salvar configurações</button></form>`;
  } else {
    formContent = `<div class="setting-information">${icon('settings')}<p>${help[settingCategory]||''}</p></div>`;
  }

  return `<div class="settings-layout"><nav class="settings-nav" aria-label="Categorias de configurações">${categories.map(c=>`<button data-category="${c}" class="${settingCategory===c?'active':''}">${c}</button>`).join('')}</nav><section class="settings-card"><h2>${settingCategory}</h2>${formContent}</section></div>`;
}
function render(){
  const renderers={
    dashboard,
    users,
    subscriptions,
    deliveries: deliveriesPage,
    coupons: couponsPage,
    licences: licencesPage,
    logs: logsPage,
    settings: settingsPage,
    payments: () => {
      const list = filteredOrders();
      const pager = pagination(list.length);
      return toolbar(statusFilter()) + paymentsTable(list.slice((page-1)*8, page*8)) + pager;
    }
  };
  $('adminContent').innerHTML=(loadError&&['dashboard','users','payments','subscriptions','deliveries'].includes(tab)?`<div class="error-banner" role="alert">${esc(loadError)}</div>`:'')+renderers[tab]();
  bindContent();
  if(tab==='settings'&&!loadedSettings)loadSettings();
}
async function loadSettings(){
  if(!authorized||!client)return;
  const requestVersion=routeVersion;
  try{
    const {data,error}=await client.from('settings').select('*').single();
    if(!authorized||requestVersion!==routeVersion)return;
    if(error)throw error;
    if(data){
      if(data.product_price!==undefined&&data.product_price!==null){
        data.product_price=Number(data.product_price);
      }
      loadedSettings=data;
    }
    render();
  }catch{
    toast('Configurações indisponíveis. Tente atualizar antes de editar.',true);
  }
}
function userDetail(email){
  const list=orders.filter(o=>o.email===email);
  if(!list.length)return;
  const hasApproved = list.some(o=>o.status==='approved'||o.status==='payment_confirmed'||o.payment_status==='confirmed');
  modal(`
    <div class="detail-heading">
      <span class="avatar large">${esc(list[0].name.slice(0,2))}</span>
      <h2>${esc(list[0].name)}</h2>
      <p>${esc(email)}</p>
    </div>
    <dl class="detail-list">
      <div><dt>Plano</dt><dd>${hasApproved?'Vitalício':'Não ativado'}</dd></div>
      <div><dt>Pedidos</dt><dd>${list.length}</dd></div>
      <div><dt>Total confirmado</dt><dd>${money(list.filter(o=>o.status==='approved'||o.status==='payment_confirmed'||o.payment_status==='confirmed').reduce((s,o)=>s+Number(o.amount),0))}</dd></div>
      <div><dt>Cadastro da conta</dt><dd>Não disponível</dd></div>
      <div><dt>Último acesso</dt><dd>Não disponível</dd></div>
    </dl>
    <h3>Histórico de pedidos</h3>
    ${list.map(o=>`<div class="history-row"><span>${esc(o.protocol)}<small>${date(o.created_at)}</small></span>${badge(o.status)}</div>`).join('')}
  `);
}

function orderDetail(id){
  const o=orders.find(o=>o.id===id);
  if(!o)return;
  const payStatus = o.payment_status || (o.status==='approved'?'payment_confirmed':o.status) || 'pending';
  const delivStatus = o.delivery_status || (o.license_key ? 'delivered' : (payStatus==='payment_confirmed'||o.status==='approved' ? 'awaiting_delivery' : 'pending'));
  
  let auditLogs = [];
  try {
    if (typeof o.audit_log === 'string') auditLogs = JSON.parse(o.audit_log);
    else if (Array.isArray(o.audit_log)) auditLogs = o.audit_log;
  } catch(e){}

  const isPayPending = payStatus === 'pending' || o.status === 'pending';
  const isPayConfirmed = payStatus === 'payment_confirmed' || o.status === 'approved' || payStatus === 'confirmed';
  const isDelivered = delivStatus === 'delivered' || (o.status === 'approved' && o.license_key && o.delivery_status !== 'awaiting_delivery');

  let planName = 'Vitalício Ilimitado';
  try {
    const p = typeof o.delivery_payload === 'string' ? JSON.parse(o.delivery_payload) : o.delivery_payload;
    if (p?.plan) planName = p.plan;
    else if (o.delivery_type) planName = o.delivery_type.toUpperCase();
  } catch(e){}

  let actionsHtml = '';
  if (isPayPending) {
    actionsHtml = `
      <div class="dialog-actions" style="margin-top:20px; display:flex; gap:10px; width:100%;">
        <button class="btn-outline" id="rejectOrder" style="flex:1;">Rejeitar pedido</button>
        <button class="btn-primary" id="approveOrder" style="flex:1.5;">✓ Confirmar pagamento</button>
      </div>
    `;
  } else if (isPayConfirmed && !isDelivered) {
    actionsHtml = `
      <div class="dialog-actions" style="margin-top:20px; display:flex; gap:10px;">
        <a href="obrigado.html?order=${encodeURIComponent(o.protocol)}" target="_blank" class="btn-outline" style="text-decoration:none; text-align:center; flex:1;">
          Ver tela do cliente ↗
        </a>
        <button class="btn-primary" id="btnGoDeliver" style="flex:1.5; gap:8px;">
          ⚡ Realizar Entrega da Chave
        </button>
      </div>
    `;
  } else {
    actionsHtml = `
      <div class="dialog-actions" style="margin-top:20px; display:flex; gap:10px;">
        <a href="obrigado.html?order=${encodeURIComponent(o.protocol)}" target="_blank" class="btn-outline" style="text-decoration:none; text-align:center; flex:1;">
          Ver tela do cliente ↗
        </a>
        <button class="btn-primary" id="btnViewDeliverData" style="flex:1.5;">
          Ver Detalhes da Entrega
        </button>
      </div>
    `;
  }

  modal(`
    <h2>Detalhes do pedido</h2>
    <p class="dialog-sub">${esc(o.protocol)}</p>
    <dl class="detail-list">
      <div><dt>ID do Pedido</dt><dd class="mono" style="font-size:12px;">${esc(o.id)}</dd></div>
      <div><dt>Cliente</dt><dd>${esc(o.name)}</dd></div>
      <div><dt>E-mail</dt><dd>${esc(o.email)}</dd></div>
      <div><dt>Produto / Plano</dt><dd><b style="color:var(--primary);">${esc(planName)}</b></dd></div>
      <div><dt>Valor / Forma</dt><dd>${money(o.amount)} · PIX</dd></div>
      <div><dt>Data do Pedido</dt><dd>${date(o.created_at)}</dd></div>
      <div><dt>Status do Pagamento</dt><dd>${paymentBadge(payStatus)}</dd></div>
      <div><dt>Status da Entrega</dt><dd>${deliveryBadge(delivStatus, o)}</dd></div>
      <div><dt>Confirmado em</dt><dd>${o.approved_at ? date(o.approved_at) : '—'}</dd></div>
      <div><dt>Entregue em</dt><dd>${o.delivered_at ? date(o.delivered_at) : '—'}</dd></div>
      ${o.delivered_by ? `<div><dt>Entregue por</dt><dd>${esc(o.delivered_by)}</dd></div>` : ''}
      ${o.license_key ? `<div><dt>Chave / Licença</dt><dd class="mono" style="color:var(--primary); font-weight:700;">${esc(o.license_key)}</dd></div>` : ''}
    </dl>

    ${auditLogs.length ? `
      <div style="margin-top:20px; border-top:1px solid var(--border-color); padding-top:14px;">
        <h3 style="font-size:13px; font-weight:700; color:var(--text-2); text-transform:uppercase; margin-bottom:10px;">Histórico & Auditoria</h3>
        <div class="audit-timeline">
          ${auditLogs.map(item => `
            <div class="audit-item">
              <span class="audit-time">${date(item.time)} ${new Date(item.time).toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</span>
              <div class="audit-text"><b>${esc(item.action)}</b> por <small>${esc(item.by || 'Sistema')}</small></div>
              ${item.note ? `<p style="font-size:12px; color:var(--text-3); margin-top:2px;">${esc(item.note)}</p>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    ` : ''}

    ${actionsHtml}
  `);

  if (isPayPending) {
    $('rejectOrder').onclick = () => confirmOrder(id, 'rejected');
    $('approveOrder').onclick = () => promptConfirmPayment(id);
  } else if (isPayConfirmed && !isDelivered) {
    $('btnGoDeliver').onclick = () => {
      $('detailDialog').close();
      openDeliveryModal(id);
    };
  } else if ($('btnViewDeliverData')) {
    $('btnViewDeliverData').onclick = () => {
      $('detailDialog').close();
      openDeliveryModal(id);
    };
  }
}

function promptConfirmPayment(id) {
  $('detailDialog').close();
  const o = orders.find(o => o.id === id);
  if (!o) return;

  let planName = 'Vitalício Ilimitado';
  try {
    const p = typeof o.delivery_payload === 'string' ? JSON.parse(o.delivery_payload) : o.delivery_payload;
    if (p?.plan) planName = p.plan;
    else if (o.delivery_type) planName = o.delivery_type.toUpperCase();
  } catch(e){}

  modal(`
    <h2>Confirmar pagamento recebido?</h2>
    <p class="dialog-sub" style="font-size:14px; margin-bottom:14px; line-height:1.5;">
      Ao confirmar, o pedido avançará para a fila de <b>Entregas</b> e o cliente verá na tela dele o status "Aguardando entrega".
    </p>

    <div style="background:var(--bg-2); border-radius:10px; padding:14px 18px; margin-bottom:20px; font-size:13.5px; border:1px solid var(--border-color);">
      <div style="margin-bottom:4px;"><b>Cliente:</b> ${esc(o.name)} (${esc(o.email)})</div>
      <div style="margin-bottom:4px;"><b>Plano:</b> <span style="color:var(--primary); font-weight:700;">${esc(planName)}</span></div>
      <div style="margin-bottom:4px;"><b>Valor pago:</b> ${money(o.amount)} · PIX</div>
      <div><b>Protocolo:</b> <code class="mono">${esc(o.protocol)}</code></div>
    </div>

    <div class="dialog-actions">
      <button class="btn-outline" id="cancelConfirmPay">Cancelar</button>
      <button class="btn-primary" id="btnExecuteConfirmPay">✓ Confirmar Pagamento</button>
    </div>
  `);

  $('cancelConfirmPay').onclick = () => $('detailDialog').close();
  $('btnExecuteConfirmPay').onclick = async () => {
    const btn = $('btnExecuteConfirmPay');
    btn.disabled = true;
    btn.textContent = 'Confirmando…';
    try {
      if (!authorized || !client) throw new Error('Sessão administrativa necessária.');

      const now = new Date().toISOString();
      let currentAudit = [];
      try {
        if (typeof o.audit_log === 'string') currentAudit = JSON.parse(o.audit_log);
        else if (Array.isArray(o.audit_log)) currentAudit = [...o.audit_log];
      } catch(e){}

      currentAudit.push({
        action: 'Pagamento confirmado',
        by: userEmail || 'Administrador',
        time: now,
        note: `Pagamento PIX validado pelo Administrador · Enviado para fila de entregas`
      });

      const updatePayload = {
        status: 'payment_confirmed',
        payment_status: 'confirmed',
        delivery_status: 'awaiting_delivery',
        approved_at: now,
        audit_log: JSON.stringify(currentAudit)
      };

      const { data, error } = await client.from('orders').update(updatePayload).eq('id', id).select('id').single();
      if (error) {
        console.warn('Fallback update for orders:', error);
        const fbPayload = { status: 'approved', approved_at: now };
        const { error: fbErr } = await client.from('orders').update(fbPayload).eq('id', id);
        if (fbErr) throw fbErr;
        updatePayload.status = 'approved';
      }

      Object.assign(o, updatePayload);
      $('detailDialog').close();
      toast('✓ Pagamento confirmado! O pedido está na fila de Entregas.');
      render();
    } catch (e) {
      toast('Erro ao confirmar: ' + e.message, true);
      btn.disabled = false;
      btn.textContent = 'Confirmar pagamento';
    }
  };
}

function openDeliveryModal(id) {
  const o = orders.find(o => o.id === id);
  if (!o) return;

  const isDelivered = o.delivery_status === 'delivered' || (o.status === 'approved' && o.license_key && o.delivery_status !== 'awaiting_delivery');
  let parsedPayload = {};
  try {
    if (typeof o.delivery_payload === 'string') parsedPayload = JSON.parse(o.delivery_payload);
    else if (typeof o.delivery_payload === 'object') parsedPayload = o.delivery_payload || {};
  } catch(e){}

  const planName = parsedPayload.plan || (o.delivery_type ? o.delivery_type.toUpperCase() : 'Vitalício Ilimitado');
  const isLifetime = planName.toLowerCase().includes('vitalício') || planName.toLowerCase().includes('vitalicio');

  modal(`
    <h2>${isDelivered ? 'Chave de Acesso Entregue' : 'Entrega da Chave de Acesso'}</h2>
    <p class="dialog-sub">Pedido: <b>${esc(o.protocol)}</b> · Cliente: <b>${esc(o.name)}</b></p>

    <div style="background:var(--bg-2); border-radius:12px; padding:14px 18px; margin-bottom:18px; font-size:13px; border:1px solid var(--border-color);">
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:var(--text-3);">E-mail do cliente:</span>
        <b>${esc(o.email)}</b>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:var(--text-3);">Plano adquirido:</span>
        <b style="color:var(--primary); font-size:14px;">${esc(planName)}</b>
      </div>
      <div style="display:flex; justify-content:space-between; margin-bottom:6px;">
        <span style="color:var(--text-3);">Valor pago:</span>
        <b style="color:var(--ok);">${money(o.amount)} (PIX Confirmado)</b>
      </div>
      <div style="display:flex; justify-content:space-between;">
        <span style="color:var(--text-3);">Status da entrega:</span>
        <span>${deliveryBadge(isDelivered ? 'delivered' : 'awaiting_delivery', o)}</span>
      </div>
    </div>

    ${isDelivered ? `
      <div style="background:#f5f3ff; border:1px solid #ddd6fe; border-radius:14px; padding:18px; margin-bottom:20px;">
        <div style="font-size:11px; font-weight:700; color:#7c3aed; text-transform:uppercase; margin-bottom:10px;">
          🎉 Chave de Acesso Ilimitado Ativa
        </div>
        <p style="margin-bottom:10px;">
          🔑 <b>Chave Entregue:</b> 
          <code style="background:#fff; padding:6px 12px; border-radius:8px; font-weight:700; border:1px solid #c4b5fd; font-size:14px; display:inline-block; margin-top:4px;">${esc(o.license_key || parsedPayload.key)}</code>
        </p>
        ${parsedPayload.message ? `<p style="margin-bottom:8px; font-size:13px;">💬 <b>Instruções:</b> ${esc(parsedPayload.message)}</p>` : ''}
        <div style="font-size:12px; color:var(--text-3); margin-top:12px; border-top:1px dashed #c4b5fd; padding-top:8px;">
          Entregue em: <b>${date(o.delivered_at)}</b> por <b>${esc(o.delivered_by || 'Admin')}</b>
        </div>
      </div>
      <div class="dialog-actions">
        <a href="obrigado.html?order=${encodeURIComponent(o.protocol)}" target="_blank" class="btn-outline" style="text-decoration:none; text-align:center; flex:1;">
          Ver tela do cliente ↗
        </a>
      </div>
    ` : `
      <!-- Status do Plano Revendedor Oficial -->
      <div style="background: linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%); border: 1.5px solid #c4b5fd; border-radius: 14px; padding: 12px 18px; margin-bottom: 18px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="font-size:22px;">👑</span>
          <div>
            <div style="font-size:11px; font-weight:700; color:#7c3aed; text-transform:uppercase; letter-spacing:0.04em;">Acesso Revendedor Oficial</div>
            <div style="font-size:13px; font-weight:700; color:#1e1b29;">Licenças Ilimitadas & Gratuitas</div>
          </div>
        </div>
        <span class="badge ok" style="font-size:11px; font-weight:700;">Revendedor Ativo</span>
      </div>

      <div id="modalApiErrorBox" style="display:none; background:#fee2e2; border:1px solid #fca5a5; color:#991b1b; padding:10px 14px; border-radius:10px; font-size:12.5px; margin-bottom:14px; line-height:1.5;"></div>

      <form id="deliveryForm">
        <div style="margin-bottom:16px;">
          <label style="font-weight:700; font-size:13px; display:block; margin-bottom:6px;">Chave de Acesso / Licença Ilimitada:</label>
          <div style="display:flex; gap:8px; margin-bottom:8px;">
            <input type="text" id="inputDeliveryKey" placeholder="Cole ou gere a chave oficial..." value="${esc(o.license_key || '')}" style="flex:1;" required>
            <button type="button" class="btn-outline" id="btnGenRandomKey" style="font-size:12px; white-space:nowrap;" title="Gera um código local">Gerar Código Rápido</button>
          </div>
          
          <button type="button" class="btn-primary" id="btnGenerateViaApi" style="width:100%; font-size:13px; padding:10px 16px; background:#7c3aed; border-color:#7c3aed; gap:8px; margin-top:4px;">
            ⚡ Gerar Chave Oficial na API Lovable (${isLifetime ? 'Vitalício' : '30 Dias'})
          </button>
          <small style="color:var(--text-3); font-size:11.5px; margin-top:6px; display:block;">
            Plano revendedor ativo: clique acima para gerar a chave oficial instantaneamente e sem custos.
          </small>
        </div>

        <div style="margin-bottom:18px;">
          <label style="font-weight:600; font-size:13px; display:block; margin-bottom:4px;">Instruções adicionais (Opcional):</label>
          <textarea id="inputDeliveryMsg" rows="2" placeholder="Ex: Seu acesso ilimitado foi ativado! Copie sua chave e insira na extensão."></textarea>
        </div>

        <div class="dialog-actions">
          <button type="button" class="btn-outline" onclick="$('detailDialog').close()">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSubmitDelivery" style="flex:1.5; gap:8px;">
            🚀 Entregar Chave ao Cliente
          </button>
        </div>
      </form>
    `}
  `, true);

  if (!isDelivered) {
    if ($('btnGenerateViaApi')) {
      $('btnGenerateViaApi').onclick = async () => {
        const btn = $('btnGenerateViaApi');
        const errBox = $('modalApiErrorBox');
        errBox.style.display = 'none';
        btn.disabled = true;
        btn.textContent = 'Gerando chave oficial na API Lovable…';
        try {
          const apiKey = loadedSettings?.lovable_api_key;
          if (!apiKey) throw new Error('API Key da Lovable não configurada. Configure em Configurações > Integrações.');

          const res = await fetch('https://rest.lovableup.online/api/v1/create-licence', {
            method: 'POST',
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            body: JSON.stringify({ type: isLifetime ? 'lifetime' : 'basic_30d' })
          });
          const data = await res.json();
          if (!data.success) {
            throw new Error(data.error || 'Erro ao gerar licença na API.');
          }
          $('inputDeliveryKey').value = data.chave_token;
          toast('✓ Chave oficial gerada com sucesso pela API Lovable!');
        } catch(e) {
          errBox.style.display = 'block';
          errBox.textContent = e.message;
          toast(e.message, true);
        } finally {
          btn.disabled = false;
          btn.textContent = `⚡ Gerar Chave Oficial na API Lovable (${isLifetime ? 'Vitalício' : '30 Dias'})`;
        }
      };
    }

    $('btnGenRandomKey').onclick = () => {
      const part = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      const prefix = isLifetime ? 'VITALICIO' : 'PRO';
      $('inputDeliveryKey').value = `LVBL-${prefix}-${part()}-${part()}`;
    };

    $('deliveryForm').onsubmit = (e) => {
      e.preventDefault();
      const key = $('inputDeliveryKey')?.value.trim() || '';
      const msg = $('inputDeliveryMsg')?.value.trim() || '';

      if (!key) {
        toast('Informe ou gere a chave de ativação para continuar.', true);
        return;
      }

      promptConfirmDelivery(id, { plan: planName, key, msg });
    };
  }
}

function promptConfirmDelivery(id, { plan, key, msg }) {
  $('detailDialog').close();
  const o = orders.find(o => o.id === id);
  if (!o) return;

  modal(`
    <h2>Confirmar entrega da chave?</h2>
    <p class="dialog-sub" style="font-size:14px; margin-bottom:16px;">
      Após confirmar, o cliente poderá visualizar sua chave de ativação ilimitada em tempo real.
    </p>

    <div style="background:var(--bg-2); border-radius:10px; padding:14px 18px; margin-bottom:20px; font-size:13px; border:1px solid var(--border-color);">
      <div style="margin-bottom:4px;"><b>Cliente:</b> ${esc(o.name)} (${esc(o.email)})</div>
      <div style="margin-bottom:4px;"><b>Plano:</b> <span style="color:var(--primary); font-weight:700;">${esc(plan)}</span></div>
      <div style="margin-bottom:4px;"><b>Chave de ativação:</b> <code style="font-weight:700; color:var(--primary); font-size:14px;">${esc(key)}</code></div>
      ${msg ? `<div><b>Instruções:</b> ${esc(msg)}</div>` : ''}
    </div>

    <div class="dialog-actions">
      <button class="btn-outline" id="cancelConfirmDelivery">Cancelar</button>
      <button class="btn-primary" id="btnExecuteDelivery">Confirmar entrega</button>
    </div>
  `);

  $('cancelConfirmDelivery').onclick = () => {
    $('detailDialog').close();
    openDeliveryModal(id);
  };

  $('btnExecuteDelivery').onclick = async () => {
    const btn = $('btnExecuteDelivery');
    btn.disabled = true;
    btn.textContent = 'Entregando…';

    try {
      if (!authorized || !client) throw new Error('Sessão administrativa necessária.');

      const now = new Date().toISOString();
      let currentAudit = [];
      try {
        if (typeof o.audit_log === 'string') currentAudit = JSON.parse(o.audit_log);
        else if (Array.isArray(o.audit_log)) currentAudit = [...o.audit_log];
      } catch(e){}

      currentAudit.push({
        action: 'Entrega de chave concluída',
        by: userEmail || 'Administrador',
        time: now,
        note: `Chave: ${key} · Plano: ${plan}`
      });

      const deliveryPayloadObj = {
        plan,
        key,
        message: msg || undefined,
        delivered_at: now,
        delivered_by: userEmail || 'Administrador'
      };

      const updatePayload = {
        delivery_status: 'delivered',
        status: 'approved',
        license_key: key,
        delivery_payload: JSON.stringify(deliveryPayloadObj),
        delivered_at: now,
        delivered_by: userEmail || 'Administrador',
        audit_log: JSON.stringify(currentAudit)
      };

      const { data, error } = await client.from('orders').update(updatePayload).eq('id', id).select('id').single();
      if (error) {
        console.warn('Fallback update for orders:', error);
        const fbPayload = { status: 'approved', license_key: key };
        const { error: fbErr } = await client.from('orders').update(fbPayload).eq('id', id);
        if (fbErr) throw fbErr;
      }

      Object.assign(o, updatePayload);
      $('detailDialog').close();
      toast('🎉 Chave entregue com sucesso! O cliente já pode visualizar.');
      render();
    } catch (e) {
      toast('Não foi possível entregar: ' + e.message, true);
      btn.disabled = false;
      btn.textContent = 'Confirmar entrega';
    }
  };
}

function confirmOrder(id,status){
  $('detailDialog').close();
  modal(`
    <h2>Rejeitar este pedido?</h2>
    <p class="dialog-sub">O pedido ficará rejeitado e não liberará o download nem a licença.</p>
    <div class="dialog-actions">
      <button class="btn-outline" id="cancelAction">Cancelar</button>
      <button class="btn-primary" id="confirmOrder">Confirmar rejeição</button>
    </div>
  `);
  $('cancelAction').onclick=()=>$('detailDialog').close();
  $('confirmOrder').onclick=async()=>{
    const btn=$('confirmOrder');
    btn.disabled=true;
    try{
      if(!authorized||!client)throw new Error('Sessão administrativa necessária.');
      let updatePayload={status};
      const {data,error}=await client.from('orders').update(updatePayload).eq('id',id).select('id').single();
      if(error)throw error;
      const o=orders.find(o=>o.id===id);
      if(o) Object.assign(o,updatePayload);
      $('detailDialog').close();
      toast('Pedido atualizado com sucesso.');
      render();
    }catch(e){
      toast('Não foi possível atualizar: '+e.message,true);
      btn.disabled=false;
    }
  };
}

function createCoupon(){
  modal(`<h2>Novo cupom</h2><form id="couponForm"><label>Código<input name="code" required pattern="[A-Za-z0-9_-]{3,24}" maxlength="24" placeholder="EXEMPLO20"></label><div class="form-row"><label>Desconto (%)<input type="number" name="discount" min="1" max="100" required value="20"></label><label>Limite de usos<input type="number" name="limit" min="1" max="1000000" required value="100"></label></div><label>Validade<input type="date" name="expires" min="${new Date().toISOString().slice(0,10)}" required></label><button class="btn-primary" id="btnSaveCoupon">Criar cupom</button></form>`);
  $('couponForm').onsubmit=async e=>{
    e.preventDefault();
    const btn=$('btnSaveCoupon');
    btn.disabled=true;
    try{
      const f=new FormData(e.target),code=f.get('code').toUpperCase();
      if(coupons.some(c=>c.code===code))throw new Error('Já existe um cupom com esse código.');
      const {error}=await client.from('coupons').insert([{code,discount:Number(f.get('discount')),limit:Number(f.get('limit')),expires:f.get('expires'),uses:0,active:true}]);
      if(error)throw error;
      $('detailDialog').close();
      await fetchCoupons();
      render();
      toast('Cupom criado com sucesso.');
    }catch(err){
      toast('Não foi possível criar: '+err.message,true);
      btn.disabled=false;
    }
  };
}

function bindContent(){
  document.querySelectorAll('[data-filter]').forEach(el=>el.addEventListener(el.type==='search'?'input':'change',()=>filterField(el.dataset.filter,el.value)));
  document.querySelectorAll('[data-go]').forEach(b=>b.onclick=()=>navigate(b.dataset.go));
  document.querySelectorAll('[data-page]').forEach(b=>b.onclick=()=>{page+=Number(b.dataset.page);render()});
  document.querySelectorAll('[data-order]').forEach(b=>b.onclick=()=>orderDetail(b.dataset.order));
  document.querySelectorAll('[data-user]').forEach(b=>b.onclick=()=>userDetail(b.dataset.user));
  document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{settingCategory=b.dataset.category;render()});
  document.querySelectorAll('[data-delivtab]').forEach(b=>b.onclick=()=>{
    if(!filters['deliveries']) filters['deliveries']={};
    filters['deliveries'].deliveryTab=b.dataset.delivtab;
    page=1;
    render();
  });
  document.querySelectorAll('[data-deliver]').forEach(b=>b.onclick=()=>openDeliveryModal(b.dataset.deliver));
  document.querySelectorAll('[data-view-delivery]').forEach(b=>b.onclick=()=>openDeliveryModal(b.dataset.viewDelivery));
  document.querySelectorAll('[data-select]').forEach(b=>b.onchange=()=>{b.checked?selection.add(b.dataset.select):selection.delete(b.dataset.select);$('selectionCount').textContent=selection.size+' selecionados'});
  if($('selectAll'))$('selectAll').onchange=e=>document.querySelectorAll('[data-select]').forEach(b=>{b.checked=e.target.checked;b.onchange()});
  if($('exportSelected'))$('exportSelected').onclick=()=>{
    if(!selection.size){toast('Selecione pelo menos um usuário.');return}
    const safe=v=>'"'+String(v).replace(/^[=+@-]/,"'").replace(/"/g,'""')+'"';
    const rows=[['Nome','E-mail'],...[...selection].map(email=>[orders.find(o=>o.email===email)?.name,email])];
    const blob=new Blob(['\uFEFF'+rows.map(r=>r.map(safe).join(';')).join('\r\n')],{type:'text/csv;charset=utf-8'});
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='usuarios.csv';
    a.click();
    setTimeout(()=>URL.revokeObjectURL(a.href),1000);
    toast('Exportação preparada.');
  };
  if($('btnCreateLicence'))$('btnCreateLicence').onclick=async()=>{
    const type=$('createLicenceType').value;
    const apiKey=loadedSettings?.lovable_api_key;
    $('btnCreateLicence').disabled=true;
    try{
      const res=await fetch('https://rest.lovableup.online/api/v1/create-licence',{method:'POST',headers:{'x-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({type})});
      const data=await res.json();
      if(!data.success){
        throw new Error(data.error||'Erro ao gerar licença na API Lovable');
      }
      toast('Licença gerada com sucesso!');
      await loadLovableData();
      render();
    }catch(e){
      toast(e.message,true);
      $('btnCreateLicence').disabled=false;
    }
  };
  document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Tem certeza que deseja revogar esta licença? O valor será estornado.'))return;
    const apiKey=loadedSettings?.lovable_api_key;
    try{
      const res=await fetch('https://rest.lovableup.online/api/v1/revoke-licence',{method:'POST',headers:{'x-api-key':apiKey,'Content-Type':'application/json'},body:JSON.stringify({chave_token:b.dataset.revoke})});
      const data=await res.json();
      if(!data.success)throw new Error('Erro na API');
      toast('Licença revogada!');
      await loadLovableData();
      render();
    }catch(e){
      toast(e.message,true);
    }
  });
  if($('createCoupon'))$('createCoupon').onclick=createCoupon;
  document.querySelectorAll('[data-coupon]').forEach(b=>b.onclick=()=>{
    const c=coupons.find(c=>c.code===b.dataset.coupon);
    modal(`<h2>${c.active?'Desativar':'Ativar'} ${esc(c.code)}?</h2><p class="dialog-sub">Você tem certeza que quer ${c.active?'desativar':'ativar'} este cupom?</p><button class="btn-primary" id="toggleCouponBtn">${c.active?'Desativar':'Ativar'} cupom</button>`);
    $('toggleCouponBtn').onclick=async()=>{
      try{
        $('toggleCouponBtn').disabled=true;
        const {error}=await client.from('coupons').update({active:!c.active}).eq('code',c.code);
        if(error)throw error;
        c.active=!c.active;
        $('detailDialog').close();
        render();
        toast(`Cupom ${c.active?'ativado':'desativado'} com sucesso.`);
      }catch(e){
        toast('Erro: '+e.message,true);
        $('toggleCouponBtn').disabled=false;
      }
    };
  });
  if($('btnResetSettings'))$('btnResetSettings').onclick=async()=>{
    if(!confirm('Tem certeza que deseja apagar todas as configurações personalizadas e voltar ao padrão?'))return;
    const btn=$('btnResetSettings');
    btn.disabled=true;
    const defaults={site_title:'LovableUnlimited — Crie mais. Interrompa menos.',download_url:'lovableunlimited.zip',primary_color:'#7b3aed',pix_key:'',product_price:97};
    try{
      if(!authorized||!client||!loadedSettings?.id)throw new Error('Sem conexão.');
      const {error}=await client.from('settings').update(defaults).eq('id',loadedSettings.id);
      if(error)throw error;
      loadedSettings={...loadedSettings,...defaults};
      toast('Tudo voltou ao padrão!');
      render();
    }catch(e){
      toast('Erro: '+e.message,true);
      btn.disabled=false;
    }
  };
  if($('btnSelectFile'))$('btnSelectFile').onclick=()=>$('extFileInput').click();
  if($('extFileInput'))$('extFileInput').onchange=async()=>{
    const file=$('extFileInput').files[0];
    if(!file)return;
    const feedback=$('uploadFeedback');
    feedback.style.display='block';
    feedback.style.color='#7c3aed';
    feedback.textContent=`Enviando "${file.name}" (${(file.size/(1024*1024)).toFixed(2)} MB)... Aguarde.`;
    const btnSelect=$('btnSelectFile');
    btnSelect.disabled=true;
    try{
      if(!authorized||!client)throw new Error('Sessão administrativa necessária.');
      try{
        const {data:buckets}=await client.storage.listBuckets();
        const hasDownloads=buckets&&buckets.some(b=>b.name==='downloads'||b.id==='downloads');
        if(!hasDownloads){await client.storage.createBucket('downloads',{public:true});}
      }catch(e){console.warn('Bucket check:',e);}
      const safeName=file.name.replace(/[^a-zA-Z0-9._-]/g,'_');
      const filePath=`releases/${Date.now()}_${safeName}`;
      const {data,error}=await client.storage.from('downloads').upload(filePath,file,{cacheControl:'3600',upsert:true});
      if(error){
        if(error.message&&(error.message.includes('row-level security')||error.message.includes('policy'))){
          throw new Error('Falta a política de permissão no Supabase Storage. Crie o bucket "downloads" como público no Supabase.');
        }
        throw error;
      }
      const {data:pubData}=client.storage.from('downloads').getPublicUrl(filePath);
      const publicUrl=pubData.publicUrl;
      let idToUpdate=loadedSettings?.id;
      if(!idToUpdate){
        const {data:sData}=await client.from('settings').select('id').single();
        if(sData)idToUpdate=sData.id;
      }
      if(idToUpdate){
        const {error:updErr}=await client.from('settings').update({download_url:publicUrl}).eq('id',idToUpdate);
        if(updErr)throw updErr;
      }
      loadedSettings={...loadedSettings,download_url:publicUrl};
      feedback.style.color='#059669';
      feedback.textContent=`✅ Arquivo "${file.name}" enviado com sucesso! Seus clientes já receberão este novo arquivo para download.`;
      toast('Novo arquivo salvo e configurado para entrega!');
      setTimeout(()=>render(),2000);
    }catch(err){
      feedback.style.color='#dc2626';
      feedback.textContent=`❌ ${err.message}`;
      toast('Não foi possível enviar: '+err.message,true);
    }finally{
      btnSelect.disabled=false;
    }
  };
  if($('settingsForm'))$('settingsForm').onsubmit=async e=>{
    e.preventDefault();
    const f=new FormData(e.target);
    const values=Object.fromEntries(f.entries());
    if(values.product_price!==undefined){
      values.product_price=Number(values.product_price);
    }
    if(values.download_url){
      if(!/^(https:\/\/[^\s]+|[a-zA-Z0-9_.\/-]+)$/.test(values.download_url)||values.download_url.startsWith('//')){
        toast('Use um arquivo local ou URL HTTPS válido.',true);
        return;
      }
    }
    const button=e.target.querySelector('button');
    button.disabled=true;
    try{
      if(!authorized||!client)throw new Error('Sem autorização.');
      let idToUpdate=loadedSettings?.id;
      if(!idToUpdate){
        const {data}=await client.from('settings').select('id').single();
        if(data)idToUpdate=data.id;
        else{
          const res=await client.from('settings').insert([values]).select('id').single();
          if(res.error)throw res.error;
          idToUpdate=res.data.id;
        }
      }
      if(idToUpdate){
        const {error}=await client.from('settings').update(values).eq('id',idToUpdate);
        if(error)throw error;
      }
      loadedSettings={...loadedSettings,...values};
      toast('Configurações salvas com sucesso!');
      render();
    }catch(err){
      toast('Não foi possível salvar: '+err.message,true);
    }finally{
      button.disabled=false;
    }
  };
}
function closeSidebar(){$('adminSidebar').classList.remove('open');$('sidebarBackdrop').hidden=true}
$('adminNav').innerHTML=Object.entries(routes).map(([id,label])=>`<button class="menu-item" data-route="${id}" title="${label}">${icon(id)}<span>${label}</span></button>`).join('');
document.querySelectorAll('[data-route]').forEach(b=>b.onclick=()=>navigate(b.dataset.route));
$('searchIcon').innerHTML=icon('search');
$('notificationsButton').innerHTML=icon('bell');
$('mobileToggle').innerHTML=icon('logs');
$('loginForm').onsubmit=login;
$('logoutButton').onclick=async()=>{
  try{if(client)await client.auth.signOut()}
  finally{
    authorized=false;
    orders=[];
    loadedSettings=null;
    selection.clear();
    routeVersion++;
    $('adminPanel').hidden=true;
    $('loginScreen').hidden=false;
    $('adminContent').innerHTML='';
    $('detailDialog').close();
  }
};
$('refreshButton').onclick=()=>{loadedSettings=null;navigate(tab)};
$('mobileToggle').onclick=()=>{
  $('adminSidebar').classList.toggle('open');
  $('sidebarBackdrop').hidden=!$('adminSidebar').classList.contains('open');
};
$('sidebarBackdrop').onclick=closeSidebar;
$('collapseSidebar').onclick=()=>$('adminPanel').classList.toggle('collapsed');
$('notificationsButton').onclick=()=>modal('<h2>Notificações</h2>'+empty('Você está em dia','Não há um serviço de notificações conectado neste projeto.'));
$('profileButton').onclick=()=>modal(`<h2>Seu perfil</h2><p class="dialog-sub">${esc(userEmail)}</p>${badge('Administrador')}<p class="dialog-sub">Acesso administrativo autenticado.</p>`);
$('globalSearch').oninput=e=>{
  const query=e.target.value.toLowerCase();
  document.querySelectorAll('[data-route]').forEach(b=>b.hidden=!routes[b.dataset.route].toLowerCase().includes(query));
};
$('globalSearch').onkeydown=e=>{
  if(e.key==='Enter'){
    const b=[...document.querySelectorAll('[data-route]')].find(b=>!b.hidden);
    if(b){
      navigate(b.dataset.route);
      e.target.value='';
      e.target.dispatchEvent(new Event('input'));
    }
  }
};
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key==='k'&&!$('adminPanel').hidden){
    e.preventDefault();
    $('globalSearch').focus();
  }
  if(e.key==='Escape')closeSidebar();
});
$('detailDialog').addEventListener('click',e=>{
  if(e.target===$('detailDialog')){
    const r=e.target.getBoundingClientRect();
    if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();
  }
});
if(client){
  client.auth.getUser().then(({data})=>{
    if(isAdmin(data?.user)){
      authorized=true;
      userEmail=data.user.email;
      showPanel();
    }
  }).catch(()=>{});
  client.auth.onAuthStateChange((event,session)=>{
    if(event==='SIGNED_OUT'||(session&&!isAdmin(session.user))){
      authorized=false;
      orders=[];
      loadedSettings=null;
      routeVersion++;
      $('adminPanel').hidden=true;
      $('loginScreen').hidden=false;
      $('adminContent').innerHTML='';
      $('detailDialog').close();
    }
  });
}
