export async function report(state,task='',options={}){
 const url=options.url||process.env.CAT_OFFICE_URL||'http://127.0.0.1:8770';
 const credential=process.env.CAT_OFFICE_TOKEN;
 const response=await fetch(url.replace(/\/$/,'')+'/api/status',{method:'POST',signal:AbortSignal.timeout(5000),headers:{'Content-Type':'application/json',...(credential?{Authorization:`Bearer ${credential}`}:{})},body:JSON.stringify({id:options.id||process.env.CAT_ID||'coder',name:options.name||process.env.CAT_NAME||options.id||process.env.CAT_ID||'coder',state,task})});
 if(!response.ok)throw Error(`Office returned ${response.status}`);return response.json();
}
