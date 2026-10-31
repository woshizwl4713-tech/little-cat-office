import { normalizeStatus } from './status-format.js';
import * as THREE from './vendor/three.module.min.js';
import { mergeGeometries } from './vendor/BufferGeometryUtils.js';


const DEFAULT_CONFIG={brand:{title:'一团小伦子',subtitle:'AI 办公室',tagline:'一点灵感，一群小猫，一起把事情做好。',avatarText:'伦',eyebrow:'THE LITTLE LUN OFFICE',officeHeadline:'今天，也在认真营业',wallSign:'一团小伦子',wallTagline:'MAKE LITTLE THINGS GREAT',iconText:'猫'},office:{name:'小猫办公室'},statusUrl:'./status.json',pollIntervalMs:5000,locale:'zh-CN'};
function mergeConfig(base,over){const out={...base,...(over||{})};out.brand={...base.brand,...((over&&over.brand)||{})};out.office={...base.office,...((over&&over.office)||{})};return out}
let CONFIG=DEFAULT_CONFIG;
try{const cfgRes=await fetch('./config.json',{cache:'no-store'});if(cfgRes.ok)CONFIG=mergeConfig(DEFAULT_CONFIG,await cfgRes.json())}catch(e){console.warn('config.json 读取失败，使用默认品牌',e.message)}
function applyBrandUI(){const q=s=>document.querySelector(s);const b=CONFIG.brand||{};const title=b.title||DEFAULT_CONFIG.brand.title;const sub=b.subtitle||DEFAULT_CONFIG.brand.subtitle;document.title=`${title} · ${sub}`;const icon=q('#brand-icon');if(icon)icon.textContent=b.iconText||'猫';const ht=q('#brand-title');if(ht){const textNode=[...ht.childNodes].find(n=>n.nodeType===3);if(textNode)textNode.textContent=title+' ';else ht.insertBefore(document.createTextNode(title+' '),ht.firstChild);const sp=q('#brand-subtitle');if(sp)sp.textContent='· '+sub}const tg=q('#brand-tagline');if(tg)tg.textContent=b.tagline||DEFAULT_CONFIG.brand.tagline;const av=q('#brand-avatar');if(av)av.textContent=b.avatarText||'伦';const eb=q('#office-eyebrow');if(eb)eb.textContent=b.eyebrow||DEFAULT_CONFIG.brand.eyebrow;const hl=q('#office-headline');if(hl){const sun=hl.querySelector('span');hl.textContent=(b.officeHeadline||DEFAULT_CONFIG.brand.officeHeadline)+' ';if(sun)hl.appendChild(sun);else{const s=document.createElement('span');s.textContent='☀';hl.appendChild(s)}}}
const $=s=>document.querySelector(s);
applyBrandUI();
const statusNames={working:'工作中',thinking:'思考中',idle:'休息中',need_you:'需要你',error:'异常',offline:'离线'};
let officeCredential='';
$('#status-auth').onclick=()=>{const value=prompt('输入本地状态服务访问口令（仅本页内存保存）');if(value!==null){officeCredential=value;syncStatus();}};
const people=[];
let humanFriends=[];try{humanFriends=JSON.parse(localStorage.getItem('office-human-friends')||'[]');if(!Array.isArray(humanFriends))humanFriends=[];}catch{humanFriends=[];}
function friendAgents(){return humanFriends.map(f=>({...f,role:'人类伙伴',status:f.botId?(liveData?.agents.find(a=>a.id===f.botId)?.status||'idle'):['working','idle','thinking'][Math.floor(Date.now()/30000+hashId(f.id))%3],task:f.botId?(liveData?.agents.find(a=>a.id===f.botId)?.task||'等你安排今天的任务～'):'今天也一起认真营业～'}));}

function hashId(id){let h=2166136261;for(const ch of id)h=Math.imul(h^ch.charCodeAt(0),16777619);return h>>>0}

const CAT_SPRITE_FILES=['grey.png','white.png','calico.png','black.png'];

const roomTextures={};
async function loadRoomTextures(){
  const loader=new THREE.TextureLoader();
  const files={
    floor_wood:'floor_wood.jpg', wall_cream:'wall_cream.jpg', city_panorama:'city_panorama.jpg',
    desk_top:'desk_top.jpg', desk_side_mint:'desk_side_mint.jpg', sofa_fabric:'sofa_fabric.jpg',
    rug_sage:'rug_sage.jpg', plant_leaf:'plant_leaf.png', monitor_screen:'monitor_screen.jpg', ceiling:'ceiling.jpg',
    chair_fabric:'chair_fabric.jpg', monitor_bezel:'monitor_bezel.jpg'
  };
  await Promise.all(Object.entries(files).map(([k,f])=>new Promise((resolve,reject)=>{
    loader.load('./assets/room/'+f+'?v=b5',t=>{
      t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
      if(k==='floor_wood'||k==='wall_cream'||k==='desk_top'||k==='desk_side_mint'||k==='sofa_fabric'||k==='ceiling'||k==='rug_sage'||k==='chair_fabric'||k==='monitor_bezel'){
        t.wrapS=t.wrapT=THREE.RepeatWrapping;
      }
      roomTextures[k]=t;resolve();
    },undefined,e=>reject(e||Error('room '+f)));
  })));
  if(roomTextures.floor_wood)roomTextures.floor_wood.repeat.set(5,4.5);
  if(roomTextures.wall_cream)roomTextures.wall_cream.repeat.set(4,2);
  if(roomTextures.ceiling)roomTextures.ceiling.repeat.set(3,3);
  if(roomTextures.desk_top)roomTextures.desk_top.repeat.set(1.2,1);
  if(null)roomTextures.desk_side_mint.repeat.set(1,1.2);
  if(roomTextures.sofa_fabric)roomTextures.sofa_fabric.repeat.set(2,1.5);
  if(roomTextures.rug_sage)roomTextures.rug_sage.repeat.set(1,1);
  if(roomTextures.chair_fabric)roomTextures.chair_fabric.repeat.set(1.2,1.2);
  if(roomTextures.monitor_bezel)roomTextures.monitor_bezel.repeat.set(1,1);
}
function coatSpriteFile(p){return CAT_SPRITE_FILES[hashId(p.id)%CAT_SPRITE_FILES.length]}

const scene=new THREE.Scene();
const host=$('#scene');
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.6));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.VSMShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.0;
host.prepend(renderer.domElement);
const camera=new THREE.PerspectiveCamera(40,1,.1,220);
const target=new THREE.Vector3(2,1,-1);let viewAngle=.30,viewHeight=10.8,camRadius=24,zoom=1;
function updateCamera(){
  const r=camRadius/zoom;
  camera.position.set(target.x+Math.sin(viewAngle)*r*.55, viewHeight/zoom, target.z+Math.cos(viewAngle)*r);
  camera.lookAt(target.x, target.y+.4, target.z-1.5);
  camera.fov=Math.max(28, Math.min(52, 40/Math.sqrt(zoom)));
  camera.updateProjectionMatrix();
}
updateCamera();
const ambient=new THREE.HemisphereLight(0xfff8e8,0xb8e0d0,3.85);scene.add(ambient);
const sun=new THREE.DirectionalLight(0xfff0d0,5.1);sun.position.set(-12,28,-10);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-25,right:25,top:25,bottom:-25,near:1,far:70});sun.shadow.normalBias=.035;sun.shadow.bias=-.0001;sun.shadow.radius=6;sun.shadow.blurSamples=12;scene.add(sun);
const fill=new THREE.DirectionalLight(0xfff5ea,.9);fill.position.set(5,10,18);scene.add(fill);
const peachFill=new THREE.DirectionalLight(0xffc8b0,.25);peachFill.position.set(-8,10,14);scene.add(peachFill);
const softKey=new THREE.PointLight(0xfff1c4,12,42,2);softKey.position.set(-6,14,-4);scene.add(softKey);
const windowGlow=new THREE.PointLight(0xffe8b0,18,50,2);windowGlow.position.set(-10,8,-8);scene.add(windowGlow);
scene.fog=new THREE.FogExp2(0xfff6e8,.0038);
const materials=new Map();
function mat(c,roughness=.52,metalness=0,map=null,opts={}){const mapId=map?(map.uuid||'m'):'-';const key=[c,roughness,metalness,mapId,opts.emissive||'',opts.transparent||'',opts.opacity||''].join();if(!materials.has(key)){const m=new THREE.MeshStandardMaterial({color:c,roughness,metalness,map:map||null,...(opts.map===undefined?{}:{})});if(map){m.map=map;m.color=new THREE.Color(c||'#ffffff')}if(opts.emissive){m.emissive=new THREE.Color(opts.emissive);m.emissiveIntensity=opts.emissiveIntensity??.4}if(opts.transparent){m.transparent=true;m.opacity=opts.opacity??1;m.depthWrite=opts.depthWrite??false}materials.set(key,m)}return materials.get(key)}
await loadRoomTextures();
const cream=mat('#f8f6ec',.48,0,roomTextures.wall_cream),wood=mat('#fff0d8',.4,0,roomTextures.desk_top),mint=mat('#a8e0c8',.46,0,null),dark=mat('#4f6a60',.55),white=mat('#fffdf8',.38),metal=mat('#b7c2b8',.28,.45);
wood.color=new THREE.Color('#e9c395');mint.color=new THREE.Color('#8bbfa9');
const floorMat=mat('#ffffff',.55,0,roomTextures.floor_wood);floorMat.color=new THREE.Color('#d1c8ba');
const woodWarm=mat('#ffffff',.48,0,roomTextures.desk_top);woodWarm.color=new THREE.Color('#fff6e8');
const mintRich=mat('#ffffff',.46,0,null);mintRich.color=new THREE.Color('#7ecfb0');
const sofaMat=mat('#c9d9c8',.85);
const chairMat=mat('#aebfb3',.85);
const bezelMat=mat('#586568',.48);
const rugMat=mat('#ffffff',.7,0,roomTextures.rug_sage);rugMat.color=new THREE.Color('#e8f0e0');
const ceilMat=mat('#ffffff',.45,0,roomTextures.ceiling);ceilMat.color=new THREE.Color('#fffaf2');
const screenMatBase=mat('#ffffff',.35,0,roomTextures.monitor_screen,{emissive:'#7ec8ff',emissiveIntensity:.65});
function mesh(geo,m,x=0,y=0,z=0,parent=scene){const o=new THREE.Mesh(geo,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
const boxGeo=new THREE.BoxGeometry(1,1,1),sphereGeo=new THREE.SphereGeometry(1,32,24);
// Real bevels, in world units: furniture silhouettes stay rounded at every aspect ratio.
const roundedCache=new Map();
function roundedGeometry(w,h,d){
 const r=Math.min(.14,Math.min(w,h,d)*.24),key=[w,h,d].join(',');
 if(roundedCache.has(key))return roundedCache.get(key);
 const shape=new THREE.Shape(),x=-w/2+r,y=-h/2+r,W=w-2*r,H=h-2*r;
 shape.moveTo(x,y);shape.lineTo(x+W,y);shape.lineTo(x+W,y+H);shape.lineTo(x,y+H);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:d-2*r,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:r,bevelThickness:r,curveSegments:8});
 g.translate(0,0,-d/2+r);g.computeVertexNormals();roundedCache.set(key,g);return g;
}
function box(w,h,d,m,x,y,z,parent=scene){return mesh(roundedGeometry(w,h,d),m,x,y,z,parent)}
function ball(w,h,d,m,x,y,z,parent=scene){const o=mesh(sphereGeo,m,x,y,z,parent);o.scale.set(w,h,d);return o}
function cyl(r1,r2,h,m,x,y,z,parent=scene,n=32){return mesh(new THREE.CylinderGeometry(r1,r2,h,n),m,x,y,z,parent)}
function lineBetween(a,b,r,m,parent=scene){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b);const o=cyl(r,r,va.distanceTo(vb),m,0,0,0,parent,8);o.position.copy(va.add(vb).multiplyScalar(.5));o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(...b).sub(new THREE.Vector3(...a)).normalize());return o}
function canvasTexture(text,{bg=null,color='#596d59',font=105,w=1024,h=128}={}){const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,w,h)}ctx.font=`600 ${font}px "Noto Sans CJK SC","Microsoft Yahei",sans-serif`;ctx.textBaseline='middle';ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(text,w/2,h/2);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t}
function sign(text,x,y,z,w=3,color='#59765f',parent=scene){const t=canvasTexture(text,{color});const o=mesh(new THREE.PlaneGeometry(w,w/8),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide}),x,y,z,parent);o.castShadow=false;return o}
function floorText(text,x,z,w,color='#6a7c67'){const o=sign(text,x,.075,z,w,color);o.rotation.x=-Math.PI/2;return o}
const obstacles=[];
function obstacle(x,z,w,d,pad=.38){obstacles.push({x1:x-w/2-pad,x2:x+w/2+pad,z1:z-d/2-pad,z2:z+d/2+pad});}

