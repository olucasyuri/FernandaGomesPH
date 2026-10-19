const DEMO = !/^https?:\/\//.test(SUPABASE_URL);
const sb = DEMO ? demoClient() : supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const MONEY=[['valor','Valor cobrado (R$)','number'],['custo','Custos do trabalho (R$)','number'],['pago','Já recebido (R$)','number']];
const E = {
  sessoes:  {label:'Agenda',n:'Nova',um:'sessão',order:'data',f:[['titulo','Título','text'],['data','Data e hora','datetime-local'],['cliente_id','Cliente','rel'],['local','Local','text'],['status','Status','select',['Agendada','Orçamento','Em edição','Entregue','Cancelada']],...MONEY]},
  clientes: {label:'Clientes',n:'Novo',um:'cliente',order:'nome',f:[['nome','Nome','text'],['contato','Contato','text'],['notas','Notas','textarea']]},
  campanhas:{label:'Campanhas',n:'Nova',um:'campanha',order:'prazo',f:[['titulo','Título','text'],['cliente_id','Cliente','rel'],['prazo','Prazo','date'],['etapa','Etapa','select',['Briefing','Produção','Edição','Aprovação','Concluída']],...MONEY,['notas','Notas','textarea']]},
  portfolio:{label:'Portfólio',n:'Novo',um:'trabalho',order:'ano',f:[['titulo','Título','text'],['categoria','Categoria','text'],['ano','Ano','number'],['imagem_url','Link da imagem','text']]},
  despesas: {label:'Despesas',n:'Nova',um:'despesa',order:'data',f:[['descricao','Descrição','text'],['data','Data','date'],['categoria','Categoria','select',['Equipamento','Marketing','Software','Deslocamento','Impostos','Outros']],['valor','Valor (R$)','number']]},
  tarefas:  {label:'Tarefas',n:'Nova',um:'tarefa',order:'data',f:[['titulo','O que fazer','text'],['data','Dia','date'],['hora','Horário (opcional)','time'],['cliente_id','Cliente (opcional)','rel'],['notas','Notas','textarea']]}
};
const TABS=[['hoje','Painel'],['sessoes','Agenda'],['clientes','Clientes'],['campanhas','Campanhas'],['portfolio','Portfólio'],['financeiro','Financeiro']];
let view='hoje', db={clientes:[],sessoes:[],campanhas:[],portfolio:[],despesas:[],tarefas:[]}, cal={mode:'semana',ref:new Date()}, editing=null, user=null, warned=false;
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=d=>!d?'':d.length===10?new Date(d+'T00:00').toLocaleDateString('pt-BR'):new Date(d).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'});
const brl=n=>(+n||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const nome=id=>(db.clientes.find(c=>c.id===id)||{}).nome||'';
const sum=(a,k)=>a.reduce((s,x)=>s+(+x[k]||0),0);
const mk=d=>{const x=d instanceof Date?d:new Date(d.length===10?d+'T00:00':d);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')};
const CHIP={Entregue:'bg-[#e4eddc] text-[#3d5a2a]',Concluída:'bg-[#e4eddc] text-[#3d5a2a]',Orçamento:'bg-[#f6e8c8] text-[#7a5a14]',Cancelada:'bg-line text-muted'};
const chip=s=>s?`<span class="text-xs px-2 py-0.5 rounded-full ${CHIP[s]||'bg-[#ebe4d8]'}">${esc(s)}</span>`:'';

async function load(){
  for(const t of Object.keys(E)){
    const {data,error}=await sb.from(t).select('*').order(E[t].order,{ascending:!['portfolio','despesas'].includes(t),nullsFirst:false});
    if(error&&!warned){warned=true;alert('Erro ao carregar "'+t+'": '+error.message+'\nVocê rodou o schema_v2.sql e o schema_v3.sql?')}
    db[t]=data||[];
  }
  render();
}

/* ---------- cálculos de gestão ---------- */
const jobs=()=>[
  ...db.sessoes.filter(s=>!['Cancelada','Orçamento'].includes(s.status)).map(s=>({titulo:s.titulo,cli:s.cliente_id,data:s.data,valor:+s.valor||0,custo:+s.custo||0,pago:+s.pago||0,feito:s.status==='Entregue'})),
  ...db.campanhas.map(c=>({titulo:c.titulo,cli:c.cliente_id,data:c.prazo,valor:+c.valor||0,custo:+c.custo||0,pago:+c.pago||0,feito:c.etapa==='Concluída'}))
];
function monthStats(m){
  const j=jobs().filter(x=>x.data&&mk(x.data)===m), d=db.despesas.filter(x=>x.data&&mk(x.data)===m);
  const fat=sum(j,'valor'), rec=sum(j,'pago'), cus=sum(j,'custo')+sum(d,'valor');
  return {fat,rec,cus,lucro:fat-cus,margem:fat?(fat-cus)/fat*100:0};
}
const kpi=(l,v,sub,hl)=>`<div class="bg-[#fffdf9] border border-line rounded-xl p-5"><div class="text-xs uppercase tracking-wide text-muted">${l}</div><div class="font-serif text-3xl mt-1 ${hl?'text-accent':''}">${v}</div><div class="text-xs text-muted mt-1">${sub}</div></div>`;
const blk=(t,items,empty,cls='')=>`<section class="bg-[#fffdf9] border border-line rounded-xl p-5 ${cls}"><h2 class="font-serif text-xl mb-3">${t}</h2>${items.length?items.join(''):`<p class="text-muted text-sm">${empty}</p>`}</section>`;
const line=(a,b)=>`<div class="flex justify-between gap-3 py-2.5 border-t border-line first:border-0 text-sm"><span>${esc(a)}</span><span class="text-muted shrink-0">${esc(b)}</span></div>`;

/* ---------- telas ---------- */
function render(){
  if(!user) return login();
  $('#app').innerHTML=`${DEMO?`<div class="bg-accent/10 text-accent text-sm rounded-md px-4 py-2 mb-6">Modo demonstração: os dados não são salvos. Configure o <b>config.js</b> para usar o Supabase.</div>`:''}
  <header class="flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5 mb-8">
    <h1 class="leading-none"><span class="font-serif text-2xl tracking-wide">Fernanda Gomes</span><span class="block mt-1.5 text-[10px] uppercase tracking-[.4em] text-muted">Fotografia</span></h1>
    <nav class="flex gap-1 overflow-x-auto text-sm">${TABS.map(([k,l])=>`<button onclick="go('${k}')" class="px-3 py-1.5 rounded-full ${view===k?'bg-ink text-paper':'text-muted hover:text-ink'}">${l}</button>`).join('')}
    <button onclick="sb.auth.signOut()" class="px-3 py-1.5 text-muted hover:text-accent">Sair</button></nav>
  </header>
  ${view==='hoje'?hoje():view==='financeiro'?fin()+'<div class="mt-10">'+lista('despesas')+'</div>':lista(view)}`;
}
const go=v=>{view=v;render()};

function hoje(){
  const now=new Date(), lim=new Date(+now+7*864e5), m=monthStats(mk(now)), J=jobs();
  const ativas=db.sessoes.filter(s=>s.data&&s.status!=='Cancelada').sort((a,b)=>new Date(a.data)-new Date(b.data));
  const prox=ativas.filter(s=>new Date(s.data)>=now&&new Date(s.data)<=lim&&s.status!=='Orçamento');
  const A=[], R='bg-accent', Y='bg-[#c9a227]', G='bg-muted';
  const fut=ativas.filter(s=>new Date(s.data)>=now&&s.status!=='Orçamento');
  for(let i=1;i<fut.length;i++) if(new Date(fut[i].data)-new Date(fut[i-1].data)<3*36e5) A.push([R,`Conflito de horário: “${fut[i-1].titulo}” e “${fut[i].titulo}” (${fmt(fut[i].data)})`]);
  db.campanhas.filter(c=>c.prazo&&c.etapa!=='Concluída'&&new Date(c.prazo+'T23:59')<now).forEach(c=>A.push([R,`Campanha atrasada: ${c.titulo} (prazo ${fmt(c.prazo)})`]));
  J.filter(x=>x.feito&&x.valor>x.pago).forEach(x=>A.push([Y,`Cobrar ${nome(x.cli)||'cliente'}: ${brl(x.valor-x.pago)} de “${x.titulo}”, já entregue`]));
  const orc=db.sessoes.filter(s=>s.status==='Orçamento');
  if(orc.length) A.push([Y,`${orc.length} orçamento(s) aguardando resposta: ${brl(sum(orc,'valor'))} em potencial`]);
  ativas.filter(s=>new Date(s.data)<now&&s.status==='Agendada').forEach(s=>A.push([G,`Atualize o status de “${s.titulo}”: a data já passou`]));
  db.tarefas.filter(t=>!t.feito&&t.data&&t.data<dk(now)).forEach(t=>A.push([R,`Tarefa atrasada: ${t.titulo} (${fmt(t.data)})`]));
  const alerta=A.map(([c,t])=>`<div class="flex gap-3 py-2.5 border-t border-line first:border-0 text-sm"><span class="mt-1.5 w-2 h-2 rounded-full shrink-0 ${c}"></span><span>${esc(t)}</span></div>`);
  const pr=db.campanhas.filter(c=>c.prazo&&c.etapa!=='Concluída').sort((a,b)=>a.prazo>b.prazo?1:-1).slice(0,5);
  return `<div class="mb-6"><p class="text-sm text-muted capitalize">${now.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})}</p><h2 class="font-serif text-3xl">Seu painel</h2></div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    ${kpi('Faturado no mês',brl(m.fat),brl(m.rec)+' já recebido')}
    ${kpi('A receber',brl(sum(J,'valor')-sum(J,'pago')),'em aberto, todos os meses')}
    ${kpi('Lucro no mês',brl(m.lucro),'margem de '+m.margem.toFixed(0)+'%',1)}
    ${kpi('Sessões na semana',prox.length,'próximos 7 dias')}
  </div>
  ${calendario()}
  <div class="grid md:grid-cols-2 gap-4">
    ${blk('Pede atenção',alerta,'Tudo em dia por aqui.')}
    ${blk('Prazos de campanhas',pr.map(c=>line(c.titulo,fmt(c.prazo)+' · '+c.etapa)),'Sem campanhas em aberto.')}
  </div>`;
}

function fin(){
  const now=new Date(), M=[], J=jobs();
  for(let i=5;i>=0;i--){const d=new Date(now.getFullYear(),now.getMonth()-i,1);M.push({l:d.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),...monthStats(mk(d))})}
  const cur=M[5], max=Math.max(...M.map(x=>x.fat),1);
  const bars=M.map(x=>`<div class="flex-1 text-center text-xs"><div class="h-32 flex items-end justify-center gap-1"><div title="Faturado" class="w-4 bg-ink rounded-t" style="height:${x.fat/max*100}%"></div><div title="Lucro" class="w-4 bg-accent rounded-t" style="height:${Math.max(x.lucro,0)/max*100}%"></div></div><div class="mt-2 text-muted capitalize">${x.l}</div><div class="${x.lucro<0?'text-accent':''}">${x.lucro.toLocaleString('pt-BR',{maximumFractionDigits:0})}</div></div>`).join('');
  const rec=J.filter(x=>x.valor>x.pago).sort((a,b)=>(a.data||'')>(b.data||'')?1:-1).map(x=>line((nome(x.cli)||'Sem cliente')+' · '+x.titulo,brl(x.valor-x.pago)));
  const byC={}; J.forEach(x=>{const n=nome(x.cli)||'Sem cliente';byC[n]=(byC[n]||0)+x.valor});
  const tot=sum(J,'valor')||1, top=Object.entries(byC).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([n,v])=>`<div class="py-2 text-sm"><div class="flex justify-between"><span>${esc(n)}</span><span class="text-muted">${brl(v)} · ${(v/tot*100).toFixed(0)}%</span></div><div class="h-1.5 bg-line rounded mt-1.5"><div class="h-1.5 bg-accent rounded" style="width:${v/tot*100}%"></div></div></div>`);
  return `<div class="mb-6"><h2 class="font-serif text-3xl">Financeiro</h2><p class="text-sm text-muted">Lucro = valor cobrado − custos dos trabalhos − despesas do estúdio.</p></div>
  <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
    ${kpi('Faturado no mês',brl(cur.fat),brl(cur.rec)+' já recebido')}${kpi('Custos e despesas',brl(cur.cus),'no mês')}
    ${kpi('Lucro no mês',brl(cur.lucro),'margem de '+cur.margem.toFixed(0)+'%',1)}${kpi('A receber',brl(sum(J,'valor')-sum(J,'pago')),'em aberto')}
  </div>
  <div class="grid md:grid-cols-2 gap-4">
    <section class="bg-[#fffdf9] border border-line rounded-xl p-5"><h2 class="font-serif text-xl mb-1">Últimos 6 meses</h2><p class="text-xs text-muted mb-4"><span class="inline-block w-2 h-2 bg-ink mr-1"></span>Faturado <span class="inline-block w-2 h-2 bg-accent ml-3 mr-1"></span>Lucro (R$ abaixo)</p><div class="flex gap-2">${bars}</div></section>
    ${blk('Clientes que mais geram receita',top,'Cadastre valores nas sessões e campanhas.')}
    ${blk('Cobranças em aberto',rec,'Nada a receber.','md:col-span-2')}
  </div>`;
}

