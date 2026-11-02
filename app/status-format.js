export function normalizeStatus(input,{now=Date.now(),offlineAfterMs=1800000,staleBecomes='idle',roster}={}){
 if(!input||!Array.isArray(input.agents))throw Error('状态源必须包含 agents 数组');
 const seen=new Set();
 let agents=input.agents.map(a=>{
  if(!a||typeof a.id!=='string'||!a.id.trim()||seen.has(a.id))throw Error('成员 ID 缺失或重复');seen.add(a.id);
  let state=a.state??a.status??'idle',stale=Boolean(a.stale);
  if(!['working','thinking','meeting','idle','need_you','error','offline'].includes(state))state='idle';
  if(a.updatedAt!==undefined){const date=Date.parse(a.updatedAt);if(!Number.isFinite(date))throw Error('无效更新时间');if(now-date>offlineAfterMs&&state!=='offline'){state=staleBecomes==='offline'?'offline':'idle';stale=true;}}
  return {...a,name:typeof a.name==='string'?a.name:a.id,role:typeof a.role==='string'?a.role:'伙伴',task:typeof a.task==='string'?a.task:'',state,status:state==='meeting'?'working':state,stale};
 });
 if(Array.isArray(roster)){
  const ids=new Set();agents=roster.map(entry=>{
   if(!entry||typeof entry.id!=='string'||!entry.id.trim()||ids.has(entry.id))throw Error('名册 ID 缺失或重复');ids.add(entry.id);
   const found=agents.find(a=>a.id===entry.id);
   return {...(found||{id:entry.id,state:'idle',status:'idle',role:'伙伴',task:'还没接到任务，先坐好～',rosterPending:true}),name:entry.name||found?.name||entry.id,avatar:entry.avatar||found?.avatar||'cat-grey',role:entry.role||found?.role||'employee'};
  });
 }
 if(agents.filter(a=>a.role==='lead').length>1)throw Error('只能有一只领导猫');
 return {agents,assignments:Array.isArray(input.assignments)?input.assignments.filter(e=>e&&typeof e.id==='string'&&typeof e.agentId==='string'&&typeof e.leaderId==='string'&&['pending','completed','cancelled'].includes(e.status)):[],activity:Array.isArray(input.activity)?input.activity:[]};
}