// Textured floating cutaway floor + cream walls + city panorama windows + ceiling (concept B).
box(29,.55,26,mat('#d4c4a4',.6),0,-.38,.2);
const floorPlane=mesh(new THREE.PlaneGeometry(29,26),floorMat,0,.03,.2);floorPlane.rotation.x=-Math.PI/2;floorPlane.receiveShadow=true;floorPlane.castShadow=false;
box(29,.18,.16,white,0,.04,13.05);box(.16,.18,26,white,14.5,.04,0);
// Open cutaway: NO solid front wall (was blocking the camera). Low cream curb only.
box(29,.42,.22,cream,0,.28,13.05);
// Soft half-height glass-tint on far right edge instead of opaque wall
{const softR=new THREE.MeshPhysicalMaterial({color:'#e8f2ea',transparent:true,opacity:.08,roughness:.2,depthWrite:false,side:THREE.DoubleSide});
box(.06,3.2,18,softR,14.55,1.7,-1);}
// Ceiling only over back half so near camera stays open sky feel
const ceil=mesh(new THREE.PlaneGeometry(29,16),ceilMat,0,7.5,-2);ceil.rotation.x=Math.PI/2;ceil.castShadow=false;ceil.visible=false;
const outsideMat=new THREE.MeshBasicMaterial({color:'#c9dcd6',side:THREE.DoubleSide});
// A soft illustrated skyline keeps the background in the toy-office palette.
const skyline=document.createElement('canvas');skyline.width=1024;skyline.height=512;const sky=skyline.getContext('2d');const gradient=sky.createLinearGradient(0,0,0,512);gradient.addColorStop(0,'#c1dcd8');gradient.addColorStop(1,'#fff0d4');sky.fillStyle=gradient;sky.fillRect(0,0,1024,512);for(let i=0;i<28;i++){const h=70+(i*73)%220;sky.fillStyle=i%2?'#b7c9c3':'#a5bdb7';sky.fillRect(i*40,512-h,30,h);sky.fillStyle='#e9ead4';for(let y=512-h+16;y<500;y+=25)sky.fillRect(i*40+8,y,5,10);}outsideMat.map=new THREE.CanvasTexture(skyline);outsideMat.map.colorSpace=THREE.SRGBColorSpace;
mesh(new THREE.PlaneGeometry(29,7.6),outsideMat,0,3.7,-12.85);mesh(new THREE.PlaneGeometry(10,7.6),outsideMat,19,3.7,-12.85);for(let x=14.5;x<=24;x+=3.2)box(.12,7.6,.14,frameForBoss(),x,3.7,-12.55);function frameForBoss(){return mat('#ebe6d4',.4)}const sideVista=mesh(new THREE.PlaneGeometry(26,7.6),outsideMat,-14.65,3.7,.2);sideVista.rotation.y=Math.PI/2;
const frame=mat('#ebe6d4',.4);for(let x=-14.5;x<=14.6;x+=3.625)box(.12,7.6,.14,frame,x,3.7,-12.55);for(let z=-12.5;z<=13.1;z+=3.65)box(.14,7.6,.12,frame,-14.5,3.7,z);
for(const y of [.18,2.2,7.35]){box(29,.14,.18,frame,0,y,-12.55);box(.18,.14,26,frame,-14.5,y,.2)}
box(29,.36,.5,cream,0,.32,-12.2);box(.5,.36,26,cream,-14.2,.32,.2);
// Warm sunlight pools across wood floor
for(let i=0;i<7;i++){const patch=mesh(new THREE.PlaneGeometry(2.8,8.2),new THREE.MeshBasicMaterial({color:'#ffe9b0',transparent:true,opacity:.05,depthWrite:false}),-11+i*4.2,.07,-5.2+i*.28);patch.rotation.set(-Math.PI/2,0,-.4);patch.castShadow=false}
function plant(x,z,scale=1){
 const g=new THREE.Group();g.position.set(x,0,z);g.scale.setScalar(scale);scene.add(g);
 cyl(.36,.26,.55,white,0,.3,0,g);cyl(.3,.3,.035,mat('#65513d'),0,.58,0,g);
 const stem=mat('#607b42'),greens=['#477849','#6d9b54','#91b86b'];
 for(let i=0;i<12;i++){
  const a=i*2.399,h=.95+(i%5)*.31,len=.48+(i%3)*.16;
  const end=[Math.cos(a)*len,h,Math.sin(a)*len];lineBetween([0,.55,0],end,.018,stem,g);
  const leaf=ball(.19,.43,.065,mat(greens[i%3],.65),...end,g);
  leaf.rotation.set(Math.sin(a)*.65,a,-Math.cos(a)*.65);
 }
 return g;
}
function deskPlant(x,y,z,scale=.24){const p=plant(x,z,scale);p.position.y=y;return p}
function rug(x,z,w,d,color,label){const m=rugMat.clone();m.color=new THREE.Color(color||'#dfe8d6');const plane=mesh(new THREE.PlaneGeometry(w,d),m,x,.07,z);plane.rotation.x=-Math.PI/2;plane.castShadow=false;const border=mat('#ffffff');box(w-.18,.008,.025,border,x,.092,z+d/2-.1);box(w-.18,.008,.025,border,x,.092,z-d/2+.1);floorText(label,x,z+d/2-.43,Math.min(w-.3,4.7));}
function chair(x,z,rotation=0,color=mint){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);cyl(.16,.2,.4,metal,0,.25,0,g);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;lineBetween([0,.16,0],[Math.cos(a)*.52,.06,Math.sin(a)*.52],.032,metal,g);cyl(.06,.06,.04,metal,Math.cos(a)*.52,.06,Math.sin(a)*.52,g)}
/* seat cushion */box(1.05,.14,.9,chairMat,0,.72,0,g);box(.98,.1,.82,chairMat,0,.82,.02,g);
/* back cushion */box(.95,.95,.14,chairMat,0,1.35,.42,g);box(.85,.7,.1,chairMat,0,1.4,.48,g);
/* soft arm pads */for(const s of [-1,1]){box(.12,.28,.7,chairMat,s*.52,.95,.05,g);box(.14,.1,.55,chairMat,s*.52,1.12,.02,g)}
return g}
function desk(x,z,{color=mint,globe=false,manager=false}={}){const before=new Set(scene.children);const w=manager?3.6:3.15;
/* thick wood top with slight edge lip */box(w,.24,1.72,wood,x,1.52,z);box(w+.08,.06,1.8,wood,x,1.39,z);
/* mint pedestal with door grooves + handles */box(.85,1.32,1.32,color,x-w/2+.48,.72,z);
for(let yy of [.48,.78,1.08]){box(.62,.03,.03,mat('#6aa890'),x-w/2+.48,yy,z+.66);box(.18,.035,.04,metal,x-w/2+.48,yy+.12,z+.68)}
/* slim side leg */box(.14,1.32,1.2,cream,x+w/2-.16,.72,z);
/* FRONT MODESTY + lip (local -Z → camera after rot) */box(w-.06,1.55,.18,color,x,.86,z-.86);
box(w-.02,.1,.2,wood,x,1.5,z-.94);
box(w-.14,.05,.05,mat('#6aa890'),x,1.35,z-.96);
/* keyboard tray */box(1.05,.05,.42,dark,x+.1,1.66,z+.64);for(let row=0;row<3;row++)box(.86,.012,.03,mat('#abbcb0'),x+.1,1.70,z+.54+row*.1);box(.14,.035,.2,cream,x+.9,1.58,z+.25);
/* monitor + bezel + screen */box(1.22,.78,.12,bezelMat,x-.35,2.08,z-.28);box(.10,.35,.12,bezelMat,x-.35,1.72,z-.28);box(.55,.05,.34,bezelMat,x-.35,1.66,z-.22);const scr=screenMatBase.clone();box(1.09,.65,.025,scr,x-.35,2.08,z-.20);box(.34,.035,.02,metal,x-.35,2.05,z-.35);
deskPlant(x-1.1,1.58,z-.35,.36);deskPlant(x+1.0,1.58,z-.38,.26);
cyl(.13,.1,.22,white,x+1.05,1.68,z+.2);cyl(.1,.1,.015,mat('#9c7a4d'),x+1.05,1.8,z+.2);
for(let i=0;i<3;i++)box(.13,.48+i*.05,.38,mat(['#d2c7a1','#9caf9b','#e5dfca'][i]),x-1.05+i*.15,1.82,z+.18);
box(.6,.045,.4,mat('#e8d9b9'),x+.55,1.67,z-.5);cyl(.16,.16,.04,dark,x+1.15,1.67,z-.55);lineBetween([x+1.15,1.7,z-.55],[x+1.05,2.27,z-.55],.025,metal);ball(.23,.1,.18,mat('#e6d6ac'),x+1.05,2.27,z-.55);
/* chair on sit side (before rot = +Z; after rot = -Z behind desk from camera) */chair(x-.1,z+1.18);
obstacle(x,z,w+0.35,2.15,.35);
if(globe){cyl(.25,.25,.08,wood,x+1.2,1.62,z-.45);lineBetween([x+1.2,1.64,z-.45],[x+1.2,1.92,z-.45],.04,metal);ball(.34,.34,.34,mat('#85b5b0'),x+1.2,2.15,z-.45);ball(.18,.22,.05,mat('#b8ce97'),x+1.2,2.2,z-.14)}
const assembly=new THREE.Group();assembly.position.set(x,0,z);scene.add(assembly);for(const o of [...scene.children])if(o!==assembly&&!before.has(o)){assembly.attach(o)}assembly.rotation.y=Math.PI;return assembly}
// Rear rooms: the manager's office, a glazed meeting room, and a tea counter.
box(10,.55,26,mat('#d7b681',.55),19,-.38,.2);const bossFloor=mesh(new THREE.PlaneGeometry(10,26),floorMat,19,.03,.2);bossFloor.rotation.x=-Math.PI/2;bossFloor.castShadow=false;rug(20,-1,7,8,'#c7cfb5','经理办公室');
const glass=new THREE.MeshPhysicalMaterial({color:'#d1e6cf',transparent:true,opacity:.11,roughness:.15,depthWrite:false,side:THREE.DoubleSide});const glassFrame=mat('#52665c',.4,.2);
function glassWall(x,z,w,axis='x',height=4.5){if(axis==='x'){box(w,height,.055,glass,x,height/2,z);box(w,.07,.08,glassFrame,x,height,z);for(const xx of [x-w/2,x+w/2])box(.065,height,.08,glassFrame,xx,height/2,z)}else{box(.055,height,w,glass,x,height/2,z);box(.08,.07,w,glassFrame,x,height,z);for(const zz of [z-w/2,z+w/2])box(.08,height,.065,glassFrame,x,height/2,zz)}}
glassWall(16.5,-2,6,'z');glassWall(21.8,3,3.4);sign('经理办公室',20.7,3.4,3.05,3);
rug(-1.7,-8,8,6.8,'#c9d7c4','灵感会议室');glassWall(-5.7,-8.8,5.8,'z');glassWall(2.3,-8.8,5.8,'z');glassWall(-3.7,-4.6,4);glassWall(1.5,-4.6,1.6);sign('灵 感 会 议 室',-2.9,3.65,-4.53,3.2);
const neonMaterial=new THREE.MeshStandardMaterial({color:'#ffbac5',emissive:'#ff2448',emissiveIntensity:3,roughness:.25});
for(const [x,z] of [[17.2,3.03],[1.4,-4.55]]){
 const stroke=cyl(.065,.085,.67,neonMaterial,x,3.65,z);stroke.rotation.z=-.08;
 const dot=mesh(new THREE.TorusGeometry(.095,.04,12,32),neonMaterial,x,3.1,z);
 const glow=new THREE.PointLight('#ff3459',2.5,3);glow.position.set(x,3.4,z+.2);scene.add(glow);
}