function lista(t){
  const c=E[t], rows=db[t], skip=['valor','custo','pago','status','etapa'];
  const head=`<div class="flex items-center justify-between mb-5"><h2 class="font-serif text-2xl">${c.label}</h2>
    <button onclick="abrir('${t}')" class="bg-accent text-white text-sm font-medium px-4 py-2.5 rounded-lg hover:opacity-90">+ ${c.n} ${c.um}</button></div>`;
  if(!rows.length) return head+`<p class="text-muted">Nada por aqui ainda.</p>`;
  const acts=r=>`<div class="text-xs text-muted shrink-0"><button onclick="abrir('${t}','${r.id}')" class="hover:text-ink">editar</button> · <button onclick="apagar('${t}','${r.id}')" class="hover:text-accent">excluir</button></div>`;
  if(t==='portfolio') return head+`<div class="grid grid-cols-2 md:grid-cols-3 gap-4">${rows.map(r=>`<figure class="bg-[#fffdf9] border border-line rounded-xl overflow-hidden">
    ${r.imagem_url?`<img src="${esc(r.imagem_url)}" alt="" class="aspect-[4/3] w-full object-cover">`:`<div class="aspect-[4/3] bg-line"></div>`}
    <figcaption class="p-3 flex justify-between gap-2"><div><div class="font-medium text-sm">${esc(r.titulo)}</div><div class="text-xs text-muted">${esc([r.categoria,r.ano].filter(Boolean).join(' · '))}</div></div>${acts(r)}</figcaption></figure>`).join('')}</div>`;
  const money=r=>{
    if(t==='despesas') return `<div class="font-medium">${brl(r.valor)}</div>`;
    if(r.valor==null) return '';
    const f=(+r.valor||0)-(+r.pago||0);
    return `<div class="text-right"><div class="font-medium">${brl(r.valor)}</div>${f>0?`<div class="text-xs text-accent">falta ${brl(f)}</div>`:'<div class="text-xs text-muted">quitado</div>'}</div>`;
  };
  return head+`<div class="bg-[#fffdf9] border border-line rounded-xl divide-y divide-line">${rows.map(r=>{
    const sub=c.f.slice(1).filter(([k])=>!skip.includes(k)).map(([k,,ty])=>{let v=r[k];if(!v)return'';if(ty==='rel')v=nome(v);else if(ty.startsWith('date'))v=fmt(v);return esc(v)}).filter(Boolean).join(' · ');
    return `<div class="flex justify-between items-center gap-5 px-5 py-4"><div class="min-w-0 flex-1"><div class="font-medium">${esc(r[c.f[0][0]])} ${chip(r.status||r.etapa)}</div><div class="text-sm text-muted mt-0.5">${sub}</div></div>${money(r)}${acts(r)}</div>`}).join('')}</div>`;
}

