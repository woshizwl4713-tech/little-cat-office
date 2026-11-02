import {spawn} from 'node:child_process';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import net from 'node:net';
import {once} from 'node:events';
export async function isolatedOffice(){
 const dir=await mkdtemp(join(tmpdir(),'office-test-'));
 const listener=net.createServer();listener.listen(0,'127.0.0.1');await once(listener,'listening');const port=listener.address().port;await new Promise(r=>listener.close(r));
 const server=spawn('python3',['server/server.py','--port',String(port),'--data-dir',dir],{stdio:'ignore'});
 const stop=async()=>{if(server.exitCode===null){const ended=once(server,'exit');server.kill();await ended;}await rm(dir,{recursive:true,force:true});};
 const url=`http://127.0.0.1:${port}`;
 try{for(let i=0;i<100;i++){if(server.exitCode!==null)throw Error('Test server exited');try{if((await fetch(url+'/api/health')).ok)return {url,stop};}catch{}await new Promise(r=>setTimeout(r,100));}throw Error('Test server timeout');}catch(e){await stop();throw e;}
}