// Concept B neon need-you mark on meeting glass
{const c=document.createElement('canvas');c.width=256;c.height=320;const ctx=c.getContext('2d');ctx.fillStyle='#ff2a3a';ctx.font='bold 220px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowColor='#ff6070';ctx.shadowBlur=28;ctx.fillText('!',128,150);const nt=new THREE.CanvasTexture(c);nt.colorSpace=THREE.SRGBColorSpace;const neon=mesh(new THREE.PlaneGeometry(1.1,1.4),new THREE.MeshBasicMaterial({map:nt,transparent:true,depthWrite:false,side:THREE.DoubleSide}),2.2,3.2,-4.55);neon.castShadow=false;}

box(4.2,.2,2.2,wood,-1.7,1.45,-8);box(2.6,1.3,1.1,mint,-1.7,.7,-8);obstacle(-1.7,-8,4.4,2.4,.2);for(let i=0;i<3;i++){chair(-3.15+i*1.45,-6.3,0);chair(-3.15+i*1.45,-9.7,Math.PI)}deskPlant(-1.7,1.57,-8,.25);
// Whiteboard and pendant lights.
box(4,2,.1,cream,-1.7,3.1,-11.95);box(3.7,1.75,.02,white,-1.7,3.1,-11.88);sign('好点子，从这里开始',-1.7,3.48,-11.85,3.2);for(let i=0;i<3;i++)box(.48,.4,.025,mat(['#cbd8b5','#ead9a6','#d0dfd9'][i]),-2.8+i*1.05,2.8,-11.84);
for(let i=0;i<3;i++){lineBetween([-3.1+i*1.4,6.4,-8],[-3.1+i*1.4,4.5,-8],.018,dark);const shade=mesh(new THREE.ConeGeometry(.48,.47,20,1,true),mint,-3.1+i*1.4,4.45,-8);shade.rotation.z=Math.PI;cyl(.42,.42,.04,mat('#fff7d9'),-3.1+i*1.4,4.25,-8)}
// Tea and coffee area.
rug(8.3,-8.1,9.6,6.5,'#e0d9c3','能量补给站');box(8.4,1.4,1.3,cream,8.4,.77,-11.1);box(8.65,.16,1.5,wood,8.4,1.55,-11.1);obstacle(8.4,-11.1,8.65,1.5);
for(let i=0;i<5;i++){box(1.5,1.15,.055,mint,5+i*1.7,.81,-10.42);box(.35,.04,.04,metal,5+i*1.7,1.2,-10.37)}box(1.1,1,.75,dark,6,2.1,-11.1);box(.73,.25,.15,metal,6,2.1,-10.66);cyl(.15,.13,.25,white,6,1.79,-10.7);box(1.1,.08,.65,metal,9,1.67,-11.1);lineBetween([9.2,1.7,-11.3],[9.2,2.2,-11.3],.04,metal);lineBetween([9.2,2.2,-11.3],[9,2.2,-11.1],.04,metal);box(1.5,2.6,1.2,mat('#bbccbb'),12.3,1.35,-11);box(.06,1.8,.06,metal,11.85,1.6,-10.35);box(6,.13,.75,wood,7.8,3.9,-11.75);for(let i=0;i<6;i++)cyl(.12,.12,.28,mat(i%2?'#e0c8a1':'#b5c6a0'),5.8+i*.65,4.1,-11.7);sign('COFFEE & GOOD IDEAS',8.1,3,-11.95,4,'#7a8e71');
cyl(1.2,1.2,.16,wood,8,1.45,-7.5,scene,32);cyl(.13,.23,1.4,metal,8,.7,-7.5);obstacle(8,-7.5,2.4,2.4,.1);for(const [x,z]of [[6.2,-7.5],[9.8,-7.5],[8,-5.7]]){cyl(.4,.4,.12,mint,x,.87,z);lineBetween([x,.8,z],[x,.08,z],.05,metal)}deskPlant(8,1.55,-7.5,.27);
// Workstations are generated from status.json below.
const loungeBefore=new Set(scene.children),loungeObstacleStart=obstacles.length;
// Lounge with a soft curved rug, mint sofa, books and plants.
cyl(3.65,3.65,.04,rugMat,8.1,.095,9.1,scene,48);
function sofa(x,z,w,rot=0){const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rot;scene.add(g);box(w,.55,1.45,sofaMat,0,.6,0,g);box(w,.9,.34,sofaMat,0,1.08,-.65,g);for(let i=0;i<3;i++)box(w/3-.1,.18,1.1,sofaMat,-w/3+i*w/3,.94,.03,g);for(const s of [-1,1])box(.3,.65,1.4,sofaMat,s*(w/2-.15),.95,0,g);for(let s of [-1,1]){box(.45,.45,.25,mat('#eee8cb'),s*w*.31,1.28,-.45,g);box(.14,.2,.14,wood,s*(w/2-.4),.2,.35,g)}}
sofa(7.4,9.3,5.4,0);sofa(11.2,9.2,3.1,-Math.PI/2);obstacle(7.4,9.3,5.4,1.5,.05);obstacle(11.2,9.2,1.5,3.1,.05);cyl(1.1,1.1,.13,wood,7.8,.8,10,scene,32);for(let i=0;i<3;i++){const a=i*Math.PI*2/3;lineBetween([7.8+Math.cos(a)*.6,.74,10+Math.sin(a)*.6],[7.8+Math.cos(a)*.8,.1,10+Math.sin(a)*.8],.06,mint)}obstacle(7.8,10,2.2,2.2,.08);box(.65,.04,.45,cream,7.6,.91,9.9);box(.45,.04,.55,mat('#b3c3a0'),7.7,.96,9.9);deskPlant(8.15,.91,10.1,.19);floorText('摸鱼充电区',7.4,12.2,4.4);
const tvBefore=new Set(scene.children);
// Television faces the sofa; a console and controllers sit below it.
box(4.5,.55,.8,wood,7.2,.35,6.3);box(4.6,2.5,.16,dark,7.2,2.25,6.4);
box(4.3,2.2,.03,mat('#7095a0'),7.2,2.25,6.51);
for(let i=0;i<5;i++)box(.45,.25+i*.15,.04,mat(['#e8c77b','#b9d9a3','#e3aaa0'][i%3]),5.7+i*.75,1.6+i%2*.5,6.54);
box(.6,.18,.4,dark,8,.75,6.6);sign('一起打游戏',7.2,3.8,6.6,3);

const television=new THREE.Group();television.position.set(7.2,0,6.4);scene.add(television);
for(const o of [...scene.children])if(o!==television&&!tvBefore.has(o))television.attach(o);
television.position.set(13.2,0,8.7);television.rotation.y=-Math.PI/2;
const loungeGroup=new THREE.Group();scene.add(loungeGroup);for(const o of [...scene.children])if(o!==loungeGroup&&!loungeBefore.has(o))loungeGroup.attach(o);loungeGroup.position.x=10;
for(const o of obstacles.slice(loungeObstacleStart)){o.x1+=10;o.x2+=10}
// Play corner with a climbing tree and yarn balls.
rug(-10,-8,6.8,6.8,'#d9c4b1','猫咪游乐场');
for(const [x,z,h] of [[-12,-10,2.1],[-10.5,-10,3.5],[-11.3,-8.6,1],[-9.8,-9.2,2.8]]){cyl(.14,.14,h,wood,x,h/2,z);cyl(.7,.7,.16,mint,x,h,z);}
box(1.35,.9,1.15,wood,-10.5,2.7,-10);box(1.1,.7,.95,wood,-12,1.9,-9.8);ball(.34,.34,.06,dark,-10.5,2.7,-9.4);
for(let i=0;i<3;i++){ball(.23,.23,.23,mat(['#bc8791','#b9b96d','#91aaa9'][i]),-9+i*.65,.3,-7.8);}
floorText('茶水间 · 咖啡与小吧台',8,-4.7,6);
// Reception sign and miniature wall clock.
sign(CONFIG.brand.wallSign||CONFIG.brand.title||'一团小伦子',8.5,5.15,-12.37,4.3,'#5f8f78');sign(CONFIG.brand.wallTagline||'MAKE LITTLE THINGS GREAT',8.5,4.7,-12.36,3.8,'#8fb59a');
const clockFace=cyl(.43,.43,.08,white,-7.2,4.6,-12.25,scene,32);clockFace.rotation.x=Math.PI/2;lineBetween([-7.2,4.6,-12.17],[-7.2,4.87,-12.17],.022,dark);lineBetween([-7.2,4.6,-12.16],[-6.99,4.52,-12.16],.023,dark);
for(const [x,z,s] of [[-13,-10,1.55],[-13,-4,1.45],[-13,2,1.3],[-13,7,1.4],[-12.5,11,1.6],[-8,11.5,1.2],[3,-11,1.5],[6,10.5,1.1],[10,11,1.35],[13,-5,1.4],[13,5.8,1.5],[12.7,11.5,1.6],[3,11.2,1.15],[-6,-11.4,.95],[-2,10.8,1.05],[8,-3.5,.85],[-9,3.5,1.1],[5,3.2,.9]])plant(x,z,s);

// Cats assembled from primitive meshes. The face points toward positive Z.
// Merge immobile objects by material to keep the full office inexpensive to draw.
const cutaway=[];
scene.traverse(o=>{if(!o.isMesh||o===ceil)return; o.updateWorldMatrix(true,false); const b=new THREE.Box3().setFromObject(o),size=b.getSize(new THREE.Vector3()),center=b.getCenter(new THREE.Vector3());if(size.y>5&&(center.z<-12||center.x<-14)){o.userData.cutaway=true;o.userData.backWall=center.z<-12;cutaway.push(o);}});
scene.updateMatrixWorld(true);
const staticGroups=new Map();
scene.traverse(o=>{if(o.isMesh&&!o.material.transparent&&!o.userData.cutaway){const key=o.material.uuid+'-'+o.castShadow;let entry=staticGroups.get(key);if(!entry){entry={material:o.material,cast:o.castShadow,items:[]};staticGroups.set(key,entry)}entry.items.push(o)}});
for(const {material,cast,items} of staticGroups.values()){if(items.length<2)continue;const geos=items.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld));const merged=mergeGeometries(geos,false);if(merged){const o=new THREE.Mesh(merged,material);o.castShadow=cast;o.receiveShadow=true;scene.add(o);items.forEach(item=>item.removeFromParent())}geos.forEach(g=>g.dispose())}
const cats=new Map();
function makeEar(size){
 const shape=new THREE.Shape();shape.moveTo(-.24*size,-.16*size);shape.quadraticCurveTo(-.27*size,.03*size,-.14*size,.38*size);shape.quadraticCurveTo(-.11*size,.44*size,-.05*size,.38*size);shape.quadraticCurveTo(.11*size,.22*size,.24*size,-.16*size);shape.closePath();
 const g=new THREE.ExtrudeGeometry(shape,{depth:.12*size,bevelEnabled:true,bevelSegments:4,bevelSize:.045*size,bevelThickness:.045*size,curveSegments:12});g.translate(0,0,-.06*size);g.computeVertexNormals();return g;
}
const earGeometry=makeEar(1),innerEarGeometry=makeEar(.62);
// Shared velvet materials: physical sheen supplies soft grazing-angle fur light.
const furMaterials=new Map();
function velvet(color){if(!furMaterials.has(color))furMaterials.set(color,new THREE.MeshPhysicalMaterial({color,roughness:.84,sheen:1,sheenColor:new THREE.Color('#fff1da'),sheenRoughness:.8}));return furMaterials.get(color)}
const catSphere=new THREE.SphereGeometry(1,64,48);
const cheekGeometry=catSphere.clone();const cheekPos=cheekGeometry.attributes.position;
for(let i=0;i<cheekPos.count;i++){const y=cheekPos.getY(i);cheekPos.setX(i,cheekPos.getX(i)*(1+.1*Math.exp(-(((y+.35)/.42)**2))));}cheekGeometry.computeVertexNormals();
function plush(w,h,d,m,x,y,z,parent){const o=mesh(catSphere,m,x,y,z,parent);o.scale.set(w,h,d);return o}
function stroke(points,r,m,parent){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),32,r,10,false),m,0,0,0,parent)}
const coatMaps=new Map();
function headCoat(p){
 const kinds={'cat-grey':0,'cat-white':1,'cat-calico':2,'cat-black':3,'cat-orange':4};const kind=kinds[p.avatar]??hashId(p.id)%5;if(coatMaps.has(kind))return coatMaps.get(kind);
 const c=document.createElement('canvas');c.width=1024;c.height=512;const ctx=c.getContext('2d'),im=ctx.createImageData(c.width,c.height);
 const base=new THREE.Color(p.coat),stripe=new THREE.Color(kind===0?'#64717d':kind===4?'#b67740':'#413e42');
 for(let j=0;j<c.height;j++)for(let i=0;i<c.width;i++){
  const theta=j/c.height*Math.PI,phi=i/c.width*Math.PI*2,x=-Math.cos(phi)*Math.sin(theta),y=Math.cos(theta),z=Math.sin(phi)*Math.sin(theta);let col=base;
  if(kind===2&&z>.1&&(((x+.5)**2/.28+(y-.55)**2/.38<1)||((x-.65)**2/.19+(y-.45)**2/.3<1)))col=new THREE.Color(x<0?'#bf793c':'#3f4147');
  if(kind===3&&z>.1&&y<.1&&Math.abs(x)<.28+.24*(-y))col=new THREE.Color('#fff5e6');
  if((kind===0||kind===4)&&z>.1){const forehead=y>.32&&y<.91&&Math.abs(x)<.35&&Math.abs(Math.sin(x*25+y*y*2))> .91-(y-.32)*.15;const cheeks=Math.abs(x)>.72&&y>-.28&&y<.26&&Math.sin(y*32+Math.abs(x)*6)>.65;if(forehead||cheeks)col=stripe;}
  const n=1+Math.sin(i*73.3+j*39.7)*.018,k=(j*c.width+i)*4;
  // Canvas is sRGB; convert Three's linear color back before writing.
  const rgb=col.clone().convertLinearToSRGB();im.data[k]=rgb.r*255*n;im.data[k+1]=rgb.g*255*n;im.data[k+2]=rgb.b*255*n;im.data[k+3]=255;
 }
 ctx.putImageData(im,0,0);const map=new THREE.CanvasTexture(c);map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=4;
 const m=velvet('#ffffff').clone();m.map=map;coatMaps.set(kind,m);return m;
}
const eyeMaterials=new Map();
function eyePaint(index){
 const key=index%3;if(eyeMaterials.has(key))return eyeMaterials.get(key);
 const c=document.createElement('canvas');c.width=c.height=256;const ctx=c.getContext('2d');
 const grad=ctx.createRadialGradient(128,140,15,128,128,124);grad.addColorStop(0,['#abce95','#cfa653','#7eb9bd'][key]);grad.addColorStop(.7,['#527e69','#90703b','#417280'][key]);grad.addColorStop(1,'#172327');
 ctx.fillStyle=grad;ctx.beginPath();ctx.arc(128,128,126,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#10171d';ctx.beginPath();ctx.ellipse(128,128,67,91,0,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#ffffff';ctx.beginPath();ctx.ellipse(91,73,29,34,-.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(170,165,13,0,Math.PI*2);ctx.fill();
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const material=new THREE.MeshStandardMaterial({map:texture,roughness:.22});eyeMaterials.set(key,material);return material;
}
function createCatGeom(p){const root=new THREE.Group();scene.add(root);const body=new THREE.Group();root.add(body);const fur=velvet(p.coat),pale=velvet('#fff3df'),pink=mat('#eaa7aa',.62),eye=mat('#493739',.7);
const shirt=velvet(['#91b9ad','#b0bbcf','#dda7a1','#a5bac2'][p.index%4]);
plush(.46,.51,.34,shirt,0,.57,0,body);
plush(.29,.27,.045,shirt,0,.48,.325,body);
stroke([[-.23,.55,.35],[0,.51,.38],[.23,.55,.35]],.012,mat('#e9e4da'),body);
const eyes=new THREE.Group(),ears=[];const head=new THREE.Group();head.position.set(0,1.40,.1);body.add(head);head.add(eyes);
const face=mesh(cheekGeometry,headCoat(p),0,0,0,head);face.scale.set(.76,.65,.57);
for(const side of [-1,1]){
 // Cheeks are recessed into the head, creating a broad rounded lower silhouette.
 // Broad head silhouette provides cheeks without separate protruding lumps.
 const ear=mesh(earGeometry,fur,side*.48,.47,-.04,head);ears.push(ear);ear.rotation.z=side*-.22;
 const inner=mesh(innerEarGeometry,pink,0,.01,.105,ear);
 plush(.09,.13,.04,pale,0,-.04,.15,ear);
 const e=new THREE.Group();e.position.set(side*.29,.015,.49);e.rotation.y=side*.27;eyes.add(e);
 plush(.231,.260,.065,mat('#453a36',.65),0,0,0,e);
 plush(.220,.249,.075,mat('#161c22',.26),0,0,.022,e);
 const iris=mesh(new THREE.CircleGeometry(.211,64),eyePaint(p.index),0,0,.124,e);iris.scale.y=1.14;
 // Three separate catchlights and a lower reflected window make the gaze readable far away.
 plush(.065,.079,.018,mat('#ffffff',.12),-.067,.09,.143,e);
 plush(.027,.029,.014,white,.078,-.065,.145,e);
 plush(.012,.012,.01,white,.098,.05,.146,e);
 plush(.18,.14,.095,pale,side*.14,-.25,.515,head);
 plush(.125,.057,.025,mat('#e5a2a0',.9),side*.49,-.19,.45,head);
 for(let k=0;k<2;k++)stroke([[side*.36,-.25-k*.065,.49],[side*.51,-.25-k*.07,.46],[side*.64,-.22-k*.09,.38]],.006,mat('#a48b7d'),head);
 stroke([[0,-.265,.625],[side*.05,-.32,.616],[side*.105,-.31,.608],[side*.13,-.28,.6]],.012,eye,head);
}
plush(.067,.045,.045,pink,0,-.205,.62,head);plush(.025,.012,.009,mat('#ffd5d2'),-.015,-.19,.66,head);
const legs=[];for(const side of [-1,1]){const leg=new THREE.Group();leg.position.set(side*.23,.28,.01);body.add(leg);plush(.18,.19,.18,fur,0,-.1,0,leg);plush(.185,.125,.235,pale,0,-.2,.09,leg);plush(.09,.055,.018,pink,0,-.22,.31,leg);legs.push(leg)}
const arms=[];for(const side of [-1,1]){const arm=new THREE.Group();arm.position.set(side*.43,.77,.03);body.add(arm);plush(.17,.20,.16,shirt,0,-.1,0,arm);plush(.165,.155,.16,pale,0,-.27,.025,arm);plush(.075,.065,.025,pink,0,-.28,.177,arm);for(const x of [-.075,0,.075])plush(.028,.035,.018,pink,x,-.19,.16,arm);arms.push(arm)}
const tail=new THREE.Group();tail.position.set(0,.4,-.23);body.add(tail);stroke([[0,0,0],[.35,.02,-.28],[.66,.25,-.28],[.75,.59,-.2],[.67,.76,-.12]],.155,fur,tail);plush(.155,.18,.155,pale,.67,.76,-.12,tail);
// Soft fabric collar and drawstrings, kept beneath the chin.
for(const side of [-1,1]){plush(.19,.085,.13,shirt,side*.17,.94,.21,body);stroke([[side*.1,.88,.32],[side*.12,.73,.36]],.013,pale,body)}
if(p.style==='crown'){cyl(.3,.3,.16,mat('#d7b857',.35,.55),0,.46,0,head);for(let i=0;i<5;i++){const a=i*Math.PI*2/5;const c=mesh(new THREE.ConeGeometry(.08,.2,4),mat('#e7c46c',.35,.5),Math.cos(a)*.24,.61,Math.sin(a)*.24,head);ball(.04,.04,.04,mat('#d08c70'),Math.cos(a)*.24,.72,Math.sin(a)*.24,head)}}
root.scale.setScalar(1.18);root.position.set(p.x+.1,0,p.z-1.18);root.rotation.y=0;
const label=document.createElement('button');label.className='cat-label';label.innerHTML=`<i class="dot"></i><span></span><b class="cat-bubble"></b>`;label.querySelector('span').textContent=p.name;label.title=`${p.name} · ${p.role}`;label.addEventListener('click',()=>selectCat(p.id));$('#labels').append(label);
for(const part of [head,body,...arms,tail]){const batches=new Map();for(const o of [...part.children]){if(!o.isMesh||ears.includes(o))continue;o.updateMatrix();const key=o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o)}for(const items of batches.values()){if(items.length<2||items.some(o=>legs.includes(o)))continue;const gs=items.map(o=>o.geometry.clone().applyMatrix4(o.matrix));const mg=mergeGeometries(gs,false);if(mg){mesh(mg,items[0].material,0,0,0,part);items.forEach(o=>o.removeFromParent())}gs.forEach(g=>g.dispose())}}
root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});
const shadow=mesh(new THREE.CircleGeometry(.43,16),new THREE.MeshBasicMaterial({color:'#59694b',transparent:true,opacity:.12,depthWrite:false}),0,.095,0,root);shadow.rotation.x=-Math.PI/2;shadow.scale.set(1,.7,1);shadow.castShadow=false;
const mouth=ball(.055,.065,.018,eye,0,-.30,.615,head);mouth.visible=false;const yarn=ball(.23,.23,.23,mat('#bc8791'),0,.25,.8,root);yarn.visible=false;
const controller=new THREE.Group();body.add(controller);box(.55,.15,.25,dark,0,.65,.45,controller);for(const side of [-1,1])ball(.12,.1,.12,dark,side*.25,.62,.46,controller);ball(.035,.035,.035,mint,.15,.75,.48,controller);controller.visible=false;
const cup=cyl(.12,.1,.25,white,.35,.8,.35,body);cup.visible=false;
const curled=new THREE.Group();root.add(curled);ball(.65,.32,.5,fur,0,.4,0,curled);ball(.35,.28,.3,fur,.35,.4,.25,curled);const wrap=mesh(new THREE.TorusGeometry(.53,.14,12,40,Math.PI*1.65),fur,0,.4,0,curled);wrap.rotation.x=Math.PI/2;curled.visible=false;const sleepEar=mesh(earGeometry,fur,.45,.68,.17,curled);sleepEar.scale.setScalar(.45);ball(.23,.12,.035,pale,.35,.40,.53,curled);ball(.035,.025,.025,pink,.35,.36,.57,curled);for(const side of [-1,1])lineBetween([.35+side*.06,.44,.57],[.35+side*.16,.42,.57],.015,eye,curled);
const cat={p,root,body,head,eyes,ears,mouth,yarn,sleepEar,controller,cup,curled,arms,legs,tail,label,state:null,route:[],targetKey:'',moving:false,phase:(hashId(p.id)%100)*.17,personality:hashId(p.id)%6,activity:null,activityUntil:0,meeting:false};cats.set(p.id,cat);return cat}