/* ---------- formulário ---------- */
function abrir(t,id,pre){
  const c=E[t]; editing={t,id}; const r=id?db[t].find(x=>x.id===id):(pre||{});
  const input=([k,l,ty,opts],i)=>{
    let v=r[k]??'', el;
    if(ty==='datetime-local'&&v){const d=new Date(v);v=new Date(d-d.getTimezoneOffset()*6e4).toISOString().slice(0,16)}
    if(ty==='select') el=`<select name="${k}" class="inp">${opts.map(o=>`<option ${o===v?'selected':''}>${o}</option>`).join('')}</select>`;
    else if(ty==='rel') el=`<select name="${k}" class="inp"><option value="">Sem cliente</option>${db.clientes.map(x=>`<option value="${x.id}" ${x.id===v?'selected':''}>${esc(x.nome)}</option>`).join('')}</select>`;
    else if(ty==='textarea') el=`<textarea name="${k}" rows="3" class="inp">${esc(v)}</textarea>`;
    else el=`<input name="${k}" type="${ty}" value="${esc(v)}" ${ty==='number'?'step="any" placeholder="0,00"':''} class="inp" ${i===0?'required':''}>`;
    const span=i===0||ty==='textarea'||ty==='rel'?'sm:col-span-2':'';
    return `<label class="block ${span}"><span class="lbl">${l}</span>${el}</label>`;
  };
  $('#dlg').innerHTML=`<form onsubmit="salvar(event)">
    <div class="flex items-center justify-between px-8 pt-7 pb-5 border-b border-line"><h3 class="font-serif text-2xl">${id?'Editar':c.n} ${c.um}</h3><button type="button" onclick="dlg.close()" class="text-muted hover:text-ink text-2xl leading-none" aria-label="Fechar">×</button></div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5 px-8 py-6">${c.f.map(input).join('')}</div>
    <div class="flex justify-end gap-3 px-8 py-5 border-t border-line bg-[#efe9df]"><button type="button" onclick="dlg.close()" class="px-5 py-2.5 text-sm text-muted hover:text-ink">Cancelar</button><button class="bg-accent text-white text-sm font-medium px-6 py-2.5 rounded-lg hover:opacity-90">Salvar</button></div></form>`;
  $('#dlg').showModal();
}
async function salvar(e){
  e.preventDefault(); const {t,id}=editing, body={}, fd=new FormData(e.target);
  for(const [k,,ty] of E[t].f){
    let v=fd.get(k); if(v===''||v===null){body[k]=null;continue}
    if(ty==='datetime-local') v=new Date(v).toISOString(); if(ty==='number') v=+v; body[k]=v;
  }
  const {error}=await (id?sb.from(t).update(body).eq('id',id):sb.from(t).insert(body)); if(error) return alert(error.message);
  $('#dlg').close(); load();
}
async function apagar(t,id){ if(!confirm('Excluir este item?'))return; await sb.from(t).delete().eq('id',id); load(); }

