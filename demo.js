// Modo demonstração: simula o Supabase na memória (nada é salvo).
// Ativa sozinho enquanto config.js estiver sem a URL real.
function demoClient(){
  const d=n=>new Date(Date.now()+n*864e5).toISOString();
  const day=n=>{const x=new Date(Date.now()+n*864e5);return x.getFullYear()+'-'+String(x.getMonth()+1).padStart(2,'0')+'-'+String(x.getDate()).padStart(2,'0')};
  const uid=()=>Math.random().toString(36).slice(2);
  const T={
    clientes:[{id:'c1',nome:'Atelier Maré',contato:'contato@atelier.com',notas:'Prefere entrega em galeria online.'},{id:'c2',nome:'Casa Alvorada',contato:'(83) 99999-0000',notas:''},{id:'c3',nome:'Studio Lume',contato:'lume@studio.com',notas:''}],
    sessoes:[
      {id:'s1',titulo:'Ensaio lookbook verão',data:d(2),cliente_id:'c1',local:'Praia do Bessa',status:'Agendada',valor:2800,custo:300,pago:1400},
      {id:'s2',titulo:'Retratos institucionais',data:d(5),cliente_id:'c2',local:'Estúdio',status:'Agendada',valor:1800,custo:120,pago:0},
      {id:'s3',titulo:'Ensaio gestante',data:d(-4),cliente_id:'c3',local:'Estúdio',status:'Entregue',valor:1200,custo:80,pago:600},
      {id:'s4',titulo:'Cobertura de evento',data:d(9),cliente_id:'c2',local:'Hotel Tambaú',status:'Orçamento',valor:3500,custo:0,pago:0},
      {id:'s5',titulo:'Ensaio de marca',data:d(-40),cliente_id:'c1',local:'Centro',status:'Entregue',valor:2200,custo:200,pago:2200},
      {id:'s6',titulo:'Retratos corporativos',data:d(-70),cliente_id:'c3',local:'Escritório',status:'Entregue',valor:1500,custo:100,pago:1500}],
    campanhas:[
      {id:'p1',titulo:'Campanha Verão 27',cliente_id:'c1',prazo:day(12),etapa:'Produção',valor:6500,custo:900,pago:3000,notas:''},
      {id:'p2',titulo:'Catálogo Alvorada',cliente_id:'c2',prazo:day(-2),etapa:'Edição',valor:4200,custo:500,pago:0,notas:''}],
    portfolio:[{id:'f1',titulo:'Maré Alta',categoria:'Moda',ano:2025,imagem_url:''},{id:'f2',titulo:'Luz de Domingo',categoria:'Retrato',ano:2024,imagem_url:''}],
    tarefas:[{id:'k1',titulo:'Enviar proposta Casa Alvorada',data:day(0),hora:'10:00',cliente_id:'c2',feito:false},{id:'k2',titulo:'Editar fotos do ensaio gestante',data:day(1),hora:'',cliente_id:'c3',feito:false},{id:'k3',titulo:'Comprar cartão de memória',data:day(-1),hora:'',feito:false},{id:'k4',titulo:'Revisar portfólio',data:day(3),hora:'14:00',feito:true}],
    despesas:[{id:'d1',descricao:'Lente 35mm',data:day(-3),categoria:'Equipamento',valor:2400},{id:'d2',descricao:'Anúncios Instagram',data:day(-10),categoria:'Marketing',valor:450},{id:'d3',descricao:'Adobe Creative Cloud',data:day(-12),categoria:'Software',valor:180}]
  };
  const user={id:'demo'}; let cb=()=>{};
  const from=t=>{
    let op='sel',body,id,col;
    const b={
      select(){op='sel';return b}, order(c){col=c;return b},
      insert(x){op='ins';body=x;return b}, update(x){op='upd';body=x;return b},
      delete(){op='del';return b}, eq(_,v){id=v;return b},
      then(ok,err){
        const r={data:null,error:null};
        if(op==='sel'){r.data=[...T[t]].sort((a,z)=>(a[col]==null)-(z[col]==null)||(a[col]>z[col]?1:-1));if(['portfolio','despesas'].includes(t))r.data.reverse()}
        if(op==='ins')T[t].push({id:uid(),...body});
        if(op==='upd')Object.assign(T[t].find(x=>x.id===id),body);
        if(op==='del')T[t]=T[t].filter(x=>x.id!==id);
        return Promise.resolve(r).then(ok,err);
      }
    };
    return b;
  };
  return {from,auth:{
    onAuthStateChange(fn){cb=fn;setTimeout(()=>fn('SIGNED_IN',{user}),0);return{data:{subscription:{}}}},
    signOut(){cb('SIGNED_OUT',null);return Promise.resolve({})},
    signInWithPassword(){setTimeout(()=>cb('SIGNED_IN',{user}),0);return Promise.resolve({data:{session:{}}})},
    signUp(){setTimeout(()=>cb('SIGNED_IN',{user}),0);return Promise.resolve({data:{session:{}}})}
  }};
}