function createCat(p){const c=createCatGeom(p);if(p.human)humanize(c,p.human);return c;}
function humanize(c,h){
 // Preserve the existing articulated groups and navigation; replace all cat anatomy.
 c.head.clear();c.eyes=new THREE.Group();c.head.add(c.eyes);c.ears=[];c.tail.clear();c.tail.visible=false;
 for(const o of [...c.body.children])if(o.isMesh)c.body.remove(o);
 const skin=mat(h.skin||'#e5b896',.85),hair=velvet(h.hair||'#392b25'),shirt=velvet(h.shirt||'#7ea89a'),pants=velvet('#5c6878');
 plush(.41,.48,.28,shirt,0,.59,0,c.body);plush(.14,.13,.13,skin,0,1.05,0,c.body);
 c.head.position.set(0,1.49,.06);plush(.48,.55,.43,skin,0,0,0,c.head);
 plush(.49,.27,.43,hair,0,.36,-.045,c.head);plush(.20,.18,.09,hair,-.25,.30,.34,c.head);
 if(h.style==='long')for(const side of [-1,1])plush(.15,.5,.28,hair,side*.39,-.12,-.13,c.head);
 if(h.style==='curly')for(let i=0;i<9;i++)plush(.15,.14,.15,hair,Math.cos(i*.75)*.39,.32+Math.sin(i*.75)*.13,.05+Math.sin(i*2)*.24,c.head);
 for(const side of [-1,1]){plush(.09,.14,.08,skin,side*.48,-.03,0,c.head);plush(.085,.105,.035,mat('#343130'),side*.17,.015,.404,c.eyes);plush(.025,.03,.012,white,side*.17-.02,.05,.44,c.eyes);stroke([[side*.08,.18,.4],[side*.23,.19,.38]],.018,hair,c.head);if(h.glasses){const rim=mesh(new THREE.TorusGeometry(.15,.018,8,24),dark,side*.19,.02,.45,c.head);rim.scale.y=.85;}}
 if(h.glasses)lineBetween([-.04,.03,.45],[.04,.03,.45],.015,dark,c.head);
 plush(.06,.08,.065,skin,0,-.12,.43,c.head);stroke([[-.11,-.26,.39],[0,-.29,.42],[.11,-.26,.39]],.012,mat('#a46e61'),c.head);
 c.mouth=plush(.04,.04,.01,mat('#a46e61'),0,-.27,.42,c.head);c.mouth.visible=false;
 c.arms.forEach((arm,i)=>{arm.clear();arm.position.set((i?1:-1)*.39,.82,.02);plush(.13,.23,.13,shirt,0,-.12,0,arm);plush(.115,.13,.10,skin,0,-.36,.01,arm);});
 c.legs.forEach(leg=>{leg.clear();plush(.145,.23,.15,pants,0,-.08,0,leg);plush(.15,.09,.23,white,0,-.24,.09,leg);});
 c.curled.clear();c.sleepEar=new THREE.Group();c.curled.add(c.sleepEar);plush(.50,.24,.31,shirt,0,.4,0,c.curled);plush(.29,.31,.28,skin,.53,.41,0,c.curled);plush(.28,.15,.28,hair,.55,.60,-.03,c.curled);
 c.personality=0;c.isHuman=true;
}