/* ---------- calendário ---------- */
const pad=n=>String(n).padStart(2,'0');
const dk=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const DIAS=['seg','ter','qua','qui','sex','sáb','dom'];
const EVC={s:'bg-accent/10 border-accent',p:'bg-ink/10 border-ink',t:'bg-[#ebe4d8] border-muted'};
const EVT={s:'sessoes',p:'campanhas',t:'tarefas'};
function evs(key){
  const L=[];
  db.sessoes.forEach(s=>{if(s.data&&s.status!=='Cancelada'){const d=new Date(s.data);if(dk(d)===key)L.push({k:'s',id:s.id,h:pad(d.getHours())+':'+pad(d.getMinutes()),x:s.titulo+(nome(s.cliente_id)?' · '+nome(s.cliente_id):'')})}});
  db.campanhas.forEach(c=>{if(c.prazo===key&&c.etapa!=='Concluída')L.push({k:'p',id:c.id,h:'',x:'Prazo: '+c.titulo})});
  db.tarefas.forEach(t=>{if(t.data===key)L.push({k:'t',id:t.id,h:t.hora||'',x:t.titulo,done:t.feito})});
  return L.sort((a,b)=>a.h>b.h?1:a.h<b.h?-1:0);
}
const evFull=e=>e.k==='t'
  ? `<div class="flex gap-1.5 items-start rounded-md px-2 py-1.5 text-xs border-l-2 ${EVC.t}"><input type="checkbox" ${e.done?'checked':''} onchange="tog('${e.id}')" class="mt-0.5 accent-[#b4532a]"><button onclick="abrir('tarefas','${e.id}')" class="text-left ${e.done?'line-through opacity-60':''}">${e.h?`<b>${e.h}</b> `:''}${esc(e.x)}</button></div>`
  : `<button onclick="abrir('${EVT[e.k]}','${e.id}')" class="block w-full text-left rounded-md px-2 py-1.5 text-xs border-l-2 ${EVC[e.k]}">${e.h?`<b>${e.h}</b> `:''}${esc(e.x)}</button>`;
