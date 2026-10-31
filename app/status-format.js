export function normalizeStatus(input,{now=Date.now(),offlineAfterMs=300000}={}){
 if(!input||!Array.isArray(input.agents))throw Error('状态源必须包含 agents 数组');
 const seen=new Set();
 const agents=input.agents.map(a=>{
  if(!a||typeof a.id!=='string'||!a.id.trim()||seen.has(a.id))throw Error('成员 ID 缺失或重复');seen.add(a.id);
  let state=a.state??a.status??'idle';
  if(!['working','thinking','meeting','idle','need_you','error','offline'].includes(state))state='idle';
  if(a.updatedAt!==undefined){const date=Date.parse(a.updatedAt);if(!Number.isFinite(date))throw Error('无效更新时间');if(now-date>offlineAfterMs)state='offline';}
  return {...a,name:typeof a.name==='string'?a.name:a.id,role:typeof a.role==='string'?a.role:'伙伴',task:typeof a.task==='string'?a.task:'',state,status:state==='meeting'?'working':state};
 });
 return {agents,activity:Array.isArray(input.activity)?input.activity:[]};
}