// A* on a half-unit occupancy grid keeps cats out of tables, cabinets and glass walls.
const step=.5,xmin=-13.5,zmin=-11.7,nx=75;let nz=52;
function wallObstacle(x,z,w,d){obstacle(x,z,w,d,.13)}
wallObstacle(16.5,-2,.07,6);wallObstacle(21.8,3,3.4,.07);wallObstacle(-5.7,-8.8,.07,5.8);wallObstacle(2.3,-8.8,.07,5.8);wallObstacle(-3.7,-4.6,4,.07);wallObstacle(1.5,-4.6,1.6,.07);
let grid;
const staticObstacleCount=obstacles.length;
let layoutKey='',deskObjects=[],layoutDepth=13.2;
function rebuildGrid(){grid=new Uint8Array(nx*nz);for(let iz=0;iz<nz;iz++)for(let ix=0;ix<nx;ix++){const x=xmin+ix*step,z=zmin+iz*step;if(obstacles.some(o=>x>o.x1&&x<o.x2&&z>o.z1&&z<o.z2))grid[iz*nx+ix]=1}}
function syncMembers(agents){
 const key=JSON.stringify(agents.map(a=>[a.id,a.group||'']));if(key===layoutKey)return;layoutKey=key;
 for(const o of deskObjects){o.traverse(m=>{if(m.isMesh&&m.geometry!==boxGeo&&m.geometry!==sphereGeo&&![...roundedCache.values()].includes(m.geometry))m.geometry.dispose()});o.removeFromParent();}deskObjects=[];obstacles.length=staticObstacleCount;
 const groups=new Map();for(const a of agents){const k=a.group||'__ungrouped';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(a)}
 const ordered=[...groups.values()].flat();people.length=0;
 const before=new Set(scene.children);
 ordered.forEach((a,i)=>{const h=hashId(a.id),p={...a,index:i,coat:({'cat-grey':'#959da7','cat-white':'#fff7eb','cat-calico':'#e9d8bd','cat-black':'#363945','cat-orange':'#d6a366'}[a.avatar]||['#959da7','#fff7eb','#e9d8bd','#363945','#d6a366'][h%5]),style:['bow','glasses','calico','bow','glasses'][h%5],x:-11+(i%4)*6.2,z:-1.2+Math.floor(i/4)*5.6};if(a.role==='经理'){p.x=20;p.z=-1;p.style='crown'}people.push(p);desk(p.x,p.z,{manager:p.style==='crown'});let c=cats.get(a.id);if(!c)c=createCat(p);else{c.p=p;c.targetKey='';} });
 const bottom=Math.max(13.2,1.3+(Math.ceil(agents.length/4)-1)*5.6);layoutDepth=bottom;/* keep cinematic target on front desks; user can pan/zoom for overview */if(!window.__userFramed){target.set(2,1,-1);updateCamera();}nz=Math.ceil((bottom-zmin)/step);if(bottom>13.2)box(29,.55,bottom-13.2,mat('#d7b681'),0,-.38,(bottom+13.2)/2);
 for(const o of scene.children)if(!before.has(o)&&![...cats.values()].some(c=>c.root===o))deskObjects.push(o);
 for(const [id,c]of cats)if(!agents.some(a=>a.id===id)){c.root.removeFromParent();c.label.remove();cats.delete(id)}
 const batch=new THREE.Group();scene.add(batch);for(const o of deskObjects)batch.attach(o);batch.updateMatrixWorld(true);
 const byMaterial=new Map();batch.traverse(o=>{if(o.isMesh&&!o.material.transparent){const k=o.material.uuid;if(!byMaterial.has(k))byMaterial.set(k,[]);byMaterial.get(k).push(o)}});
 for(const items of byMaterial.values()){const gs=items.map(o=>o.geometry.clone().applyMatrix4(o.matrixWorld)),geo=mergeGeometries(gs,false);if(geo){const m=new THREE.Mesh(geo,items[0].material);m.castShadow=true;m.receiveShadow=true;batch.add(m);items.forEach(o=>o.removeFromParent())}gs.forEach(g=>g.dispose())}deskObjects=[batch];
 rebuildGrid();renderer.shadowMap.needsUpdate=true;resize();
}
rebuildGrid();
function cell(v){return {x:Math.max(0,Math.min(nx-1,Math.round((v.x-xmin)/step))),z:Math.max(0,Math.min(nz-1,Math.round((v.z-zmin)/step)))}}
function nearestFree(c){if(!grid[c.z*nx+c.x])return c;for(let r=1;r<8;r++)for(let dz=-r;dz<=r;dz++)for(let dx=-r;dx<=r;dx++){const x=c.x+dx,z=c.z+dz;if(x>=0&&x<nx&&z>=0&&z<nz&&!grid[z*nx+x])return{x,z}}return c}
function path(from,to){const a=nearestFree(cell(from)),b=nearestFree(cell(to)),start=a.z*nx+a.x,end=b.z*nx+b.x;if(start===end)return [new THREE.Vector3(to.x,0,to.z)];const opened=[start],cost=new Map([[start,0]]),came=new Map(),closed=new Set();let found=false;
while(opened.length){opened.sort((u,v)=>(cost.get(u)+Math.abs(u%nx-b.x)+Math.abs(Math.floor(u/nx)-b.z))-(cost.get(v)+Math.abs(v%nx-b.x)+Math.abs(Math.floor(v/nx)-b.z)));const current=opened.shift();if(current===end){found=true;break}closed.add(current);const cx=current%nx,cz=Math.floor(current/nx);for(const [dx,dz]of[[1,0],[-1,0],[0,1],[0,-1]]){const xx=cx+dx,zz=cz+dz,k=zz*nx+xx;if(xx<0||xx>=nx||zz<0||zz>=nz||grid[k]||closed.has(k))continue;const next=cost.get(current)+1;if(!cost.has(k)||next<cost.get(k)){cost.set(k,next);came.set(k,current);if(!opened.includes(k))opened.push(k)}}}
if(!found)return [];const ids=[];let cur=end;while(cur!==start){ids.unshift(cur);cur=came.get(cur)}const points=[];for(let i=0;i<ids.length;i++){const prev=i===0?start:ids[i-1],next=ids[i+1];if(next!==undefined&&(ids[i]-prev)===(next-ids[i]))continue;points.push(new THREE.Vector3(xmin+ids[i]%nx*step,0,zmin+Math.floor(ids[i]/nx)*step))}points.push(new THREE.Vector3(to.x,0,to.z));return points}
let data={agents:[],activity:[]},liveData=null,filter='all',selected=null,simulation=false,simTimer=null,loadSeq=0,appliedSeq=0;
function validData(input){input=normalizeStatus(input,{offlineAfterMs:(CONFIG.offlineAfterMinutes||5)*60000});if(!input||!Array.isArray(input.agents)||!Array.isArray(input.activity))throw Error('status.json 必须包含 agents 和 activity 数组');const ids=new Set();for(const a of input.agents){if(!a||typeof a.id!=='string'||ids.has(a.id)||!statusNames[a.status]||typeof a.task!=='string'||typeof a.name!=='string'||typeof a.role!=='string')throw Error('成员 ID、姓名、职责、状态或任务格式有误');ids.add(a.id)}for(const a of input.activity)if(!a||!['time','agent','text'].every(k=>typeof a[k]==='string'))throw Error('动态格式有误');return input}
const activityNames={sleep:'就眯一下下…',game:'摸一会鱼应该不会被发现吧',chase:'嘿嘿，你追不上我！',yarn:'它先动的，可不怪我',climb:'站高一点，灵感会多一点吗',drink:'给灵感续一杯～'};
function idleDestination(c){
 if(!c.activity||elapsed>=c.activityUntil){const options=c.isHuman?["sleep","game","drink"]:Object.keys(activityNames);c.activity=options[Math.floor(Math.random()*options.length)];c.activityUntil=elapsed+24+Math.random()*20;c.activityRound=(c.activityRound||0)+1;}
 const slot=c.p.index%3;
 const positions={sleep:[16.2+slot*1.2,9.3],game:[16+slot,7.8],chase:[-8+slot,-6],yarn:[-8.5+slot*.6,-8],climb:[-11.3,-8.1],drink:[5.5+slot*1.7,-5.2]};
 if(c.activity==='chase'&&!c.pairUntil){const mate=[...cats.values()].find(o=>o!==c&&o.state?.status==='idle'&&(!o.pairUntil||o.pairUntil<elapsed));if(mate){c.pairUntil=c.activityUntil;mate.activity='chase';mate.activityUntil=c.activityUntil;mate.pairUntil=c.activityUntil;mate.activityRound=(mate.activityRound||0)+1;}}
 if(c.pairUntil<elapsed)c.pairUntil=0;
 const [x,z]=positions[c.activity];return {x,z,key:`idle-${c.activity}-${c.activityRound}`};
}
function refreshIdle(c){const d=idleDestination(c);if(d.key!==c.targetKey){c.destination=d;c.targetKey=d.key;c.route=path(c.root.position,d);c.label.querySelector('.cat-bubble').textContent=activityNames[c.activity];}}
function destination(cat,agent,meetingIndex){const i=cat.p.index;cat.meeting=meetingIndex>=0;if(cat.meeting){const row=Math.floor(meetingIndex/6),slot=meetingIndex%6;return {x:-4.4+(slot%3)*2.2,z:slot<3?-6.25+row*.5:-10.2-row*.25,key:`meeting-${meetingIndex}`}}
if(agent.status==='need_you'||agent.status==='error'){const n=data.agents.filter(a=>a.status==='need_you'||a.status==='error').findIndex(a=>a.id===agent.id);return{x:16.7+(n%4)*1.65,z:3.6+Math.floor(n/4)*1.6,key:`door-${n}`}}
if(agent.status==='idle'){if(/睡|sleep|小憩/i.test(agent.task)&&cat.activity!=='sleep'){cat.activity='sleep';cat.activityUntil=Infinity;cat.activityRound=(cat.activityRound||0)+1;}else if(cat.activityUntil===Infinity&&!/睡|sleep|小憩/i.test(agent.task)){cat.activity=null;cat.activityUntil=0;}return idleDestination(cat);}
cat.activity=null;
return{x:cat.p.x+.1,z:cat.p.z-1.18,key:`desk-${cat.p.x}-${cat.p.z}`}}
function applyData(next){data=structuredClone(next);data.agents=data.agents.filter(a=>!humanFriends.some(f=>f.id===a.id));data.agents.push(...friendAgents());syncMembers(data.agents);const meetings=data.agents.filter(a=>(a.state==='meeting'||a.task.includes('开会'))&&a.status!=='need_you'&&a.status!=='error');const meetingIds=meetings.map(a=>a.id);
for(const cat of cats.values()){const a=data.agents.find(a=>a.id===cat.p.id);if(!a){cat.root.visible=false;cat.label.hidden=true;continue}cat.root.visible=true;cat.label.hidden=false;cat.state=a;cat.label.querySelector('span').textContent=a.name;cat.label.title=`${a.name} · ${a.role} · ${a.task}`;cat.label.querySelector('.dot').className=`dot ${a.status}`;const bubble=cat.label.querySelector('.cat-bubble');bubble.className=`cat-bubble ${a.status}`;bubble.textContent=a.status==='offline'?'暂时离开，等我回来～':a.status==='thinking'?'脑袋转转，办法快来':a.status==='need_you'?'看我看我！需要审批！':a.status==='error'?'呜，帮我看看这里':a.status==='idle'?activityNames[cat.activity]||'休息':meetingIds.includes(a.id)?'···':'';
if(a.status==='offline'){cat.interaction=null;cat.route=[];cat.moving=false;cat.label.querySelector('.cat-bubble').textContent='暂时离开，等我回来～';continue;}const dest=destination(cat,a,meetingIds.indexOf(a.id));if(cat.interaction&&a.status!==cat.interaction.status)cat.interaction=null;if(!cat.interaction&&dest.key!==cat.targetKey){cat.targetKey=dest.key;cat.destination=dest;cat.route=path(cat.root.position,dest);cat.moving=cat.route.length>0}}
if(selected&&!data.agents.some(a=>a.id===selected)){selected=null;$('#detail').hidden=true}renderUI();if(selected)showDetail(selected)}
function escapeHTML(v){return String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderUI(){const count=s=>data.agents.filter(a=>s.includes(a.status)).length;$('#count-working').textContent=count(['working','thinking']);$('#count-need').textContent=count(['need_you','error']);$('#count-idle').textContent=count(['idle']);$('#need-badge').textContent=count(['need_you','error']);$('#team-count').textContent=data.agents.length;$('#team-list').innerHTML='';const filtered=data.agents.filter(a=>filter==='all'||(filter==='working'?['working','thinking'].includes(a.status):['need_you','error'].includes(a.status)));
for(const a of filtered){const p=people.find(p=>p.id===a.id),button=document.createElement('button');button.className='member'+(selected===a.id?' selected':'');button.dataset.agent=a.id;button.style.setProperty('--coat',p?.coat||'#aabca0');const av=p&&!p.human?('./assets/cats/'+((p.id&&['need_you','error'].includes(a.status))?'orange_wave.png':coatSpriteFile(p))):'';button.innerHTML=`<span class="cat-avatar">${av?`<img src="${av}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%">`:`<span>${p?.human?'👤':p?.style==='crown'?'♛':'•ᴗ•'}</span>`}</span><span class="member-info"><span class="member-title"><span class="member-name">${escapeHTML(a.name)}</span></span><span class="member-task" style="display:block">${escapeHTML(a.role)} · ${escapeHTML(a.task)}</span></span><span class="member-status"><i class="dot ${a.status}"></i>${statusNames[a.status]}</span>`;button.addEventListener('click',()=>selectCat(a.id));$('#team-list').append(button)}if(!filtered.length)$('#team-list').innerHTML='<p class="empty">这里暂时没有小猫，大家都很顺利。</p>';
$('#activity-list').innerHTML=data.activity.slice(0,30).map(a=>{const name=data.agents.find(p=>p.id===a.agent)?.name||a.agent;return `<div class="activity"><time>${escapeHTML(a.time)}</time><i></i><div><strong>${escapeHTML(name)}</strong> ${escapeHTML(a.text)}</div></div>`}).join('')||'<p class="empty">等待新的办公室动态…</p>';
$('#aside-status').textContent=count(['need_you','error'])?`${count(['need_you','error'])} 位小猫正在等你看看`:'一切都在有条不紊地进行';}
function selectCat(id){selected=id;const greeted=cats.get(id);if(greeted)greeted.greetUntil=elapsed+3;const focus=cats.get(id);if(focus){target.set(focus.root.position.x,1,focus.root.position.z);camRadius=13;viewHeight=8;zoom=1;window.__userFramed=true;updateCamera();}for(const cat of cats.values())cat.label.classList.toggle('selected',cat.p.id===id);renderUI();showDetail(id);if(focus?.isHuman){const remove=document.createElement("button");remove.textContent="移除这位本地伙伴";remove.onclick=()=>{const next=humanFriends.filter(f=>f.id!==id);try{localStorage.setItem("office-human-friends",JSON.stringify(next));}catch{return;}humanFriends=next;applyData(liveData||{agents:[],activity:[]});};$("#detail").append(remove);}}
function showDetail(id){const a=data.agents.find(a=>a.id===id);if(!a)return;const cat=cats.get(id);$('#detail').hidden=false;$('#detail').innerHTML=`<button aria-label="关闭详情">×</button><strong>${escapeHTML(a.name)}</strong><p>${escapeHTML(a.role)} · ${statusNames[a.status]}</p><div>${escapeHTML(a.task)}</div><p>${cat?.moving?'正在前往'+(cat.meeting?'会议室':cat.targetKey.startsWith('door')?'经理室':a.status==='idle'?'休息区':'自己的工位'):cat?.meeting?'正在灵感会议室':a.status==='idle'?(activityNames[cat?.activity]||'悄悄歇一小会～'):'在办公室里认真营业'}</p>`;$('#detail button').onclick=()=>{selected=null;$('#detail').hidden=true;for(const c of cats.values())c.label.classList.remove('selected');renderUI()}}
async function syncStatus(){const seq=++loadSeq;const pollSec=Math.round((CONFIG.pollIntervalMs||5000)/1000);try{const url=CONFIG.statusUrl||'./status.json';const sep=url.includes('?')?'&':'?';const r=await fetch(`${url}${sep}t=${Date.now()}`,{cache:'no-store',signal:AbortSignal.timeout(5000),headers:officeCredential&&new URL(url,location.href).origin===location.origin?{Authorization:'Bearer '+officeCredential}:{}});if(r.status===401){$('#status-auth').hidden=false;throw Error('状态源需要访问口令');}if(!r.ok)throw Error(`HTTP ${r.status}`);let payload=await r.json();if(CONFIG.agents&&Array.isArray(CONFIG.agents)&&CONFIG.agents.length&&!(payload&&Array.isArray(payload.agents)&&payload.agents.length)){payload={activity:payload?.activity||[],agents:CONFIG.agents}}const next=validData(payload);if(seq<appliedSeq)return;appliedSeq=seq;liveData=next;$('#connection').textContent=simulation?'模拟演示中':'状态源已连接';if(!simulation){applyData(next);$('#sync-note').textContent=`已同步 ${new Date().toLocaleTimeString(CONFIG.locale||'zh-CN',{hour12:false})} · 每 ${pollSec} 秒刷新`;$('#data-mode').textContent='实时状态'}}catch(e){if(CONFIG.agents&&Array.isArray(CONFIG.agents)&&CONFIG.agents.length){try{const next=validData({agents:CONFIG.agents,activity:CONFIG.activity||[]});appliedSeq=seq;liveData=next;if(!simulation)applyData(next);$('#connection').textContent='使用 config.agents 回退';$('#sync-note').textContent=`statusUrl 失败，已用 config.agents · ${e.message}`;return}catch(_){}}if(liveData&&!simulation)applyData(validData(liveData));$('#connection').textContent='状态文件连接异常';$('#sync-note').textContent=`读取失败：${e.message} · ${pollSec} 秒后重试`;console.warn('状态同步失败',e.message)}}
const simTasks={working:['正在打磨下一个好故事','把灵感整理成可执行的方案','正在处理今天的制作任务'],thinking:['正在琢磨一个新点子','思考一个更好的开场'],idle:['喝杯咖啡，补充一点能量','午后小憩，灵感充电中'],need_you:['有个方案想请你拍板','需要确认下一步的方向'],error:['任务遇到阻塞，等待协助']};
function simulateTick(){if(!data.agents.length)return;const next=structuredClone(data);for(let i=0;i<4;i++){const a=next.agents[Math.floor(Math.random()*next.agents.length)];const states=['working','working','thinking','idle','need_you'];a.status=states[Math.floor(Math.random()*states.length)];a.task=simTasks[a.status][Math.floor(Math.random()*simTasks[a.status].length)];next.activity.unshift({time:new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'}),agent:a.id,text:a.status==='idle'?'收好灵感，去休息一会儿':a.status==='need_you'?'带着新方案来找大总管':a.status==='thinking'?'开始酝酿一个新点子':'回到工位继续创作'})}if(Math.random()>.55){for(const id of ['us-director','us-script','us-costume']){const a=next.agents.find(a=>a.id===id);if(a){a.status='working';a.task='开会：美剧新一集创意碰头'}}}next.activity=next.activity.slice(0,30);applyData(next)}
$('#simulation').addEventListener('change',e=>{simulation=e.target.checked;clearInterval(simTimer);$('#data-mode').textContent=simulation?'模拟演示':'实时状态';$('#connection').textContent=simulation?'模拟演示中':'状态源已连接';$('#sync-note').textContent=simulation?'模拟演示中 · 每 7 秒发生新的故事':'每 5 秒同步 status.json';if(simulation){simulateTick();simTimer=setInterval(simulateTick,7000)}else if(liveData)applyData(liveData);else syncStatus()});
document.querySelectorAll('[data-filter]').forEach(b=>b.onclick=()=>{filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.classList.toggle('active',x===b));renderUI()});
let timeMode='day';const lighting={day:{sky:0xfff4e0,ground:0xa8d8c8,sun:0xffe8c0,intensity:2.1,ambient:1.8,exposure:1.0,bg:'radial-gradient(ellipse at 48% 38%,#fff8ec,#dff2e8 55%,#d0ebe2)'},evening:{sky:0xffe0c4,ground:0x9aab92,sun:0xffc08a,intensity:3.3,ambient:2.0,exposure:1.22,bg:'radial-gradient(ellipse at 48% 40%,#f6e7d2,#dde3cf)'},night:{sky:0xb4c8e2,ground:0x6a7872,sun:0xb7d2ef,intensity:1.05,ambient:1.65,exposure:1.18,bg:'radial-gradient(ellipse at 48% 40%,#627882,#3d545c)'}};
const nightLights=[];for(const [x,z]of [[-10,-8],[-1,-8],[8,-8],[-6,4],[7,3],[7,10]]){const l=new THREE.PointLight('#ffd49c',0,15,2);l.position.set(x,4,z);scene.add(l);nightLights.push(l)}
function setTime(mode){timeMode=mode;const hour=new Date().getHours();const actual=mode==='now'?(hour>=7&&hour<17?'day':hour>=17&&hour<20?'evening':'night'):mode;const l=lighting[actual];ambient.color.set(l.sky);ambient.groundColor.set(l.ground);ambient.intensity=l.ambient;sun.color.set(l.sun);sun.intensity=l.intensity;sun.position.set(actual==='evening'?-25:-10,actual==='evening'?12:26,-12);renderer.toneMappingExposure=l.exposure;renderer.shadowMap.needsUpdate=true;host.style.background=l.bg;nightLights.forEach(x=>x.intensity=actual==='night'?28:actual==='evening'?5:0);document.querySelectorAll('[data-time]').forEach(b=>{const active=b.dataset.time===mode;b.classList.toggle('active',active);b.setAttribute('aria-pressed',String(active))})}
document.querySelectorAll('[data-time]').forEach(b=>b.onclick=()=>setTime(b.dataset.time));
function resize(){const w=host.clientWidth,h=host.clientHeight;renderer.setSize(w,h);camera.aspect=w/Math.max(1,h);updateCamera()}
new ResizeObserver(resize).observe(host);function setZoom(v){zoom=Math.max(.55,Math.min(2.4,v));updateCamera();resize()}$('#zoom-in').onclick=()=>setZoom(zoom+.12);$('#zoom-out').onclick=()=>setZoom(zoom-.12);$('#reset-view').onclick=()=>{viewAngle=.30;viewHeight=10.8;camRadius=24;zoom=1;target.set(2,1,-1);window.__userFramed=false;updateCamera();resize()};host.addEventListener('wheel',e=>{if(e.target!==renderer.domElement)return;e.preventDefault();setZoom(zoom-e.deltaY*.0007)},{passive:false});
let cameraMode="rotate";$("#camera-mode").onclick=()=>{cameraMode=cameraMode==="rotate"?"pan":"rotate";$("#camera-mode").textContent=cameraMode==="rotate"?"旋转":"平移";$("#camera-mode").setAttribute("aria-pressed",String(cameraMode==="pan"));};
renderer.domElement.style.touchAction="none";renderer.domElement.addEventListener("contextmenu",e=>e.preventDefault());
let drag=null;renderer.domElement.addEventListener('pointerdown',e=>{drag={x:e.clientX,y:e.clientY,angle:viewAngle,height:viewHeight,tx:target.x,tz:target.z,moved:false,pan:cameraMode==="pan"||e.shiftKey||e.button===1||e.button===2};renderer.domElement.setPointerCapture(e.pointerId)});renderer.domElement.addEventListener('pointermove',e=>{if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.moved=true;if(drag.pan||e.shiftKey){window.__userFramed=true;const panScale=0.028/zoom;target.x=drag.tx-dx*Math.cos(viewAngle)*panScale-dy*Math.sin(viewAngle)*panScale;target.z=drag.tz+dx*Math.sin(viewAngle)*panScale-dy*Math.cos(viewAngle)*panScale;updateCamera()}else{window.__userFramed=true;viewAngle=drag.angle+dx*.006;viewHeight=Math.max(2.5,Math.min(55,drag.height+dy*.07));updateCamera()}});const raycaster=new THREE.Raycaster();renderer.domElement.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const r=host.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);const hits=raycaster.intersectObjects([...cats.values()].filter(c=>c.root.visible).map(c=>c.root),true);if(hits.length){let o=hits[0].object;while(o.parent&&o.parent!==scene)o=o.parent;const c=[...cats.values()].find(c=>c.root===o);if(c)selectCat(c.p.id)}}drag=null});renderer.domElement.addEventListener('pointercancel',()=>drag=null);
const clock=new THREE.Clock(),v=new THREE.Vector3();let elapsed=0,frames=0,fpsAt=performance.now()/1000;
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.25);elapsed+=dt;frames++;const wall=performance.now()/1000;if(wall-fpsAt>2){window.officeDebug.fps=Math.round(frames/(wall-fpsAt));if(window.officeDebug.fps<27&&renderer.getPixelRatio()>.72){renderer.setPixelRatio(Math.max(.7,renderer.getPixelRatio()*.82));resize()}frames=0;fpsAt=wall}
for(const c of cats.values()){if(!c.state||!c.root.visible)continue;
if(c.interaction&&elapsed>=c.interaction.until){c.interaction=null;c.targetKey='';applyData(liveData||data);}
if(c.state.status==='idle'&&!c.interaction)refreshIdle(c);
const t=elapsed*5+c.phase,pos=c.root.position;
c.mouth.visible=false;c.yarn.visible=false;c.body.scale.set(1,1,1);c.body.rotation.set(0,0,0);c.head.rotation.set(0,0,0);c.body.visible=true;c.curled.visible=false;c.controller.visible=false;c.cup.visible=false;c.root.position.y=0;c.arms.forEach(a=>{a.rotation.set(0,0,0)});
c.eyes.scale.y=(Math.sin(elapsed*1.8+c.phase)>.985)?.12:1;
c.ears.forEach((e,i)=>e.rotation.z=(i?1:-1)*-.22+Math.sin(t*.7+i)*.025);
if(c.state.status==='offline'){c.root.visible=true;}
if(c.route.length){const next=c.route[0],dx=next.x-pos.x,dz=next.z-pos.z,dist=Math.hypot(dx,dz),speed=2.5*dt;
if(dist<=Math.max(speed,.00001)){pos.x=next.x;pos.z=next.z;c.route.shift()}else{pos.x+=dx/dist*speed;pos.z+=dz/dist*speed;const diff=Math.atan2(Math.sin(Math.atan2(dx,dz)-c.root.rotation.y),Math.cos(Math.atan2(dx,dz)-c.root.rotation.y));c.root.rotation.y+=diff*Math.min(1,dt*9)}
c.moving=true;c.body.position.y=Math.abs(Math.sin(t*3))*.12+Math.pow(Math.max(0,Math.sin(elapsed*1.7+c.phase)),18)*.24;c.body.rotation.z=Math.sin(t*1.5)*.065;c.body.rotation.x=.08;c.legs.forEach((l,i)=>l.rotation.x=Math.sin(t*3+i*Math.PI)*.5);c.arms.forEach((a,i)=>a.rotation.x=Math.sin(t*3+i*Math.PI)*.35);c.tail.rotation.x=-.7;
}else{
if(c.moving){c.moving=false;if(selected===c.p.id)showDetail(selected)}
const idle=c.state.status==='idle'&&!c.interaction,sleeping=idle&&c.activity==='sleep',typing=['working','thinking'].includes(c.state.status)&&!c.meeting&&!c.interaction,needAttention=['need_you','error'].includes(c.state.status);
c.body.position.y=typing?.60:0;c.legs.forEach(l=>l.rotation.x=typing?-1.15:0);c.arms.forEach((a,i)=>a.rotation.x=typing?-1.3+Math.sin(t*3+i*Math.PI)*.1:0);
let angle=c.meeting?(pos.z<-8?0:Math.PI):typing?0:needAttention?Math.atan2(camera.position.x-pos.x,camera.position.z-pos.z):idle&&c.activity==='game'?Math.PI:.5;
if(needAttention){const wave=Math.sin(elapsed*7+c.phase),hop=Math.abs(Math.sin(elapsed*5.2+c.phase));c.root.position.y=hop*.28;c.body.position.y=.05+hop*.08;c.arms[0].rotation.x=-.3+wave*.25;c.arms[1].rotation.x=-.6-wave*.15;c.arms[0].rotation.z=-2.5+wave*.4;c.arms[1].rotation.z=.15;c.head.rotation.x=.08;c.tail.rotation.x=-.35;const bub=c.label.querySelector('.cat-bubble');bub.style.transform=`translateX(-50%) translateY(${-6-hop*10}px) scale(${1+.15*hop})`;bub.style.opacity=String(.45+.55*((Math.sin(elapsed*8+c.phase)+1)*.5));}
if(idle){
 if(sleeping){c.root.position.y=.95;c.body.visible=false;c.curled.visible=true;c.curled.scale.y=1+Math.sin(t*.45)*.045;c.sleepEar.rotation.z=Math.pow(Math.max(0,Math.sin(t*.31)),12)*.4;c.curled.rotation.z=Math.pow(Math.max(0,Math.sin(elapsed*.24+c.phase)),16)*.15;c.label.querySelector('.cat-bubble').style.transform=`translateY(${Math.sin(t*.3)*4}px)`;}
 if(c.activity==='game'){c.controller.visible=true;c.arms.forEach((a,i)=>a.rotation.x=-.9+Math.sin(t*2+i)*.08);c.body.position.y=.12;}
 if(c.activity==='drink'){c.cup.visible=true;c.arms[1].rotation.x=-1.5+Math.sin(t*.5)*.2;}
 if(c.activity==='yarn'){c.yarn.visible=true;c.yarn.position.x=Math.sin(t*.6)*.4;c.yarn.position.z=.7+Math.sin(t*.7)*.25;c.body.rotation.x=.45;c.arms[0].rotation.x=-1+Math.sin(t*1.4)*.7;c.root.position.x=c.destination.x+Math.sin(t*.25)*.35;}
 if(c.activity==='climb'){c.root.position.y=.5+(Math.sin(t*.22)+1)*1.3;c.arms.forEach((a,i)=>a.rotation.x=-1+Math.sin(t+i)*.5);angle=Math.PI;}
 if(c.activity==='chase'){const partner=[...cats.values()].find(o=>o!==c&&o.state?.status==='idle'&&o.activity==='chase');const phase=partner&&c.p.id>partner.p.id?Math.PI:0;const r=1.1;c.root.position.x=-8+Math.cos(elapsed*1.6+phase)*r;c.root.position.z=-6+Math.sin(elapsed*1.6+phase)*r;c.root.position.y=Math.pow(Math.max(0,Math.sin(t)),6)*.55;angle=-elapsed*1.6-phase;c.arms.forEach(a=>a.rotation.x=-.7);}
}else if(!needAttention){const bub=c.label.querySelector('.cat-bubble');bub.style.transform='';bub.style.opacity='';}
// Each ID has a stable signature gesture, with a brief break while typing.
const cycle=(elapsed+c.phase)%17,gesture=cycle<2.4,amount=gesture?Math.sin(cycle/2.4*Math.PI):0;
if(!sleeping&&!needAttention){switch(c.personality){case 0:c.arms.forEach(a=>a.rotation.x-=amount*2);c.body.scale.y=1+amount*.12;break;case 1:c.arms[0].rotation.x-=amount*2.3;c.head.rotation.x=amount*.18;break;case 2:c.tail.rotation.y=Math.sin(t*2)*.5;break;case 3:c.mouth.visible=amount>.25;c.mouth.scale.y=.1*amount;c.head.rotation.x=-amount*.25;c.body.scale.y=1+amount*.08;break;case 4:c.arms[1].rotation.z=-amount*1.1;c.arms[1].rotation.x=-amount*2.4;c.ears[1].rotation.z+=Math.sin(t*4)*amount*.2;break;case 5:if(gesture)c.eyes.scale.y=.15;break;}
if(typing&&cycle>9&&cycle<11){const stretch=Math.sin((cycle-9)/2*Math.PI);c.arms.forEach(a=>a.rotation.x=-1-stretch*1.8);c.body.scale.y=1+stretch*.12;}}
const diff=Math.atan2(Math.sin(angle-c.root.rotation.y),Math.cos(angle-c.root.rotation.y));c.root.rotation.y+=diff*Math.min(1,dt*5);c.tail.rotation.x=0;
}
if((c.greetUntil||0)>elapsed&&!c.moving){c.body.visible=true;c.curled.visible=false;c.root.rotation.y=Math.atan2(camera.position.x-pos.x,camera.position.z-pos.z);c.arms[0].rotation.z=-2.3+Math.sin(elapsed*10)*.3;c.label.querySelector('.cat-bubble').textContent=c.isHuman?'嗨！今天也一起加油～':'你来啦！给你一个爪爪～';}else if(c.interaction&&!c.moving){c.arms[0].rotation.x=-.8+Math.sin(elapsed*6)*.3;c.label.querySelector('.cat-bubble').textContent=c.interaction.kind==='yarn'?'抓到你啦，小毛球！':'我来啦，有什么悄悄话？';}
c.tail.rotation.z=Math.sin(t*.65)*.26;if(c.personality!==2)c.tail.rotation.y=Math.sin(t*.55)*.18;
v.copy(pos);v.y+=c.state.status==='idle'&&c.activity==='sleep'&&!c.moving?1.1:3.3;v.project(camera);c.label.style.left=`${(v.x*.5+.5)*host.clientWidth}px`;c.label.style.top=`${(-v.y*.5+.5)*host.clientHeight}px`;c.label.style.display=v.z>1||v.x<-1.15||v.x>1.15||v.y<-1.15||v.y>1.15?'none':'';c.label.style.zIndex=String(Math.round((1-v.z)*1000))}
for(const o of cutaway){o.visible=o.userData.backWall?camera.position.z>-11.8:camera.position.x>-13.7;}
if(frames%12===0)renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera)}
window.officeDebug={fps:0,roomTextures:()=>Object.keys(roomTextures),getCamera:()=>({type:camera.type,fov:camera.fov,pos:camera.position.toArray(),target:target.toArray(),zoom,viewAngle,viewHeight,camRadius}),portraitOnly:id=>{for(const c of cats.values()){c.root.visible=c.p.id===id;c.label.hidden=c.p.id!==id;}},config:()=>structuredClone(CONFIG),renderInfo:()=>({calls:renderer.info.render.calls,triangles:renderer.info.render.triangles}),getState:()=>structuredClone(data),getCats:()=>[...cats.values()].map(c=>({id:c.p.id,status:c.state?.status,position:c.root.position.toArray(),destination:c.destination,moving:c.moving,routeLength:c.route.length,meeting:c.meeting,activity:c.activity,personality:c.personality,coat:c.p.coat,desk:[c.p.x,c.p.z],headYaw:c.head.rotation.y,rootYaw:c.root.rotation.y,arm0x:c.arms[0].rotation.x,arm1x:c.arms[1].rotation.x,spriteMode:!!c.spriteMode,standFile:c.standFile||null})),applyData:next=>applyData(validData(next)),setTime,applyBrandUI,setView:(o)=>{if(o.target)target.set(o.target[0],o.target[1],o.target[2]);if(o.viewAngle!=null)viewAngle=o.viewAngle;if(o.viewHeight!=null)viewHeight=o.viewHeight;if(o.camRadius!=null)camRadius=o.camRadius;if(o.zoom!=null)zoom=o.zoom;window.__userFramed=true;updateCamera();resize();}};
setInterval(()=>{$('#clock').textContent=new Date().toLocaleString(CONFIG.locale||'zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});if(timeMode==='now')setTime('now')},1000);await syncStatus();setInterval(syncStatus,CONFIG.pollIntervalMs||5000);$('#loading').remove();resize();setTime('day');animate();

const playBall=ball(.28,.28,.28,mat('#d69da4'),0,.3,0);playBall.visible=false;
function invite(kind){let c=kind==='yarn'?[...cats.values()].find(c=>!c.isHuman&&c.state?.status==='idle'&&!c.interaction):cats.get(selected);if(!c){$('#interaction-note').textContent=kind==='yarn'?'大家都在忙，等休息时再玩吧～':'先点一位伙伴，再叫它过来吧～';return;}if(['need_you','error'].includes(c.state.status)){ $('#interaction-note').textContent='先帮它处理待办吧，它正等你呢。';return;}
const free=nearestFree(cell({x:target.x,z:target.z+4})),dest={x:xmin+free.x*step,z:zmin+free.z*step};if(grid[free.z*nx+free.x])return;const route=path(c.root.position,dest);if(!route.length){$('#interaction-note').textContent='这里过不去，换个位置试试吧～';return;}c.interaction={kind,status:c.state.status,until:elapsed+25};c.route=route;c.destination=dest;c.greetUntil=0;if(kind==='yarn'){playBall.position.set(dest.x,.3,dest.z+.5);playBall.visible=true;setTimeout(()=>playBall.visible=false,25000);}$('#interaction-note').textContent=kind==='yarn'?'小毛球滚过去啦～':'收到，马上来！';}
$('#throw-yarn').onclick=()=>invite('yarn');$('#summon').onclick=()=>invite('summon');

const humanDialog=$('#human-dialog'),humanForm=$('#human-form');let photoToken=0;
$('#add-human').onclick=()=>{humanForm.reset();$('#human-photo-preview').hidden=true;$('#human-form-note').textContent='选一张正面半身照，照片仅用于本地取色与对照，不会上传。';humanDialog.showModal();};
$('#human-cancel').onclick=()=>{photoToken++;humanDialog.close();};
$('#human-photo').onchange=async e=>{const file=e.target.files[0],token=++photoToken;if(!file)return;if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>8*1024*1024){e.target.value='';$('#human-form-note').textContent='请使用不超过 8 MB 的 PNG、JPEG 或 WebP。';return;}
 try{const img=await createImageBitmap(file);if(token!==photoToken){img.close();return;}const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,128,128);img.close();
 function sample(x,y,w,h){const pixels=ctx.getImageData(x,y,w,h).data,channels=[[],[],[]];for(let i=0;i<pixels.length;i+=4)for(let k=0;k<3;k++)channels[k].push(pixels[i+k]);return '#'+channels.map(a=>{a.sort((a,b)=>a-b);return a[Math.floor(a.length/2)].toString(16).padStart(2,'0')}).join('');}
 $('#human-skin').value=sample(55,42,18,20);$('#human-hair').value=sample(52,12,24,12);$('#human-shirt').value=sample(40,96,48,24);$('#human-photo-preview').src=canvas.toDataURL('image/jpeg',.85);$('#human-photo-preview').hidden=false;$('#human-form-note').textContent='已按正面半身照的位置近似取色，请对照照片调整。发型和眼镜需手动选择；这不是 AI 人脸重建。';
 }catch{$('#human-form-note').textContent='图片读取失败，请换一张照片。';e.target.value='';}};
humanForm.onsubmit=e=>{e.preventDefault();const name=$('#human-name').value.trim();if(!name)return;const f={id:'human-'+crypto.randomUUID(),name,botId:$('#human-bot').value.trim(),human:{skin:$('#human-skin').value,hair:$('#human-hair').value,shirt:$('#human-shirt').value,style:$('#human-style').value,glasses:$('#human-glasses').checked}};try{localStorage.setItem('office-human-friends',JSON.stringify([...humanFriends,f]));}catch{$('#human-form-note').textContent='浏览器未能保存，请检查站点存储空间。';return;}humanFriends.push(f);applyData(liveData||data);humanDialog.close();selectCat(f.id);};

$('#remove-human').onclick=()=>{if(!humanFriends.some(f=>f.id===selected)){$('#interaction-note').textContent='先点选一位本地添加的人类伙伴。';return;}const next=humanFriends.filter(f=>f.id!==selected);try{localStorage.setItem('office-human-friends',JSON.stringify(next));}catch{$('#interaction-note').textContent='暂时无法保存修改。';return;}humanFriends=next;applyData(liveData||{agents:[],activity:[]});$('#interaction-note').textContent='伙伴已离开办公室。';};