const evMini=e=>`<button onclick="abrir('${EVT[e.k]}','${e.id}')" class="block w-full truncate text-left text-[11px] rounded px-1 py-0.5 ${EVC[e.k].split(' ')[0]} ${e.done?'line-through opacity-60':''}">${e.h?e.h+' ':''}${esc(e.x)}</button>`;

function calendario(){
  const ref=cal.ref, hojeK=dk(new Date());
  const ini=new Date(ref.getFullYear(),ref.getMonth(),ref.getDate()-((ref.getDay()+6)%7));
  let titulo, corpo;
  if(cal.mode==='semana'){
    const fim=new Date(ini.getFullYear(),ini.getMonth(),ini.getDate()+6);
    titulo=`${ini.getDate()} ${MESES[ini.getMonth()].slice(0,3)} – ${fim.getDate()} ${MESES[fim.getMonth()].slice(0,3)}`;
    corpo=`<div class="grid grid-cols-1 md:grid-cols-7 gap-2">${[...Array(7)].map((_,i)=>{
      const d=new Date(ini.getFullYear(),ini.getMonth(),ini.getDate()+i), k=dk(d), hj=k===hojeK;
      return `<div class="bg-paper/60 border ${hj?'border-accent':'border-line'} rounded-lg p-2 md:min-h-[12rem]">
        <div class="flex items-center justify-between mb-2"><div class="flex items-center gap-1.5"><span class="text-xs uppercase text-muted">${DIAS[i]}</span><span class="${hj?'bg-accent text-white':''} rounded-full min-w-[1.6rem] text-center font-serif text-lg">${d.getDate()}</span></div>
        <button onclick="abrir('tarefas',null,{data:'${k}'})" class="text-muted hover:text-accent text-lg leading-none" title="Nova tarefa neste dia">+</button></div>
        <div class="space-y-1">${evs(k).map(evFull).join('')}</div></div>`}).join('')}</div>`;
  } else {
    const a=new Date(ref.getFullYear(),ref.getMonth(),1), s=new Date(a.getFullYear(),a.getMonth(),1-((a.getDay()+6)%7));
    titulo=MESES[ref.getMonth()]+' de '+ref.getFullYear();
    corpo=`<div class="grid grid-cols-7 gap-1 mb-1 text-xs uppercase text-muted text-center">${DIAS.map(x=>`<div>${x}</div>`).join('')}</div>
      <div class="grid grid-cols-7 gap-1">${[...Array(42)].map((_,i)=>{
        const d=new Date(s.getFullYear(),s.getMonth(),s.getDate()+i), k=dk(d), L=evs(k), fora=d.getMonth()!==ref.getMonth(), hj=k===hojeK;
        return `<div class="bg-paper/60 border ${hj?'border-accent':'border-line'} rounded-md p-1 min-h-[5.5rem] ${fora?'opacity-40':''}">
          <button onclick="calGo('${k}')" class="text-xs mb-1 ${hj?'bg-accent text-white rounded-full px-1.5':'text-muted'}">${d.getDate()}</button>
          <div class="space-y-0.5">${L.slice(0,3).map(evMini).join('')}${L.length>3?`<div class="text-[11px] text-muted px-1">+${L.length-3} mais</div>`:''}</div></div>`}).join('')}</div>`;
  }
  const btn='px-2.5 py-1.5 rounded-md border border-line hover:bg-line text-sm';
  return `<section class="bg-[#fffdf9] border border-line rounded-xl p-5 mb-6">
   <div class="flex flex-wrap items-center gap-2 mb-4">
     <button onclick="calNav(-1)" class="${btn}" aria-label="Anterior">‹</button><button onclick="calNav(1)" class="${btn}" aria-label="Próximo">›</button>
     <button onclick="calHoje()" class="${btn}">Hoje</button>
     <h2 class="font-serif text-xl mx-2 capitalize">${titulo}</h2>
     <select onchange="calJump(+this.value,cal.ref.getFullYear())" class="inp !w-auto !py-1.5 capitalize">${MESES.map((m,i)=>`<option value="${i}" ${i===ref.getMonth()?'selected':''}>${m}</option>`).join('')}</select>
     <input type="number" value="${ref.getFullYear()}" onchange="calJump(cal.ref.getMonth(),+this.value)" class="inp !w-24 !py-1.5" aria-label="Ano">
     <div class="ml-auto flex flex-wrap gap-2">
       <div class="flex rounded-md border border-line overflow-hidden text-sm">${[['semana','Semana'],['mes','Mês']].map(([m,l])=>`<button onclick="calMode('${m}')" class="px-3 py-1.5 ${cal.mode===m?'bg-ink text-paper':''}">${l}</button>`).join('')}</div>
       <button onclick="abrir('tarefas')" class="${btn}">+ Tarefa</button>
       <button onclick="abrir('sessoes')" class="bg-accent text-white text-sm px-3 py-1.5 rounded-md">+ Sessão</button></div></div>
   ${corpo}
   <p class="text-xs text-muted mt-4 flex gap-4"><span><i class="inline-block w-3 h-3 border-l-2 ${EVC.s} mr-1 align-middle"></i>Sessões</span><span><i class="inline-block w-3 h-3 border-l-2 ${EVC.p} mr-1 align-middle"></i>Prazos de campanhas</span><span><i class="inline-block w-3 h-3 border-l-2 ${EVC.t} mr-1 align-middle"></i>Tarefas</span></p>
  </section>`;
}
const calNav=n=>{const r=cal.ref;cal.ref=cal.mode==='semana'?new Date(r.getFullYear(),r.getMonth(),r.getDate()+7*n):new Date(r.getFullYear(),r.getMonth()+n,1);render()};
const calHoje=()=>{cal.ref=new Date();render()};
const calJump=(m,y)=>{if(y>1900&&y<2200){cal.ref=new Date(y,m,1);render()}};
const calMode=m=>{cal.mode=m;render()};
const calGo=k=>{cal.ref=new Date(k+'T00:00');cal.mode='semana';render()};
async function tog(id){const t=db.tarefas.find(x=>x.id===id);t.feito=!t.feito;render();await sb.from('tarefas').update({feito:t.feito}).eq('id',id)}

/* ---------- login ---------- */
let authMode='login', pendingEmail='';
const setAuth=m=>{authMode=m;render()};
const msg=t=>{const e=$('#msg');if(e)e.textContent=t};
const erroPt=m=>({'Invalid login credentials':'E-mail ou senha incorretos.','User already registered':'Este e-mail já possui cadastro.','Email not confirmed':'Confirme seu e-mail antes de entrar.','Signup requires a valid password':'Informe uma senha válida.'}[m]||m);
const BTN='w-full bg-ink text-paper py-3.5 text-xs uppercase tracking-[.3em] hover:bg-accent transition-colors';
function login(){
  const shell=body=>`<div class="min-h-[85vh] flex items-center justify-center text-center"><div class="w-full max-w-xs">
    <h1 class="font-serif text-4xl tracking-wide">Fernanda Gomes</h1>
    <p class="mt-3 text-[11px] uppercase tracking-[.45em] text-muted">Fotografia</p>
    <div class="w-8 h-px bg-accent mx-auto my-10"></div>${body}</div></div>`;
  let body;
  if(authMode==='check') body=`<p class="font-serif text-xl mb-3">Quase lá</p>
    <p class="text-sm text-muted leading-relaxed mb-8">Enviamos um link de confirmação para <b class="text-ink">${esc(pendingEmail)}</b>. Confirme o e-mail e depois faça o login.</p>
    <button onclick="setAuth('login')" class="text-xs uppercase tracking-[.3em] border-b border-ink pb-1">Voltar ao login</button>`;
  else if(authMode==='signup') body=`<p class="text-[11px] uppercase tracking-[.3em] text-muted mb-8">Criar conta</p>
    <form onsubmit="event.preventDefault();cadastrar()" class="text-left">
      <input id="nm" type="text" placeholder="Nome" autocomplete="name" class="uline mb-6" required>
      <input id="em" type="email" placeholder="E-mail" autocomplete="email" class="uline mb-6" required>
      <input id="pw" type="password" placeholder="Senha (mín. 6 caracteres)" autocomplete="new-password" class="uline mb-6" required>
      <input id="pw2" type="password" placeholder="Confirmar senha" autocomplete="new-password" class="uline mb-6" required>
      <p id="msg" class="text-xs text-accent min-h-[1.25rem] mb-3"></p>
      <button class="${BTN}">Criar conta</button>
    </form>
    <button onclick="setAuth('login')" class="mt-6 text-xs text-muted hover:text-ink">Já tenho conta</button>`;
  else body=`<form onsubmit="event.preventDefault();entrar()" class="text-left">
      <input id="em" type="email" placeholder="E-mail" autocomplete="username" class="uline mb-6">
      <input id="pw" type="password" placeholder="Senha" autocomplete="current-password" class="uline mb-6">
      <p id="msg" class="text-xs text-accent min-h-[1.25rem] mb-3"></p>
      <button class="${BTN}">Entrar</button>
    </form>
    <button onclick="setAuth('signup')" class="mt-6 text-xs text-muted hover:text-ink">Criar conta</button>`;
  $('#app').innerHTML=shell(body);
}
async function entrar(){
  const {error}=await sb.auth.signInWithPassword({email:$('#em').value.trim(),password:$('#pw').value});
  if(error) msg(erroPt(error.message));
}
async function cadastrar(){
  const nome=$('#nm').value.trim(), email=$('#em').value.trim(), pw=$('#pw').value;
  if(pw.length<6) return msg('A senha precisa ter ao menos 6 caracteres.');
  if(pw!==$('#pw2').value) return msg('As senhas não coincidem.');
  const {data,error}=await sb.auth.signUp({email,password:pw,options:{data:{nome}}});
  if(error) return msg(erroPt(error.message));
  if(!data.session){pendingEmail=email;setAuth('check')}
}
sb.auth.onAuthStateChange((_,s)=>{user=s?.user||null; user?load():render()});
