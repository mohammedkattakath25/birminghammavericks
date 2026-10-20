document.documentElement.classList.add('js');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* nav */
const nav=document.getElementById('nav'),btn=document.getElementById('menuBtn');
const sub=document.body.classList.contains('sub');nav.classList.toggle('solid',sub);
addEventListener('scroll',()=>nav.classList.toggle('solid',sub||scrollY>30),{passive:true});
btn.addEventListener('click',()=>{const o=nav.classList.toggle('open');btn.setAttribute('aria-expanded',o)});
document.querySelectorAll('#menu a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');btn.setAttribute('aria-expanded','false')}));

/* reveal */
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{rootMargin:'0px 0px -8% 0px'});
document.querySelectorAll('.rv').forEach(el=>{const r=el.getBoundingClientRect();if(r.top<innerHeight)el.classList.add('in');else io.observe(el)});

/* ---------- hero: real photo layers in 3D parallax (pointer, tilt, scroll, idle sway) ---------- */
(function(){
  const sc=document.getElementById('scene');if(!sc)return;
  const L=[...sc.querySelectorAll('.ly')].map(e=>[e,+e.dataset.d||0]);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  let tx=0,ty=0,cx=0,cy=0,sy=0,last=-1e9,on=true;
  addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5;last=performance.now()},{passive:true});
  addEventListener('deviceorientation',e=>{if(e.gamma==null)return;tx=Math.max(-.5,Math.min(.5,e.gamma/60));ty=Math.max(-.5,Math.min(.5,(e.beta-45)/60));last=performance.now()},{passive:true});
  addEventListener('scroll',()=>{sy=Math.min(scrollY,1000)},{passive:true});
  new IntersectionObserver(es=>{on=es[0].isIntersecting;if(on)requestAnimationFrame(f)}).observe(sc);
  function f(t){
    if(!on)return;
    let ax=tx,ay=ty;
    if(t-last>2500){ax=Math.sin(t/3800)*.32;ay=Math.cos(t/5200)*.16}
    cx+=(ax-cx)*.05;cy+=(ay-cy)*.05;
    for(const[e,d]of L)e.style.transform=`translate3d(${(-cx*34*d).toFixed(2)}px,${(-cy*18*d-sy*d*.22).toFixed(2)}px,0) scale(${(1+sy*d/5000).toFixed(4)})`;
    requestAnimationFrame(f);
  }
  requestAnimationFrame(f);
})();

/* ---------- live 3D stadium (three.js) ---------- */
(function(){
  const cv=document.getElementById('stadium');
  if(!window.THREE||!cv)return;
  let R;try{R=new THREE.WebGLRenderer({canvas:cv,antialias:true,alpha:true,powerPreference:'high-performance'})}catch(e){return}
  if(!R.getContext())return;
  document.documentElement.classList.add('has3d');
  const T=THREE,hero=cv.parentElement,narrowQ=()=>hero.clientWidth/hero.clientHeight<1;
  R.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
  R.outputEncoding=T.sRGBEncoding;R.toneMapping=T.ACESFilmicToneMapping;R.toneMappingExposure=.8;
  R.shadowMap.enabled=true;R.shadowMap.type=T.PCFSoftShadowMap;
  const S=new T.Scene();S.fog=new T.FogExp2(0x1e0c12,.016);
  // ---- dusk sky: deep violet overhead, an ember glow where the sun has just set behind the far end
  {const sky=new T.Mesh(new T.SphereGeometry(260,48,24),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 vP;void main(){vP=normalize(position);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 vP;
      float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      void main(){float y=max(vP.y,0.);vec3 top=vec3(.006,.004,.016),mid=vec3(.07,.014,.035),hor=vec3(.55,.16,.1);
        vec3 c=mix(mid,top,smoothstep(.04,.3,y));c=mix(hor,c,smoothstep(.0,.1,y));
        float sun=max(dot(vP,normalize(vec3(0.,.02,-1.))),0.);c+=vec3(.9,.4,.2)*pow(sun,30.)*.5+vec3(.5,.1,.15)*pow(sun,5.)*.15;
        vec2 g=floor(vP.xz/(vP.y+.3)*260.);float st=step(.9985,h(g))*smoothstep(.25,.6,y);c+=vec3(st);
        gl_FragColor=vec4(c,1.);}`}));S.add(sky)}
  const cam=new T.PerspectiveCamera(38,1,.1,300);
  // studio reflections so leather, varnish and LED boards pick up real highlights
  if(T.RoomEnvironment){const pm=new T.PMREMGenerator(R);S.environment=pm.fromScene(new T.RoomEnvironment(),.04).texture}

  const tex=(w,h,draw,srgb=true)=>{const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const t=new T.CanvasTexture(c);if(srgb)t.encoding=T.sRGBEncoding;t.anisotropy=8;return t};
  const rnd=(a,b)=>a+Math.random()*(b-a);
  const glowTex=tex(128,128,(g)=>{const r=g.createRadialGradient(64,64,0,64,64,64);r.addColorStop(0,'rgba(255,255,255,1)');r.addColorStop(.25,'rgba(255,255,255,.35)');r.addColorStop(1,'rgba(255,255,255,0)');g.fillStyle=r;g.fillRect(0,0,128,128)});

  // ---- outfield: mown stripes + grain
  const grass=tex(1024,1024,(g,w,h)=>{for(let i=0;i<16;i++){g.fillStyle=i%2?'#1c4724':'#24592d';g.fillRect(0,i*h/16,w,h/16)}
    for(let i=0;i<60000;i++){g.fillStyle=`rgba(${rnd(10,70)|0},${rnd(60,130)|0},${rnd(15,50)|0},.28)`;g.fillRect(rnd(0,w),rnd(0,h),1,rnd(1,3))}});
  grass.wrapS=grass.wrapT=T.RepeatWrapping;grass.repeat.set(6,6);
  const ground=new T.Mesh(new T.CircleGeometry(48,96),new T.MeshStandardMaterial({map:grass,roughness:1,envMapIntensity:.15}));
  ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;S.add(ground);

  // ---- the strip, creases, footmarks
  const strip=tex(256,1024,(g,w,h)=>{g.fillStyle='#8a7752';g.fillRect(0,0,w,h);
    for(let i=0;i<9000;i++){g.fillStyle=`rgba(${rnd(90,150)|0},${rnd(75,125)|0},${rnd(45,85)|0},.35)`;g.fillRect(rnd(0,w),rnd(0,h),2,2)}
    for(const y of [140,h-140])for(let i=0;i<500;i++){g.fillStyle='rgba(90,70,40,.18)';g.beginPath();g.arc(w/2+rnd(-50,50),y+rnd(-60,60),rnd(2,7),0,7);g.fill()}
    g.fillStyle='#f4f1e8';[60,h-60].forEach(y=>{g.fillRect(0,y,w,5);g.fillRect(0,y+(y<h/2?55:-55),w,5);g.fillRect(28,y-60,5,120);g.fillRect(w-33,y-60,5,120)})});
  const pitch=new T.Mesh(new T.PlaneGeometry(3.05,20.1),new T.MeshStandardMaterial({map:strip,roughness:1,envMapIntensity:.1}));
  pitch.rotation.x=-Math.PI/2;pitch.position.set(0,.004,-8);pitch.receiveShadow=true;S.add(pitch);

  // ---- stumps + bails
  const wood=new T.MeshStandardMaterial({color:0xf3ead2,roughness:.35,metalness:0});
  const makeStumps=z=>{const grp=new T.Group(),bails=[];
    [-.11,0,.11].forEach(x=>{const s=new T.Mesh(new T.CylinderGeometry(.018,.018,.71,20),wood);s.position.set(x,.355,0);s.castShadow=true;grp.add(s)});
    [-.055,.055].forEach(x=>{const b=new T.Mesh(new T.CylinderGeometry(.009,.009,.11,10),wood);b.rotation.z=Math.PI/2;b.position.set(x,.72,0);b.castShadow=true;grp.add(b);bails.push({m:b,home:b.position.clone(),v:new T.Vector3(),spin:0})});
    grp.position.z=z;S.add(grp);return{grp,bails}};
  const near=makeStumps(1.28);makeStumps(-17.3);

  // ---- a real-scale bat resting against the near stumps
  const willow=tex(128,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,'#d9b98a');gr.addColorStop(.5,'#f0d9ad');gr.addColorStop(1,'#cfae7d');g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let x=0;x<w;x+=rnd(3,7)){g.strokeStyle=`rgba(150,110,60,${rnd(.15,.35)})`;g.lineWidth=rnd(.5,1.5);g.beginPath();g.moveTo(x,0);g.lineTo(x+rnd(-4,4),h);g.stroke()}
    g.fillStyle='#4a0e1c';g.fillRect(14,60,w-28,150);g.fillStyle='#dcb872';g.font='bold 30px Impact, sans-serif';g.save();g.translate(w/2,135);g.rotate(-Math.PI/2);g.textAlign='center';g.fillText('MAVERICKS',0,10);g.restore()});
  const bat=new T.Group();
  const blade=new T.Mesh(new T.BoxGeometry(.108,.56,.045,2,8,2),new T.MeshStandardMaterial({map:willow,roughness:.45}));blade.castShadow=true;bat.add(blade);
  const grip=tex(64,256,(g,w,h)=>{g.fillStyle='#1a0a0d';g.fillRect(0,0,w,h);for(let y=0;y<h;y+=10){g.fillStyle=y%20?'#4a0e1c':'#2a0a12';g.fillRect(0,y,w,5)}g.fillStyle='#dcb872';g.fillRect(0,h-26,w,6)});
  const handle=new T.Mesh(new T.CylinderGeometry(.017,.019,.3,16),new T.MeshStandardMaterial({map:grip,roughness:.9}));handle.position.y=.43;handle.castShadow=true;bat.add(handle);
  const knob=new T.Mesh(new T.SphereGeometry(.021,16,12),handle.material);knob.position.y=.58;bat.add(knob);
  bat.children.forEach(c=>c.position.y+=.28);bat.position.set(.36,0,1.52);bat.rotation.set(-.42,-.5,-.12);S.add(bat);

  // ---- hero ball: leather, stitched seam, lacquer
  const leather=tex(1024,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,'#6e0817');gr.addColorStop(.5,'#a8122e');gr.addColorStop(1,'#6e0817');
    g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let i=0;i<20000;i++){g.fillStyle=`rgba(${rnd(50,130)|0},0,${rnd(0,20)|0},.25)`;g.fillRect(rnd(0,w),rnd(0,h),1.5,1.5)}
    const y=h/2;g.fillStyle='#4e0510';g.fillRect(0,y-3,w,6);g.strokeStyle='#f6ecd8';g.lineWidth=2.4;
    for(const off of [-14,-8,8,14])for(let x=0;x<w;x+=9){g.beginPath();g.moveTo(x,y+off-3);g.lineTo(x+5,y+off+3);g.stroke()}
    g.strokeStyle='rgba(60,4,10,.5)';g.lineWidth=1.5;g.setLineDash([3,6]);[y-60,y+60].forEach(yy=>{g.beginPath();g.moveTo(0,yy);g.lineTo(w,yy);g.stroke()});
    g.setLineDash([]);g.fillStyle='rgba(220,184,114,.8)';g.font='bold 34px serif';g.fillText('BMCC',w*.62,h*.32)});
  const ballMat=new T.MeshPhysicalMaterial({map:leather,bumpMap:leather,bumpScale:.004,roughness:.36,metalness:0,clearcoat:.85,clearcoatRoughness:.18});
  const ball=new T.Mesh(new T.SphereGeometry(.36,96,96),ballMat);ball.castShadow=true;ball.rotation.z=.45;
  const ballPivot=new T.Group();ballPivot.add(ball);S.add(ballPivot);
  const halo=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xe8335a,transparent:true,opacity:.45,blending:T.AdditiveBlending,depthWrite:false}));halo.scale.set(2.4,2.4,1);halo.position.z=-.4;ballPivot.add(halo);

  // ---- the stands: tiered bowl, crowd, roof
  const prof=[];for(let i=0;i<=8;i++){prof.push(new T.Vector2(50+i*1.7,i*1.15));prof.push(new T.Vector2(50+(i+1)*1.7,i*1.15))}
  const stand=new T.Mesh(new T.LatheGeometry(prof,128),new T.MeshStandardMaterial({color:0x2a0a12,roughness:.9,side:T.DoubleSide}));S.add(stand);
  const CN=9000,cp=new Float32Array(CN*3),cc=new Float32Array(CN*3),pal=[[.55,.06,.14],[.86,.72,.45],[.9,.9,.88],[.35,.05,.1],[.2,.2,.25],[.75,.1,.2]];
  for(let i=0;i<CN;i++){const tier=Math.floor(rnd(0,8)),a=rnd(0,Math.PI*2),r=50+tier*1.7+rnd(.3,1.4),y=tier*1.15+1.25;
    cp.set([Math.cos(a)*r,y,Math.sin(a)*r],i*3);const c=pal[Math.random()<.45?0:Math.floor(rnd(0,pal.length))];cc.set(c.map(v=>v*rnd(.6,1)),i*3)}
  const cg=new T.BufferGeometry();cg.setAttribute('position',new T.BufferAttribute(cp,3));cg.setAttribute('color',new T.BufferAttribute(cc,3));
  const crowd=new T.Points(cg,new T.PointsMaterial({size:.55,vertexColors:true,sizeAttenuation:true}));S.add(crowd);
  const roof=new T.Mesh(new T.RingGeometry(52,58.5,128,1),new T.MeshStandardMaterial({color:0x14080b,side:T.DoubleSide,roughness:.8}));roof.rotation.x=Math.PI/2;roof.position.y=12.5;S.add(roof);
  const roofLights=new T.Mesh(new T.TorusGeometry(52.2,.12,8,128),new T.MeshBasicMaterial({color:0xfff2d8}));roofLights.rotation.x=Math.PI/2;roofLights.position.y=12.3;S.add(roofLights);

  // ---- scrolling LED boundary boards in club colours
  const led=tex(2048,64,(g,w,h)=>{g.fillStyle='#3a0a16';g.fillRect(0,0,w,h);g.font='bold 40px Impact, "Arial Narrow", sans-serif';g.textBaseline='middle';
    const msg=['BIRMINGHAM MAVERICKS','EST. 2024','SUNDAYS, PLAYED PROPERLY','13,116 RUNS SINCE 2024','643 WICKETS','OLD HALESONIANS CC'];let x=20,i=0;
    while(x<w){g.fillStyle=i%2?'#f1e8da':'#dcb872';const s=msg[i%msg.length]+'   ●   ';g.fillText(s,x,h/2+2);x+=g.measureText(s).width;i++}});
  led.wrapS=T.RepeatWrapping;led.repeat.set(-4,1);
  const boards=new T.Mesh(new T.CylinderGeometry(46,46,.9,160,1,true),new T.MeshStandardMaterial({map:led,emissiveMap:led,emissive:0xffffff,emissiveIntensity:.85,side:T.BackSide,roughness:.5}));
  boards.position.y=.45;S.add(boards);
  // boundary rope
  const rope=new T.Mesh(new T.TorusGeometry(44,.05,6,160),new T.MeshStandardMaterial({color:0xe8e2d4,roughness:.6}));rope.rotation.x=Math.PI/2;rope.position.y=.05;S.add(rope);
  // sight screen at the far end
  const screen=new T.Mesh(new T.PlaneGeometry(12,5.5),new T.MeshStandardMaterial({color:0x120709,roughness:.9}));screen.position.set(0,2.75,-45.5);S.add(screen);
  // scoreboard
  const sbTex=tex(1024,384,(g,w,h)=>{g.fillStyle='#0a0405';g.fillRect(0,0,w,h);g.strokeStyle='#dcb872';g.lineWidth=6;g.strokeRect(8,8,w-16,h-16);
    g.fillStyle='#dcb872';g.font='bold 54px Impact, sans-serif';g.textAlign='center';g.fillText('BIRMINGHAM MAVERICKS',w/2,84);
    g.font='bold 120px Impact, sans-serif';g.fillStyle='#ffb000';g.fillText('13116',w*.3,230);g.fillText('643',w*.72,230);
    g.font='bold 40px Impact, sans-serif';g.fillStyle='#f1e8da';g.fillText('RUNS',w*.3,300);g.fillText('WICKETS',w*.72,300);g.fillText('2024 – 2026',w/2,355)});
  const sb=new T.Mesh(new T.PlaneGeometry(14,5.25),new T.MeshStandardMaterial({map:sbTex,emissiveMap:sbTex,emissive:0xffffff,emissiveIntensity:1}));
  sb.position.set(9,8.6,-46);sb.lookAt(0,4,0);S.add(sb);

  // ---- floodlight pylons
  S.add(new T.HemisphereLight(0x9fb3ff,0x1a0b0e,.25));
  [[-30,-20],[30,-20],[-30,22],[30,22]].forEach(([x,z],i)=>{
    const pole=new T.Mesh(new T.CylinderGeometry(.25,.45,30,10),new T.MeshStandardMaterial({color:0x1b1c20,roughness:.7,metalness:.4}));pole.position.set(x,15,z);S.add(pole);
    const head=new T.Group();head.position.set(x,31,z);head.lookAt(0,0,-4);S.add(head);
    for(let r=0;r<3;r++)for(let c=0;c<5;c++){const lamp=new T.Mesh(new T.CircleGeometry(.32,16),new T.MeshBasicMaterial({color:0xfff4dc}));lamp.position.set((c-2)*.8,(r-1)*.8,.15);head.add(lamp)}
    const fl=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xfff2d6,transparent:true,opacity:.75,blending:T.AdditiveBlending,depthWrite:false,fog:false}));fl.scale.set(14,14,1);fl.position.set(x,31,z);S.add(fl);
    const L=new T.SpotLight(0xfff1dc,i<2?1.6:1.1,120,Math.PI/9,.45,1.1);L.position.set(x,31,z);L.target.position.set(0,0,-4);S.add(L,L.target);
    if(i<2){L.castShadow=true;L.shadow.mapSize.set(2048,2048);L.shadow.bias=-.0003;L.shadow.camera.near=10;L.shadow.camera.far=80}
  });
  const key=new T.PointLight(0xff6a80,.9,1.6);key.position.set(-1.2,1.4,1.8);ballPivot.add(key);

  // ---- moths and dust in the light
  const N=700,pos=new Float32Array(N*3),vel=[];
  for(let i=0;i<N;i++){pos.set([rnd(-14,14),rnd(.2,12),rnd(-30,4)],i*3);vel.push(rnd(.002,.01))}
  const pg=new T.BufferGeometry();pg.setAttribute('position',new T.BufferAttribute(pos,3));
  S.add(new T.Points(pg,new T.PointsMaterial({map:glowTex,size:.08,color:0xfff3d8,transparent:true,opacity:.6,blending:T.AdditiveBlending,depthWrite:false})));

  // ---- a live delivery: bowled from the far end, pitches, hits the stumps, bails fly
  const dball=new T.Mesh(new T.SphereGeometry(.036,24,16),new T.MeshPhysicalMaterial({color:0xa8122e,roughness:.35,clearcoat:.8}));dball.castShadow=true;S.add(dball);
  const trail=new T.Sprite(new T.SpriteMaterial({map:glowTex,color:0xff6a80,transparent:true,opacity:.5,blending:T.AdditiveBlending,depthWrite:false}));trail.scale.set(.25,.25,1);dball.add(trail);
  const P0=new T.Vector3(.15,2.2,-16),P1=new T.Vector3(.05,.04,-2.4),P2=new T.Vector3(0,.42,1.28);
  const CYCLE=5.2,T1=.62,T2=.9; // seconds: release→pitch, pitch→stumps
  let lastHit=-1;
  function delivery(t){const k=t%CYCLE;
    if(k<T1){const u=k/T1;dball.position.lerpVectors(P0,P1,u);dball.position.y=P0.y+(P1.y-P0.y)*u;dball.visible=true}
    else if(k<T1+(T2-T1)){const u=(k-T1)/(T2-T1);dball.position.lerpVectors(P1,P2,u);dball.position.y=P1.y+(P2.y-P1.y)*Math.sin(u*Math.PI/2);dball.visible=true}
    else{const u=k-T2;dball.position.set(P2.x+u*.4,Math.max(.04,P2.y-u*1.5),P2.z+u*1.2);dball.visible=u<1.4}
    const cyc=Math.floor(t/CYCLE);
    if(k>=T2&&lastHit!==cyc){lastHit=cyc;near.bails.forEach((b,i)=>{b.v.set(rnd(-.6,.6),rnd(1.6,2.4),rnd(.6,1.4));b.spin=rnd(6,12)*(i?1:-1)})}
    if(k<T1&&lastHit===cyc-1)near.bails.forEach(b=>{b.m.position.copy(b.home);b.m.rotation.set(0,0,Math.PI/2);b.v.set(0,0,0)});
  }
  function bails(dt){near.bails.forEach(b=>{if(b.v.lengthSq()===0)return;b.v.y-=9.8*dt;b.m.position.addScaledVector(b.v,dt);b.m.rotation.x+=b.spin*dt;
    if(b.m.position.y<.01){b.m.position.y=.01;b.v.multiplyScalar(.35);b.v.y=Math.abs(b.v.y)*.3;if(b.v.length()<.05)b.v.set(0,0,0)}})}

  // ---- bloom on lights and LEDs
  let composer=null;
  if(T.EffectComposer&&T.RenderPass&&T.UnrealBloomPass){composer=new T.EffectComposer(R);composer.addPass(new T.RenderPass(S,cam));
    composer.addPass(new T.UnrealBloomPass(new T.Vector2(1,1),.6,.5,.9))}

  let mx=0,my=0,tx=0,ty=0,sy=0,run=true,t0=performance.now(),prev=t0;
  addEventListener('pointermove',e=>{tx=e.clientX/innerWidth-.5;ty=e.clientY/innerHeight-.5},{passive:true});
  addEventListener('scroll',()=>{sy=Math.min(scrollY/innerHeight,1.2)},{passive:true});
  function size(){const w=hero.clientWidth,h=hero.clientHeight,nw=narrowQ();R.setSize(w,h,false);composer&&composer.setSize(w,h);
    cam.aspect=w/h;cam.fov=nw?54:38;cam.updateProjectionMatrix();ballPivot.position.set(nw?-.12:1.55,nw?1.95:1.15,nw?.9:1.0)}
  size();addEventListener('resize',size);
  new IntersectionObserver(([e])=>{run=e.isIntersecting;if(run&&!reduce){prev=performance.now();requestAnimationFrame(loop)}}).observe(hero);
  function loop(now){
    const t=(now-t0)/1000,dt=Math.min((now-prev)/1000,.05);prev=now;mx+=(tx-mx)*.05;my+=(ty-my)*.05;
    cam.position.set(Math.sin(t*.07)*.7+mx*1.2,1.05+sy*1.6-my*.4,4.6+sy*2.2);cam.lookAt(mx*.6,.75+sy*.3,-3);
    ball.rotation.x=t*-2.4;ballPivot.position.y+=Math.sin(t*1.6)*.0016;ballPivot.rotation.y=mx*.4;halo.material.opacity=.38+Math.sin(t*2)*.08;
    led.offset.x=(t*.012)%1;
    for(let i=0;i<N;i++){let y=pos[i*3+1]+vel[i];if(y>12)y=.2;pos[i*3+1]=y;pos[i*3]+=Math.sin(t+i)*.002}pg.attributes.position.needsUpdate=true;
    delivery(t);bails(dt);
    composer?composer.render():R.render(S,cam);
    if(run&&!reduce)requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();

/* ---------- 2D fallback ball ---------- */
(function(){
  if(document.documentElement.classList.contains('has3d'))return;
  if(!document.getElementById('ball'))return;
  const c=document.getElementById('ball'),x=c.getContext('2d');
  let W,R,dpr;
  function size(){dpr=Math.min(devicePixelRatio||1,2);const b=c.getBoundingClientRect();W=b.width*dpr;c.width=c.height=W;R=W*.3}
  size();addEventListener('resize',size);
  // seam = great circle in XZ plane; stitches on both sides
  const N=220,seam=[];for(let i=0;i<N;i++){const t=i/N*Math.PI*2;seam.push([Math.cos(t),0,Math.sin(t),t])}
  let spin=0,scrollTilt=0;
  addEventListener('scroll',()=>{scrollTilt=Math.min(scrollY/600,1)},{passive:true});
  function rot(p,a,b){ // rotate around Y by a then X by b
    let [px,py,pz]=p;let ca=Math.cos(a),sa=Math.sin(a);[px,pz]=[px*ca+pz*sa,-px*sa+pz*ca];
    let cb=Math.cos(b),sb=Math.sin(b);[py,pz]=[py*cb-pz*sb,py*sb+pz*cb];return[px,py,pz]}
  function frame(){
    x.clearRect(0,0,W,W);const cx=W/2,cy=W/2;
    // glow
    let g=x.createRadialGradient(cx,cy,R*.6,cx,cy,R*1.62);g.addColorStop(0,'rgba(255,59,79,.45)');g.addColorStop(1,'rgba(255,59,79,0)');x.fillStyle=g;x.fillRect(0,0,W,W);
    // shadow
    x.save();x.translate(cx,cy+R*1.32);x.scale(1,.18);g=x.createRadialGradient(0,0,0,0,0,R);g.addColorStop(0,'rgba(0,0,0,.7)');g.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=g;x.beginPath();x.arc(0,0,R,0,7);x.fill();x.restore();
    // body
    g=x.createRadialGradient(cx-R*.38,cy-R*.42,R*.05,cx,cy,R*1.05);
    g.addColorStop(0,'#ff6a72');g.addColorStop(.25,'#d01c34');g.addColorStop(.7,'#7d0a1a');g.addColorStop(1,'#2a0308');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
    // seam
    const tiltX=.55+scrollTilt*.5, a=spin;
    const tilt=(p)=>{let q=rot(p,a,0);// spin about Y, seam tilted about Z
      const tz=.35,ct=Math.cos(tz),st=Math.sin(tz);q=[q[0]*ct-q[1]*st,q[0]*st+q[1]*ct,q[2]];return rot(q,0,tiltX)};
    const off=[-.07,-.035,.035,.07];
    off.forEach((o,k)=>{
      x.lineWidth=(k===1||k===2?2.2:1.3)*dpr;
      for(let i=0;i<N;i++){
        const s=seam[i],t=s[3];
        const p=[Math.cos(t)*Math.cos(o),Math.sin(o),Math.sin(t)*Math.cos(o)];
        const q=tilt(p);if(q[2]<0)continue; // back face
        const shade=.35+.65*q[2];
        if(k===1||k===2){ // stitched rows
          if(i%2)continue;
          const t2=t+Math.PI*2/N*1.2,p2=[Math.cos(t2)*Math.cos(o*1.9),Math.sin(o*1.9),Math.sin(t2)*Math.cos(o*1.9)],q2=tilt(p2);
          x.strokeStyle=`rgba(250,240,225,${.9*shade})`;x.beginPath();x.moveTo(cx+q[0]*R,cy+q[1]*R);x.lineTo(cx+q2[0]*R,cy+q2[1]*R);x.stroke();
        }else{
          const n=seam[(i+1)%N][3],p2=[Math.cos(n)*Math.cos(o),Math.sin(o),Math.sin(n)*Math.cos(o)],q2=tilt(p2);
          x.strokeStyle=`rgba(70,4,12,${.8*shade})`;x.beginPath();x.moveTo(cx+q[0]*R,cy+q[1]*R);x.lineTo(cx+q2[0]*R,cy+q2[1]*R);x.stroke();
        }
      }
    });
    // specular + rim
    g=x.createRadialGradient(cx-R*.42,cy-R*.48,0,cx-R*.42,cy-R*.48,R*.55);g.addColorStop(0,'rgba(255,255,255,.55)');g.addColorStop(1,'rgba(255,255,255,0)');
    x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,7);x.fill();
    x.strokeStyle='rgba(255,140,150,.25)';x.lineWidth=1.5*dpr;x.beginPath();x.arc(cx,cy,R-.75*dpr,Math.PI*.1,Math.PI*.9);x.stroke();
    spin+=reduce?0:.012;
    if(!reduce)requestAnimationFrame(frame);
  }
  frame();
})();

/* ---------- squad carousel ---------- */
/* Season totals: data/players.json (stats-playcricket.mjs). Embedded copy below is used if it can't load. */
let PLAYERS={"syncedAt":"2026-10-08T14:17:24.362Z","season":2026,"seasons":[2024,2025,2026],"matches":89,"team":{"runs":13116,"wkts":643,"sixes":380,"fours":1379,"fifties":65},"bySeason":{"2024":{"matches":6,"runs":584,"wkts":32},"2025":{"matches":32,"runs":4901,"wkts":221},"2026":{"matches":51,"runs":7631,"wkts":390}},"players":[{"id":"6370806","name":"Ashif Ashraf","matches":56,"batting":{"inns":53,"no":3,"runs":1540,"balls":1248,"fours":158,"sixes":86,"hs":"132","fifties":10,"hundreds":2,"ducks":4,"avg":30.8,"sr":121.63},"bowling":{"overs":"263.5","maidens":13,"runs":1465,"wkts":64,"best":"4/15","avg":22.89,"econ":5.55},"catches":7},{"id":"6371498","name":"Majid Mohammed","matches":52,"batting":{"inns":49,"no":9,"runs":1366,"balls":1430,"fours":183,"sixes":28,"hs":"100","fifties":10,"hundreds":1,"ducks":2,"avg":34.15,"sr":92.03},"bowling":{"overs":"11","maidens":1,"runs":41,"wkts":3,"best":"1/7","avg":13.67,"econ":3.73},"catches":37},{"id":"3736695","name":"Javad Ismail","matches":61,"batting":{"inns":51,"no":6,"runs":1026,"balls":1110,"fours":137,"sixes":20,"hs":"113","fifties":6,"hundreds":1,"ducks":5,"avg":22.8,"sr":82.97},"bowling":{"overs":"11","maidens":0,"runs":78,"wkts":2,"best":"1/7","avg":39,"econ":7.09},"catches":42},{"id":"6172313","name":"Shibin Iqbal","matches":51,"batting":{"inns":47,"no":6,"runs":1000,"balls":617,"fours":106,"sixes":41,"hs":"72","fifties":8,"hundreds":0,"ducks":2,"avg":24.39,"sr":123.66},"bowling":{"overs":"134.3","maidens":8,"runs":814,"wkts":41,"best":"5/25","avg":19.85,"econ":6.05},"catches":19},{"id":"6575131","name":"Kamal Pankajakshan","matches":51,"batting":{"inns":47,"no":4,"runs":864,"balls":819,"fours":113,"sixes":31,"hs":"60","fifties":2,"hundreds":0,"ducks":1,"avg":20.09,"sr":100.24},"bowling":{"overs":"9","maidens":0,"runs":83,"wkts":3,"best":"3/18","avg":27.67,"econ":9.22},"catches":13},{"id":"6184742","name":"Kaushik Bandari","matches":30,"batting":{"inns":29,"no":2,"runs":737,"balls":723,"fours":74,"sixes":28,"hs":"90","fifties":6,"hundreds":0,"ducks":1,"avg":27.3,"sr":98.34},"bowling":{"overs":"111.4","maidens":5,"runs":628,"wkts":28,"best":"4/22","avg":22.43,"econ":5.62},"catches":3},{"id":"6822717","name":"Navaneeth Chandu","matches":27,"batting":{"inns":23,"no":8,"runs":585,"balls":399,"fours":58,"sixes":6,"hs":"140*","fifties":1,"hundreds":1,"ducks":2,"avg":39,"sr":90.98},"bowling":{"overs":"53.1","maidens":2,"runs":299,"wkts":9,"best":"2/6","avg":33.22,"econ":5.62},"catches":8},{"id":"6336434","name":"Mohammed KM","matches":48,"batting":{"inns":39,"no":7,"runs":527,"balls":1061,"fours":44,"sixes":5,"hs":"73","fifties":1,"hundreds":0,"ducks":3,"avg":16.47,"sr":49.29},"bowling":{"overs":"38.2","maidens":6,"runs":274,"wkts":8,"best":"2/0","avg":34.25,"econ":7.15},"catches":5},{"id":"6790522","name":"Ribin Paulose","matches":21,"batting":{"inns":20,"no":6,"runs":512,"balls":310,"fours":41,"sixes":15,"hs":"66","fifties":3,"hundreds":0,"ducks":1,"avg":36.57,"sr":106.45},"bowling":{"overs":"59","maidens":3,"runs":386,"wkts":14,"best":"3/23","avg":27.57,"econ":6.54},"catches":2},{"id":"6370790","name":"Mohammed Riyaz","matches":64,"batting":{"inns":36,"no":9,"runs":483,"balls":885,"fours":63,"sixes":2,"hs":"130","fifties":0,"hundreds":1,"ducks":6,"avg":17.89,"sr":54.46},"bowling":{"overs":"296.2","maidens":26,"runs":1604,"wkts":65,"best":"6/26","avg":24.68,"econ":5.41},"catches":10},{"id":"6950078","name":"Muhammed Mishal","matches":25,"batting":{"inns":23,"no":6,"runs":441,"balls":308,"fours":34,"sixes":37,"hs":"87*","fifties":1,"hundreds":0,"ducks":0,"avg":25.94,"sr":142.21},"bowling":{"overs":"21","maidens":1,"runs":125,"wkts":7,"best":"2/7","avg":17.86,"econ":5.95},"catches":11},{"id":"6563076","name":"Jithu Shijo","matches":31,"batting":{"inns":24,"no":3,"runs":385,"balls":311,"fours":49,"sixes":13,"hs":"54","fifties":1,"hundreds":0,"ducks":2,"avg":18.33,"sr":113.5},"bowling":{"overs":"167.2","maidens":18,"runs":856,"wkts":40,"best":"5/44","avg":21.4,"econ":5.12},"catches":13},{"id":"6575112","name":"Arun raj VMK","matches":21,"batting":{"inns":18,"no":5,"runs":287,"balls":223,"fours":24,"sixes":8,"hs":"63*","fifties":2,"hundreds":0,"ducks":3,"avg":22.08,"sr":94.62},"bowling":{"overs":"4","maidens":0,"runs":43,"wkts":1,"best":"1/43","avg":43,"econ":10.75},"catches":5},{"id":"","name":"Unsure","matches":7,"batting":{"inns":31,"no":4,"runs":280,"balls":51,"fours":1,"sixes":0,"hs":"53*","fifties":1,"hundreds":0,"ducks":7,"avg":10.37,"sr":50.98},"bowling":{"overs":"48.1","maidens":2,"runs":298,"wkts":8,"best":"3/41","avg":37.25,"econ":6.19},"catches":32},{"id":"6375598","name":"Sasi Kumar","matches":19,"batting":{"inns":16,"no":3,"runs":264,"balls":333,"fours":24,"sixes":2,"hs":"58","fifties":2,"hundreds":0,"ducks":2,"avg":20.31,"sr":64.26},"bowling":{"overs":"44.1","maidens":3,"runs":254,"wkts":9,"best":"5/23","avg":28.22,"econ":5.75},"catches":6},{"id":"5383978","name":"Blesson Varghese","matches":4,"batting":{"inns":4,"no":2,"runs":237,"balls":246,"fours":23,"sixes":6,"hs":"133*","fifties":1,"hundreds":1,"ducks":0,"avg":118.5,"sr":96.34},"bowling":{"overs":"21","maidens":0,"runs":108,"wkts":4,"best":"3/42","avg":27,"econ":5.14},"catches":2},{"id":"6478440","name":"Sajidh Thottathil","matches":23,"batting":{"inns":21,"no":2,"runs":229,"balls":192,"fours":25,"sixes":4,"hs":"35","fifties":0,"hundreds":0,"ducks":1,"avg":12.05,"sr":98.96},"bowling":{"overs":"67.2","maidens":4,"runs":411,"wkts":17,"best":"4/23","avg":24.18,"econ":6.1},"catches":2},{"id":"6572528","name":"Rajesh Ravi","matches":26,"batting":{"inns":23,"no":1,"runs":224,"balls":174,"fours":27,"sixes":1,"hs":"31","fifties":0,"hundreds":0,"ducks":5,"avg":10.18,"sr":79.89},"bowling":{"overs":"11.3","maidens":0,"runs":101,"wkts":7,"best":"3/12","avg":14.43,"econ":8.78},"catches":6},{"id":"6983250","name":"Akash Nair","matches":19,"batting":{"inns":17,"no":5,"runs":218,"balls":231,"fours":18,"sixes":5,"hs":"42*","fifties":0,"hundreds":0,"ducks":3,"avg":18.17,"sr":60.61},"bowling":{"overs":"48.3","maidens":4,"runs":245,"wkts":17,"best":"2/4","avg":14.41,"econ":5.05},"catches":1},{"id":"6372086","name":"Jawid Tk","matches":38,"batting":{"inns":26,"no":6,"runs":196,"balls":245,"fours":19,"sixes":3,"hs":"22","fifties":0,"hundreds":0,"ducks":5,"avg":9.8,"sr":75.51},"bowling":{"overs":"121.1","maidens":8,"runs":763,"wkts":37,"best":"3/24","avg":20.62,"econ":6.3},"catches":11},{"id":"6571812","name":"Rizal Mohammed","matches":44,"batting":{"inns":29,"no":11,"runs":194,"balls":450,"fours":16,"sixes":1,"hs":"35","fifties":0,"hundreds":0,"ducks":3,"avg":10.78,"sr":40},"bowling":{"overs":"108.3","maidens":9,"runs":674,"wkts":25,"best":"3/11","avg":26.96,"econ":6.21},"catches":10},{"id":"6157513","name":"Nihas Thajudeen Mohammed","matches":18,"batting":{"inns":16,"no":1,"runs":179,"balls":204,"fours":23,"sixes":0,"hs":"57","fifties":1,"hundreds":0,"ducks":1,"avg":11.93,"sr":58.33},"bowling":{"overs":"4","maidens":0,"runs":43,"wkts":0,"best":"0/12","avg":null,"econ":10.75},"catches":18},{"id":"6371476","name":"muhammed siyad Kalidh","matches":50,"batting":{"inns":29,"no":10,"runs":168,"balls":356,"fours":11,"sixes":1,"hs":"20","fifties":0,"hundreds":0,"ducks":5,"avg":8.84,"sr":41.85},"bowling":{"overs":"280","maidens":18,"runs":1388,"wkts":59,"best":"4/12","avg":23.53,"econ":4.96},"catches":9},{"id":"7136010","name":"Shino Shino","matches":6,"batting":{"inns":5,"no":0,"runs":145,"balls":41,"fours":16,"sixes":3,"hs":"86","fifties":1,"hundreds":0,"ducks":0,"avg":29,"sr":56.1},"bowling":{"overs":"28","maidens":2,"runs":209,"wkts":9,"best":"5/29","avg":23.22,"econ":7.46},"catches":3},{"id":"6478371","name":"Shaheen Syed","matches":16,"batting":{"inns":13,"no":3,"runs":133,"balls":91,"fours":11,"sixes":6,"hs":"28","fifties":0,"hundreds":0,"ducks":2,"avg":13.3,"sr":119.78},"bowling":{"overs":"41.1","maidens":3,"runs":277,"wkts":6,"best":"2/28","avg":46.17,"econ":6.73},"catches":2},{"id":"7157725","name":"Nithin Nithin","matches":3,"batting":{"inns":3,"no":0,"runs":91,"balls":46,"fours":5,"sixes":9,"hs":"55","fifties":1,"hundreds":0,"ducks":0,"avg":30.33,"sr":78.26},"bowling":{"overs":"6","maidens":2,"runs":40,"wkts":1,"best":"1/4","avg":40,"econ":6.67},"catches":1},{"id":"6377848","name":"SHINAJ NAWSHAD POOVAN KULATHIL","matches":30,"batting":{"inns":16,"no":5,"runs":81,"balls":78,"fours":10,"sixes":1,"hs":"25*","fifties":0,"hundreds":0,"ducks":3,"avg":7.36,"sr":91.03},"bowling":{"overs":"60","maidens":0,"runs":424,"wkts":11,"best":"2/5","avg":38.55,"econ":7.07},"catches":5},{"id":"6917724","name":"Mohammed Ishaq","matches":18,"batting":{"inns":14,"no":2,"runs":80,"balls":79,"fours":5,"sixes":4,"hs":"25","fifties":0,"hundreds":0,"ducks":0,"avg":6.67,"sr":75.95},"bowling":{"overs":"37.1","maidens":0,"runs":238,"wkts":14,"best":"3/14","avg":17,"econ":6.4},"catches":2},{"id":"6800085","name":"Yoosaf Ibrahim","matches":22,"batting":{"inns":14,"no":7,"runs":79,"balls":80,"fours":11,"sixes":1,"hs":"24","fifties":0,"hundreds":0,"ducks":2,"avg":11.29,"sr":65},"bowling":{"overs":"94.2","maidens":5,"runs":550,"wkts":27,"best":"3/32","avg":20.37,"econ":5.83},"catches":2},{"id":"5626577","name":"Habeeb Pk","matches":8,"batting":{"inns":6,"no":2,"runs":55,"balls":81,"fours":7,"sixes":0,"hs":"40*","fifties":0,"hundreds":0,"ducks":3,"avg":13.75,"sr":67.9},"bowling":{"overs":"42.5","maidens":5,"runs":227,"wkts":14,"best":"5/29","avg":16.21,"econ":5.3},"catches":0},{"id":"7077748","name":"Shyam Valsala","matches":7,"batting":{"inns":7,"no":2,"runs":50,"balls":43,"fours":5,"sixes":2,"hs":"27","fifties":0,"hundreds":0,"ducks":3,"avg":10,"sr":116.28},"bowling":{"overs":"5","maidens":0,"runs":35,"wkts":1,"best":"1/17","avg":35,"econ":7},"catches":0},{"id":"7157723","name":"Vinu Vinu","matches":6,"batting":{"inns":5,"no":2,"runs":50,"balls":25,"fours":3,"sixes":4,"hs":"21*","fifties":0,"hundreds":0,"ducks":0,"avg":16.67,"sr":168},"bowling":{"overs":"16","maidens":0,"runs":119,"wkts":9,"best":"3/22","avg":13.22,"econ":7.44},"catches":1},{"id":"6537789","name":"Muhammed Rimshan K T","matches":6,"batting":{"inns":5,"no":0,"runs":45,"balls":46,"fours":6,"sixes":3,"hs":"23","fifties":0,"hundreds":0,"ducks":2,"avg":9,"sr":97.83},"bowling":{"overs":"8","maidens":0,"runs":42,"wkts":2,"best":"1/2","avg":21,"econ":5.25},"catches":4},{"id":"6983254","name":"Nawab Jan","matches":5,"batting":{"inns":4,"no":0,"runs":39,"balls":38,"fours":2,"sixes":1,"hs":"24","fifties":0,"hundreds":0,"ducks":1,"avg":9.75,"sr":65.79},"bowling":{"overs":"12","maidens":0,"runs":68,"wkts":2,"best":"1/19","avg":34,"econ":5.67},"catches":1},{"id":"6373954","name":"Muhammad Muhsin","matches":3,"batting":{"inns":2,"no":0,"runs":37,"balls":74,"fours":3,"sixes":0,"hs":"22","fifties":0,"hundreds":0,"ducks":0,"avg":18.5,"sr":50},"bowling":{"overs":"4","maidens":2,"runs":18,"wkts":2,"best":"2/18","avg":9,"econ":4.5},"catches":1},{"id":"6822716","name":"Eldose Pandaley","matches":3,"batting":{"inns":3,"no":0,"runs":37,"balls":23,"fours":4,"sixes":2,"hs":"19","fifties":0,"hundreds":0,"ducks":0,"avg":12.33,"sr":91.3},"bowling":{"overs":"12.1","maidens":0,"runs":58,"wkts":3,"best":"2/28","avg":19.33,"econ":4.77},"catches":1},{"id":"6806320","name":"Rayan -","matches":1,"batting":{"inns":1,"no":0,"runs":31,"balls":21,"fours":3,"sixes":1,"hs":"31","fifties":0,"hundreds":0,"ducks":0,"avg":31,"sr":147.62},"bowling":{"overs":"3","maidens":0,"runs":31,"wkts":0,"best":"0/31","avg":null,"econ":10.33},"catches":1},{"id":"6982961","name":"Nadeer Kariyari","matches":20,"batting":{"inns":11,"no":1,"runs":30,"balls":59,"fours":2,"sixes":0,"hs":"9*","fifties":0,"hundreds":0,"ducks":4,"avg":3,"sr":23.73},"bowling":{"overs":"63","maidens":4,"runs":397,"wkts":16,"best":"3/11","avg":24.81,"econ":6.3},"catches":3},{"id":"6447792","name":"Shabeeb Puzhakkal","matches":18,"batting":{"inns":8,"no":4,"runs":28,"balls":51,"fours":1,"sixes":0,"hs":"8","fifties":0,"hundreds":0,"ducks":0,"avg":7,"sr":47.06},"bowling":{"overs":"69","maidens":3,"runs":399,"wkts":13,"best":"2/5","avg":30.69,"econ":5.78},"catches":1},{"id":"6478288","name":"Musthafa TMK","matches":19,"batting":{"inns":8,"no":4,"runs":20,"balls":30,"fours":1,"sixes":0,"hs":"7*","fifties":0,"hundreds":0,"ducks":2,"avg":5,"sr":43.33},"bowling":{"overs":"37","maidens":0,"runs":251,"wkts":10,"best":"3/12","avg":25.1,"econ":6.78},"catches":4},{"id":"6790532","name":"Manu Manu","matches":1,"batting":{"inns":1,"no":0,"runs":19,"balls":0,"fours":0,"sixes":0,"hs":"19","fifties":0,"hundreds":0,"ducks":0,"avg":19,"sr":null},"bowling":{"overs":"2","maidens":0,"runs":19,"wkts":0,"best":"0/19","avg":null,"econ":9.5},"catches":0},{"id":"6774459","name":"Biju Cherumambayil","matches":17,"batting":{"inns":7,"no":3,"runs":16,"balls":32,"fours":2,"sixes":0,"hs":"10*","fifties":0,"hundreds":0,"ducks":3,"avg":4,"sr":50},"bowling":{"overs":"55.2","maidens":3,"runs":399,"wkts":22,"best":"3/10","avg":18.14,"econ":7.21},"catches":3},{"id":"","name":"Lifath Nazeer","matches":1,"batting":{"inns":1,"no":0,"runs":12,"balls":11,"fours":2,"sixes":0,"hs":"12","fifties":0,"hundreds":0,"ducks":0,"avg":12,"sr":109.09},"bowling":{"overs":"15","maidens":8,"runs":13,"wkts":0,"best":"0/13","avg":null,"econ":0.87},"catches":0},{"id":"7230719","name":"Fajal -","matches":1,"batting":{"inns":1,"no":1,"runs":11,"balls":0,"fours":0,"sixes":0,"hs":"11*","fifties":0,"hundreds":0,"ducks":0,"avg":null,"sr":null},"bowling":{"overs":"2","maidens":0,"runs":5,"wkts":1,"best":"1/5","avg":5,"econ":2.5},"catches":0},{"id":"","name":"Fathima Palakkat","matches":1,"batting":{"inns":1,"no":0,"runs":10,"balls":9,"fours":2,"sixes":0,"hs":"10","fifties":0,"hundreds":0,"ducks":0,"avg":10,"sr":111.11},"bowling":{"overs":"15","maidens":9,"runs":9,"wkts":1,"best":"1/9","avg":9,"econ":0.6},"catches":0},{"id":"","name":"Sameera Kadoli","matches":1,"batting":{"inns":1,"no":0,"runs":9,"balls":9,"fours":1,"sixes":0,"hs":"9","fifties":0,"hundreds":0,"ducks":0,"avg":9,"sr":100},"bowling":{"overs":"15","maidens":2,"runs":24,"wkts":0,"best":"0/24","avg":null,"econ":1.6},"catches":0},{"id":"","name":"Ashsraf Pk","matches":1,"batting":{"inns":1,"no":0,"runs":8,"balls":17,"fours":1,"sixes":0,"hs":"8","fifties":0,"hundreds":0,"ducks":0,"avg":8,"sr":47.06},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0},{"id":"6447721","name":"Lukman Sadique Chelakkara","matches":1,"batting":{"inns":1,"no":0,"runs":7,"balls":11,"fours":1,"sixes":0,"hs":"7","fifties":0,"hundreds":0,"ducks":0,"avg":7,"sr":63.64},"bowling":{"overs":"7","maidens":0,"runs":58,"wkts":0,"best":"0/58","avg":null,"econ":8.29},"catches":0},{"id":"6447733","name":"Hari Kalluri","matches":2,"batting":{"inns":2,"no":1,"runs":7,"balls":17,"fours":1,"sixes":0,"hs":"4","fifties":0,"hundreds":0,"ducks":0,"avg":7,"sr":41.18},"bowling":{"overs":"6","maidens":1,"runs":39,"wkts":1,"best":"1/39","avg":39,"econ":6.5},"catches":0},{"id":"","name":"Juma Faisal","matches":1,"batting":{"inns":1,"no":0,"runs":7,"balls":12,"fours":0,"sixes":0,"hs":"7","fifties":0,"hundreds":0,"ducks":0,"avg":7,"sr":58.33},"bowling":{"overs":"10","maidens":2,"runs":25,"wkts":0,"best":"0/25","avg":null,"econ":2.5},"catches":0},{"id":"6806322","name":"Yusuf -","matches":3,"batting":{"inns":3,"no":0,"runs":6,"balls":7,"fours":0,"sixes":0,"hs":"6","fifties":0,"hundreds":0,"ducks":2,"avg":2,"sr":0},"bowling":{"overs":"5.2","maidens":0,"runs":31,"wkts":2,"best":"1/5","avg":15.5,"econ":5.81},"catches":2},{"id":"","name":"Shibina Mol","matches":1,"batting":{"inns":1,"no":0,"runs":6,"balls":11,"fours":1,"sixes":0,"hs":"6","fifties":0,"hundreds":0,"ducks":0,"avg":6,"sr":54.55},"bowling":{"overs":"15","maidens":3,"runs":30,"wkts":0,"best":"0/30","avg":null,"econ":2},"catches":0},{"id":"6477467","name":"Shemeer Khan","matches":1,"batting":{"inns":1,"no":0,"runs":5,"balls":10,"fours":1,"sixes":0,"hs":"5","fifties":0,"hundreds":0,"ducks":0,"avg":5,"sr":50},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0},{"id":"6478416","name":"Salmanul Faris","matches":2,"batting":{"inns":1,"no":0,"runs":5,"balls":5,"fours":1,"sixes":0,"hs":"5","fifties":0,"hundreds":0,"ducks":0,"avg":5,"sr":100},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0},{"id":"","name":"Jaseela Jaseela","matches":1,"batting":{"inns":1,"no":0,"runs":4,"balls":8,"fours":0,"sixes":0,"hs":"4","fifties":0,"hundreds":0,"ducks":0,"avg":4,"sr":50},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0},{"id":"","name":"Shihana Shibi","matches":1,"batting":{"inns":1,"no":0,"runs":3,"balls":13,"fours":0,"sixes":0,"hs":"3","fifties":0,"hundreds":0,"ducks":0,"avg":3,"sr":23.08},"bowling":{"overs":"15","maidens":5,"runs":21,"wkts":0,"best":"0/21","avg":null,"econ":1.4},"catches":0},{"id":"","name":"Naseeha NaseehA","matches":1,"batting":{"inns":1,"no":0,"runs":3,"balls":9,"fours":0,"sixes":0,"hs":"3","fifties":0,"hundreds":0,"ducks":0,"avg":3,"sr":33.33},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0},{"id":"","name":"Neha Neha","matches":1,"batting":{"inns":1,"no":0,"runs":2,"balls":7,"fours":0,"sixes":0,"hs":"2","fifties":0,"hundreds":0,"ducks":0,"avg":2,"sr":28.57},"bowling":{"overs":"5","maidens":0,"runs":16,"wkts":0,"best":"0/16","avg":null,"econ":3.2},"catches":0},{"id":"6413670","name":"Shaheen Shaheen","matches":2,"batting":{"inns":1,"no":0,"runs":1,"balls":2,"fours":0,"sixes":0,"hs":"1","fifties":0,"hundreds":0,"ducks":0,"avg":1,"sr":50},"bowling":{"overs":"6","maidens":0,"runs":21,"wkts":2,"best":"2/14","avg":10.5,"econ":3.5},"catches":0},{"id":"7085608","name":"Ajin Appukuttan","matches":1,"batting":{"inns":1,"no":0,"runs":1,"balls":4,"fours":0,"sixes":0,"hs":"1","fifties":0,"hundreds":0,"ducks":0,"avg":1,"sr":25},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0},{"id":"","name":"Nihal Nihal","matches":1,"batting":{"inns":1,"no":0,"runs":1,"balls":11,"fours":0,"sixes":0,"hs":"1","fifties":0,"hundreds":0,"ducks":0,"avg":1,"sr":9.09},"bowling":{"overs":"10","maidens":4,"runs":18,"wkts":2,"best":"2/18","avg":9,"econ":1.8},"catches":0},{"id":"6413669","name":"Achu A","matches":1,"batting":{"inns":0,"no":0,"runs":0,"balls":0,"fours":0,"sixes":0,"hs":"0","fifties":0,"hundreds":0,"ducks":0,"avg":null,"sr":null},"bowling":{"overs":"3","maidens":0,"runs":14,"wkts":2,"best":"2/14","avg":7,"econ":4.67},"catches":0},{"id":"6413668","name":"Achu Achu","matches":1,"batting":{"inns":0,"no":0,"runs":0,"balls":0,"fours":0,"sixes":0,"hs":"0","fifties":0,"hundreds":0,"ducks":0,"avg":null,"sr":null},"bowling":{"overs":"2","maidens":0,"runs":11,"wkts":1,"best":"1/11","avg":11,"econ":5.5},"catches":0},{"id":"6477465","name":"Raj Arun","matches":3,"batting":{"inns":2,"no":0,"runs":0,"balls":9,"fours":0,"sixes":0,"hs":"0","fifties":0,"hundreds":0,"ducks":2,"avg":0,"sr":0},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":1},{"id":"6477466","name":"Ribin Poulose","matches":1,"batting":{"inns":1,"no":0,"runs":0,"balls":4,"fours":0,"sixes":0,"hs":"0","fifties":0,"hundreds":0,"ducks":1,"avg":0,"sr":0},"bowling":{"overs":"6","maidens":1,"runs":31,"wkts":1,"best":"1/31","avg":31,"econ":5.17},"catches":0},{"id":"6790523","name":"Shamnad Shamnad","matches":1,"batting":{"inns":1,"no":1,"runs":0,"balls":0,"fours":0,"sixes":0,"hs":"0*","fifties":0,"hundreds":0,"ducks":0,"avg":null,"sr":null},"bowling":{"overs":"4","maidens":0,"runs":10,"wkts":0,"best":"0/10","avg":null,"econ":2.5},"catches":0},{"id":"6806319","name":"Riyaz -","matches":1,"batting":{"inns":0,"no":0,"runs":0,"balls":0,"fours":0,"sixes":0,"hs":"0","fifties":0,"hundreds":0,"ducks":0,"avg":null,"sr":null},"bowling":{"overs":"1","maidens":0,"runs":13,"wkts":0,"best":"0/13","avg":null,"econ":13},"catches":1},{"id":"","name":"Krishna K","matches":1,"batting":{"inns":0,"no":0,"runs":0,"balls":0,"fours":0,"sixes":0,"hs":"0","fifties":0,"hundreds":0,"ducks":0,"avg":null,"sr":null},"bowling":{"overs":"0","maidens":0,"runs":0,"wkts":0,"best":null,"avg":null,"econ":null},"catches":0}]};
/* Photos: put each player's photo at players/<slug>.jpg (portrait, ideally 800x1080).
   Missing photos fall back to a silhouette in the player's colour. */
const FEATURED=[
  {pc:'Ashif Ashraf',n:'Ashif Ashraf',role:'Top-order bat & seamer',h:342},
  {pc:'Shibin Iqbal',n:'Shibin Iqbal',role:'All-rounder',h:350},
  {pc:'Mohammed Riyaz',n:'Mohammed Riyaz',role:'Team manager · opening bowler',h:338},
  {pc:'Mohammed KM',n:'Mohammed Kattakath',role:'Middle order · safeguarding officer',h:2},
  {pc:'Majid Mohammed',n:'Majid Mohammed',role:'Vice-captain · top-order bat',h:352},
  {pc:'Javad Ismail',n:'Javad Ismail',role:'Club captain · wicketkeeper',h:334},
  {pc:'muhammed siyad Kalidh',n:'Muhammed Siyad Kalidh',role:'Seam bowler',h:336},
  {pc:'Kamal Pankajakshan',n:'Kamal Pankajakshan',role:'Middle-order bat',h:358},
  {pc:'Navaneeth Chandu',n:'Navaneeth Chandu',role:'Top-order batter',h:346},
  {pc:'Kaushik Bandari',n:'Kaushik Bandari',role:'All-rounder',h:356},
  {pc:'Jithu Shijo',n:'Jithu Shijo',role:'Seam bowler',h:348},
  {pc:'Muhammed Mishal',n:'Muhammed Mishal',role:'Finisher',h:4},
  {pc:'Ribin Paulose',n:'Ribin Paulose',role:'Batting all-rounder',h:340},
  {pc:'Biju Cherumambayil',n:'Biju Cherumambayil',role:'Bowler',h:344},
  {pc:'Shaheen Syed',n:'Shaheen Syed',role:'All-rounder',h:340},
  {pc:'SHINAJ NAWSHAD POOVAN KULATHIL',n:'Shinaj Nawshad',role:'Bowler',h:348},
  {pc:'Musthafa TMK',n:'Musthafa TMK',role:'Bowler',h:336},
  {pc:'Rizal Mohammed',n:'Rizal Mohammed',role:'Bowler',h:344},
];
const slug=s=>s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
const statFor=name=>PLAYERS.players.find(p=>(p.pcName||p.name).toLowerCase()===name.toLowerCase());
function chips(st){if(!st)return[];const b=st.batting,w=st.bowling,c=[];
  if(b.runs)c.push([b.runs,'Runs']);if(b.runs>=150&&b.avg)c.push([b.avg.toFixed(2),'Bat avg']);if(b.runs)c.push([b.hs,'High score']);if(b.fours)c.push([b.fours,'Fours']);if(b.sixes)c.push([b.sixes,'Sixes']);
  if(w.wkts)c.push([w.wkts,'Wickets']);if(w.wkts>=5&&w.best)c.push([w.best,'Best']);if(w.wkts>=5&&w.econ)c.push([w.econ.toFixed(2),'Economy']);
  if(st.catches>=5)c.push([st.catches,'Catches']);c.push([st.matches,'Matches']);return c.slice(0,7)}
const tagFor=st=>{if(!st)return'';const b=st.batting,w=st.bowling,x=[];if(b.runs)x.push(b.runs.toLocaleString('en-GB')+' runs');if(w.wkts)x.push(w.wkts+' wickets');return x.join(', ')+' since 2024'};
const players=FEATURED.map(f=>({...f,short:f.n.split(' ')[0].replace(/^Muhammed$|^Mohammed$/,f.n.split(' ').slice(-1)[0]),slug:slug(f.n),get s(){return chips(statFor(f.pc))}}));
let cur=0,timer,t0,squadOn=false;
if(document.getElementById('stage')){
const SIL='<svg class="sil" viewBox="0 0 100 120" preserveAspectRatio="xMidYMax meet" aria-hidden="true"><circle cx="50" cy="38" r="19"/><path d="M8 120c0-26 18-44 42-44s42 18 42 44z"/></svg>';
// media/clips/<slug>.webm + .mp4: a short broadcast-style intro (turns round, folds arms) that plays once when the card comes to the front
const CLIPS={'mohammed-riyaz':'media/clips/mohammed-riyaz','ashif-ashraf':'media/clips/ashif-ashraf','mohammed-kattakath':'media/clips/mohammed-kattakath','javad-ismail':'media/clips/javad-ismail','majid-mohammed':'media/clips/majid-mohammed','muhammed-siyad-kalidh':'media/clips/muhammed-siyad-kalidh','shibin-iqbal':'media/clips/shibin-iqbal','kamal-pankajakshan':'media/clips/kamal-pankajakshan','rizal-mohammed':'media/clips/rizal-mohammed','kaushik-bandari':'media/clips/kaushik-bandari','navaneeth-chandu':'media/clips/navaneeth-chandu','jithu-shijo':'media/clips/jithu-shijo','ribin-paulose':'media/clips/ribin-paulose','shaheen-syed':'media/clips/shaheen-syed','shinaj-nawshad':'media/clips/shinaj-nawshad','muhammed-mishal':'media/clips/muhammed-mishal','biju-cherumambayil':'media/clips/biju-cherumambayil','musthafa-tmk':'media/clips/musthafa-tmk'};
const stage=document.getElementById('stage'),squad=document.getElementById('squad');
const cards=players.map((p,i)=>{const b=document.createElement('button');b.className='card';b.style.setProperty('--c',p.h);
  const ini=p.n.split(' ').map(w=>w[0]).slice(0,2).join('');
  b.setAttribute('aria-label','Show '+p.n);
  b.innerHTML=`<span class="flip"><span class="face back"><img class="shirt" alt="" src="assets/jersey_plain.webp"><span class="jname">${p.short}</span><span class="jnum">${p.num||ini}</span><span class="shade"></span><span class="tag">NEW KIT</span><span class="cap"><span class="vname">${p.n}</span><span class="tag2">${tagFor(statFor(p.pc))}</span></span></span>
    <span class="face front"><img class="shirt" alt="" src="assets/jersey_front.webp"><span class="shade"></span><span class="tag">BMCC</span><span class="cap"><span class="vname">${p.n}</span><span class="tag2">${p.role}</span></span></span></span>`;
  // a player photo at players/<slug>.jpg replaces the shirt on the back face
  // players/<slug>.webp (made by src/player_kit.py) puts the player's head in the kit on the front face
  // players/<slug>.webp (src/player_cards.py): the player in the new kit becomes the main face; the shirt with their name is on the flip side
  const ph=new Image();ph.onload=()=>{const fb=b.querySelector('.face.back'),ff=b.querySelector('.face.front'),st=statFor(p.pc);
    const sb=st?[[st.batting.runs,'Runs'],[st.batting.fours,'4s'],[st.batting.sixes,'6s'],[st.bowling.wkts,'Wkts'],[st.batting.hs,'HS'],[st.matches,'Games']].filter(x=>x[0]&&x[0]!=='0').slice(0,5):[];
    ff.innerHTML=fb.innerHTML;
    fb.innerHTML=`<span class="glow"></span><span class="bigini" aria-hidden="true">${ini}</span><img class="player" alt="${p.n} in the new Mavericks kit" src="${ph.src}">${CLIPS[p.slug]?`<video class="clip" muted playsinline preload="auto" aria-hidden="true"><source src="${CLIPS[p.slug]}.webm" type="video/webm"><source src="${CLIPS[p.slug]}.mp4" type="video/mp4"></video>`:''}<span class="shade"></span><span class="tag">NEW KIT</span><span class="cap"><span class="vname">${p.n}</span><span class="stats">${sb.map(x=>`<b>${x[0]}<i>${x[1]}</i></b>`).join('')}</span></span>`;
    b.classList.add('hasphoto');if(CLIPS[p.slug]){b.classList.add('hasclip');if(i===cur&&squadOn)setTimeout(()=>playClip(b),300)}};ph.src=`players/${p.slug}.webp`;
  b.addEventListener('click',()=>{if(i!==cur){go(i);restart();return}if(b.classList.contains('hasclip')&&(b.classList.contains('flipped')||!b.classList.contains('playing'))){b.classList.remove('flipped');playClip(b);return}stopClips();b.classList.toggle('flipped')});stage.appendChild(b);return b});
function layout(){
  const narrow=innerWidth<700;
  cards.forEach((c,i)=>{let k=i-cur;const L=players.length;if(k>L/2)k-=L;if(k<-L/2)k+=L;const a=Math.abs(k);
    const tx=k*(narrow?105:205);
    c.style.transform=`translate(-50%,-50%) translateX(${tx}px) translateZ(${-a*140}px) rotateY(${-k*24}deg) rotateZ(${k*-3}deg) scale(${a?1-a*.1:1.12})`;
    c.style.zIndex=10-a;c.style.filter=a?`brightness(${.75-a*.12}) saturate(.8)`:'none';c.style.opacity=a>2?0:1;c.tabIndex=a>2?-1:0;c.setAttribute('aria-current',a===0)})}
function stopClips(){cards.forEach(c=>{c.classList.remove('playing');const v=c.querySelector('.clip');if(v)v.pause()})}
function playClip(c){const v=c&&c.querySelector('.face.back .clip');if(!v||reduce||c.classList.contains('flipped'))return;
  c.classList.add('playing');v.currentTime=0;v.onended=()=>c.classList.remove('playing');v.play().catch(()=>c.classList.remove('playing'))}
function go(i){cur=(i+players.length)%players.length;const p=players[cur];squad.style.setProperty('--h',p.h);
  document.getElementById('pName').textContent=p.n;document.getElementById('pRole').textContent=p.role;
  document.getElementById('pStats').innerHTML=p.s.map(([v,l])=>`<div><b>${v}</b><span>${l}</span></div>`).join('');cards.forEach(c=>c.classList.remove('flipped'));layout();stopClips();clearTimeout(go.t);go.t=setTimeout(()=>{if(squadOn)playClip(cards[cur])},500)}
const prog=document.getElementById('prog');const DUR=6500;
function tick(ts){if(!t0||cards[cur].classList.contains('playing'))t0=ts;const f=(ts-t0)/DUR;prog.style.width=Math.min(f,1)*100+'%';if(f>=1){t0=ts;go(cur+1)}timer=requestAnimationFrame(tick)}
function restart(){t0=0}
document.getElementById('prev').onclick=()=>{go(cur-1);restart()};
document.getElementById('next').onclick=()=>{go(cur+1);restart()};
stage.addEventListener('keydown',e=>{if(e.key==='ArrowRight'){go(cur+1);restart()}if(e.key==='ArrowLeft'){go(cur-1);restart()}});
let sx=null;stage.addEventListener('pointerdown',e=>sx=e.clientX);stage.addEventListener('pointerup',e=>{if(sx!==null&&Math.abs(e.clientX-sx)>40){go(cur+(e.clientX<sx?1:-1));restart()}sx=null});
addEventListener('resize',layout);go(0);
// only autoplay while visible
new IntersectionObserver(([e])=>{cancelAnimationFrame(timer);squadOn=e.isIntersecting;if(!squadOn)stopClips();if(squadOn&&!reduce){t0=0;timer=requestAnimationFrame(tick);if(!cards[cur].classList.contains('playing'))playClip(cards[cur])}}).observe(squad);
}

/* ---------- results & fixtures ----------
   On the live site, data/results.json and data/fixtures.json are written by sync-playcricket.mjs
   (Play-Cricket API). If they can't be loaded, the embedded copy below is shown. */
const EMBEDDED={"syncedAt":"2026-10-08T13:49:38.206Z","season":2026,"seasons":[2024,2025,2026],"results":[{"team":"Midweek XI","date":"2026-09-08","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"W","text":"Won by 28 runs","us":{"runs":154,"wkts":4,"overs":"15.0"},"them":{"runs":126,"wkts":9,"overs":"12.4"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-09-06","comp":"Friendly","opp":"Bengal Tigers Sporting Club","oppShort":"BTSC","home":true,"outcome":"W","text":"Won by 68 runs","us":{"runs":138,"wkts":10,"overs":"24.2"},"them":{"runs":70,"wkts":10,"overs":"15.4"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-09-06","comp":"2026 Sunday Borders League Knockout Championship","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"L","text":"Lost by 9 wickets","us":{"runs":85,"wkts":6,"overs":"10.0"},"them":{"runs":86,"wkts":1,"overs":"8.0"},"usFirst":true,"season":2026},{"team":"Midweek XI","date":"2026-09-03","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 30 runs","us":{"runs":169,"wkts":5,"overs":"15.0"},"them":{"runs":199,"wkts":7,"overs":"15.0"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-08-30","comp":"Friendly","opp":"Hampton In Arden Village CC","oppShort":"HIAV","home":false,"outcome":"W","text":"Won by 16 runs","us":{"runs":172,"wkts":6,"overs":"35.0"},"them":{"runs":156,"wkts":10,"overs":"34.2"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-08-30","comp":"2026 Sunday Borders League Knockout Championship","opp":"Solihull Super Kings CC","oppShort":"SSKC","home":false,"outcome":"W","text":"Won","us":{"runs":181,"wkts":10,"overs":"23.4"},"them":{"runs":260,"wkts":6,"overs":"25.0"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-08-23","comp":"Friendly","opp":"Wolves CC Staffordshire","oppShort":"WCS","home":false,"outcome":"W","text":"Won by 1 wicket","us":{"runs":192,"wkts":9,"overs":"39.0"},"them":{"runs":189,"wkts":8,"overs":"40.0"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-08-23","comp":"League","opp":"Bengal Tigers Sporting Club","oppShort":"BTSC","home":true,"outcome":"L","text":"Lost by 15 runs","us":{"runs":161,"wkts":10,"overs":"31.5"},"them":{"runs":176,"wkts":10,"overs":"39.0"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-08-19","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 62 runs","us":{"runs":179,"wkts":9,"overs":"18.0"},"them":{"runs":241,"wkts":5,"overs":"18.0"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-08-16","comp":"Friendly","opp":"Warwickshire County Council Staff CC","oppShort":"WCCS","home":false,"outcome":"W","text":"Won by 4 wickets","us":{"runs":118,"wkts":6,"overs":"37.1"},"them":{"runs":115,"wkts":10,"overs":"33.0"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-08-09","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"W","text":"Won by 82 runs","us":{"runs":231,"wkts":7,"overs":"40.0"},"them":{"runs":149,"wkts":10,"overs":"27.4"},"usFirst":true,"season":2026},{"team":"Midweek XI","date":"2026-08-05","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 68 runs","us":{"runs":163,"wkts":10,"overs":"16.4"},"them":{"runs":231,"wkts":4,"overs":"20.0"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-07-28","comp":"Friendly","opp":"Sandwell Hospital","oppShort":"SH","home":false,"outcome":"W","text":"Won by 131 runs","us":{"runs":235,"wkts":4,"overs":"20"},"them":{"runs":104,"wkts":10,"overs":"20"},"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-07-26","comp":"Friendly","opp":"Warwickshire County Council Staff CC","oppShort":"WCCS","home":false,"outcome":"W","text":"Won by 6 wickets","us":{"runs":163,"wkts":4,"overs":"33.1"},"them":{"runs":160,"wkts":10,"overs":"38.0"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-07-26","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"W","text":"Won by 181 runs","us":{"runs":253,"wkts":5,"overs":"40.0"},"them":{"runs":72,"wkts":10,"overs":"23.2"},"usFirst":true,"season":2026},{"team":"Midweek XI","date":"2026-07-23","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"W","text":"Won by 47 runs","us":{"runs":254,"wkts":2,"overs":"20.0"},"them":{"runs":207,"wkts":10,"overs":"19.5"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-07-19","comp":"League","opp":"Amblecote & Wollaston CC","oppShort":"AWC","home":false,"outcome":"L","text":"Lost by 86 runs","us":{"runs":203,"wkts":10,"overs":"37.3"},"them":{"runs":289,"wkts":4,"overs":"40.0"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-07-12","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"L","text":"Lost by 3 wickets","us":{"runs":203,"wkts":9,"overs":"40.0"},"them":{"runs":205,"wkts":7,"overs":"35.5"},"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-07-12","comp":"Friendly","opp":"West Midlands Doctors CC","oppShort":"WMDC","home":false,"outcome":"L","text":"Lost by 38 runs","us":{"runs":234,"wkts":10,"overs":"34"},"them":{"runs":272,"wkts":5,"overs":"40"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-07-09","comp":"Friendly","opp":"Sutton Strikers CC","oppShort":"SSC","home":false,"outcome":"L","text":"Lost by 59 runs","us":{"runs":179,"wkts":7,"overs":"20.0"},"them":{"runs":238,"wkts":2,"overs":"20.0"},"usFirst":false,"season":2026},{"team":"Womens 1st XI","date":"2026-07-05","comp":"Friendly","opp":"Solihull United CC","oppShort":"SUC","home":false,"outcome":"L","text":"Lost by 60 runs","us":{"runs":99,"wkts":5,"overs":"0"},"them":{"runs":159,"wkts":3,"overs":"0"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-07-05","comp":"League","opp":"Solihull Super Kings CC","oppShort":"SSKC","home":true,"outcome":"W","text":"Won by 41 runs","us":{"runs":253,"wkts":9,"overs":"40.0"},"them":{"runs":212,"wkts":9,"overs":"40.0"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-06-28","comp":"League","opp":"Wightwick & Finchfield CC","oppShort":"WFC","home":true,"outcome":"W","text":"Won by 8 wickets","us":{"runs":104,"wkts":2,"overs":"14.4"},"them":{"runs":101,"wkts":10,"overs":"24.0"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-06-28","comp":"Friendly","opp":"Walsall Unity CC","oppShort":"WUC","home":false,"outcome":"W","text":"Won by 5 wickets","us":{"runs":302,"wkts":5,"overs":"36"},"them":{"runs":299,"wkts":9,"overs":"40"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-06-24","comp":"Friendly","opp":"WMD CC","oppShort":"WC","home":false,"outcome":"L","text":"Lost by 36 runs","us":{"runs":134,"wkts":10,"overs":"18.3"},"them":{"runs":170,"wkts":8,"overs":"20.0"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-06-21","comp":"Friendly","opp":"Boundary Breakers CC","oppShort":"BBC","home":true,"outcome":"L","text":"Lost by 10 runs","us":{"runs":123,"wkts":10,"overs":"19.1"},"them":{"runs":133,"wkts":6,"overs":"20"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-06-21","comp":"Friendly","opp":"Boundary Breakers CC","oppShort":"BBC","home":false,"outcome":"W","text":"Won by 9 wickets","us":{"runs":61,"wkts":1,"overs":"7.4"},"them":{"runs":60,"wkts":10,"overs":"21.3"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-06-21","comp":"League","opp":"Himley Sri Lankans CC","oppShort":"HSLC","home":true,"outcome":"W","text":"Won by 8 wickets","us":{"runs":187,"wkts":2,"overs":"35.4"},"them":{"runs":186,"wkts":9,"overs":"40.0"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-06-16","comp":"Friendly","opp":"Sandwell Hospital","oppShort":"SH","home":false,"outcome":"W","text":"Won by 7 wickets","us":{"runs":123,"wkts":3,"overs":"12"},"them":{"runs":120,"wkts":10,"overs":"18.4"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-06-14","comp":"League","opp":"Solihull Super Kings CC","oppShort":"SSKC","home":false,"outcome":"W","text":"Won by 8 wickets","us":{"runs":46,"wkts":2,"overs":"4.4"},"them":{"runs":44,"wkts":10,"overs":"15.4"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-06-14","comp":"Friendly","opp":"West Midlands Police Veterans CC","oppShort":"WMPV","home":false,"outcome":"L","text":"Lost by 5 wickets","us":{"runs":90,"wkts":10,"overs":"21"},"them":{"runs":92,"wkts":5,"overs":"16"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-06-07","comp":"League","opp":"Himley Sri Lankans CC","oppShort":"HSLC","home":false,"outcome":"L","text":"Lost","us":{"runs":210,"wkts":10,"overs":"31.0"},"them":{"runs":154,"wkts":2,"overs":"24.0"},"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-06-07","comp":"Friendly","opp":"West Midlands Police Veterans CC","oppShort":"WMPV","home":false,"outcome":"W","text":"Won by 5 wickets","us":{"runs":129,"wkts":5,"overs":"28"},"them":{"runs":128,"wkts":10,"overs":"30"},"usFirst":false,"season":2026},{"team":"Midweek XI","date":"2026-06-03","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"A","text":"Abandoned","us":null,"them":null,"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-05-31","comp":"Friendly","opp":"Brummies CC","oppShort":"BC","home":true,"outcome":"L","text":"Lost by 74 runs","us":{"runs":178,"wkts":10,"overs":"34.3"},"them":{"runs":252,"wkts":10,"overs":"34.5"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-05-31","comp":"League","opp":"Bengal Tigers Sporting Club","oppShort":"BTSC","home":false,"outcome":"L","text":"Lost by 5 wickets","us":{"runs":160,"wkts":10,"overs":"36.0"},"them":{"runs":162,"wkts":5,"overs":"26.1"},"usFirst":true,"season":2026},{"team":"Midweek XI","date":"2026-05-28","comp":"Friendly","opp":"WMD CC","oppShort":"WC","home":false,"outcome":"L","text":"Lost by 4 wickets","us":{"runs":115,"wkts":10,"overs":"18.0"},"them":{"runs":117,"wkts":6,"overs":"16.1"},"usFirst":true,"season":2026},{"team":"Midweek XI","date":"2026-05-26","comp":"Friendly","opp":"Water Orton CC","oppShort":"WOC","home":false,"outcome":"L","text":"Lost by 1 wicket","us":{"runs":82,"wkts":10,"overs":"17.5"},"them":{"runs":86,"wkts":9,"overs":"17.2"},"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-05-24","comp":"Friendly","opp":"Warwickshire County Council Staff CC","oppShort":"WCCS","home":false,"outcome":"L","text":"Lost by 5 wickets","us":{"runs":119,"wkts":10,"overs":"26.3"},"them":{"runs":121,"wkts":5,"overs":"22"},"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-05-24","comp":"League","opp":"Amblecote & Wollaston CC","oppShort":"AWC","home":true,"outcome":"W","text":"Won by 125 runs","us":{"runs":252,"wkts":9,"overs":"40.0"},"them":{"runs":127,"wkts":10,"overs":"27.4"},"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-05-17","comp":"Friendly","opp":"Brummie Malayali CC","oppShort":"BMC","home":true,"outcome":"A","text":"Abandoned","us":null,"them":null,"usFirst":true,"season":2026},{"team":"1st XI","date":"2026-05-17","comp":"League","opp":"Wightwick & Finchfield CC","oppShort":"WFC","home":false,"outcome":"L","text":"Lost by 56 runs","us":{"runs":212,"wkts":9,"overs":"40.0"},"them":{"runs":268,"wkts":7,"overs":"40.0"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-05-10","comp":"Friendly","opp":"Aston Unity CC","oppShort":"AUC","home":false,"outcome":"W","text":"Won by 2 wickets","us":{"runs":196,"wkts":8,"overs":"39.3"},"them":{"runs":195,"wkts":9,"overs":"39.4"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2026-05-10","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"L","text":"Lost by 19 runs","us":{"runs":203,"wkts":8,"overs":"40.0"},"them":{"runs":222,"wkts":10,"overs":"39.1"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-04-26","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"W","text":"Won by 6 wickets","us":{"runs":314,"wkts":4,"overs":"39.1"},"them":{"runs":313,"wkts":10,"overs":"37.1"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-04-26","comp":"Friendly","opp":"Boundary Breakers CC","oppShort":"BBC","home":true,"outcome":"L","text":"Lost by 1 wicket","us":{"runs":159,"wkts":10,"overs":"37.3"},"them":{"runs":161,"wkts":9,"overs":"33.2"},"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-04-19","comp":"Friendly","opp":"Water Orton CC","oppShort":"WOC","home":false,"outcome":"L","text":"Lost by 70 runs","us":{"runs":192,"wkts":8,"overs":"40"},"them":{"runs":262,"wkts":6,"overs":"40"},"usFirst":false,"season":2026},{"team":"Friendly XI","date":"2026-04-19","comp":"Friendly","opp":"Hampton In Arden Village CC","oppShort":"HIAV","home":true,"outcome":"A","text":"Abandoned","us":null,"them":null,"usFirst":true,"season":2026},{"team":"Friendly XI","date":"2026-04-11","comp":"Friendly","opp":"Old Halesonians CC","oppShort":"OHC","home":false,"outcome":"L","text":"Lost by 25 runs","us":{"runs":164,"wkts":4,"overs":"20"},"them":{"runs":189,"wkts":4,"overs":"20"},"usFirst":false,"season":2026},{"team":"1st XI","date":"2025-09-21","comp":"Sunday Borders League Knockout Championship","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"L","text":"Lost by 7 wickets","us":{"runs":145,"wkts":10,"overs":"37.4"},"them":{"runs":146,"wkts":3,"overs":"31.1"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-09-07","comp":"Sunday Borders League Knockout Championship","opp":"Wightwick & Finchfield CC","oppShort":"WFC","home":true,"outcome":"W","text":"Won by 38 runs","us":{"runs":162,"wkts":9,"overs":"28.0"},"them":{"runs":124,"wkts":10,"overs":"23.5"},"usFirst":true,"season":2025},{"team":"Friendly XI","date":"2025-08-31","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 95 runs","us":{"runs":306,"wkts":10,"overs":"40.0"},"them":{"runs":401,"wkts":5,"overs":"40.0"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-08-24","comp":"League","opp":"Amblecote & Wollaston CC","oppShort":"AWC","home":false,"outcome":"W","text":"Won by 105 runs","us":{"runs":238,"wkts":9,"overs":"40.0"},"them":{"runs":133,"wkts":10,"overs":"33.3"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-08-17","comp":"League","opp":"Wightwick & Finchfield CC","oppShort":"WFC","home":true,"outcome":"W","text":"Won by 62 runs","us":{"runs":244,"wkts":9,"overs":"40.0"},"them":{"runs":182,"wkts":10,"overs":"38.1"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-08-10","comp":"League","opp":"Halesowen CC","oppShort":"HC","home":true,"outcome":"W","text":"Won by 34 runs","us":{"runs":246,"wkts":8,"overs":"40.0"},"them":{"runs":212,"wkts":10,"overs":"39.1"},"usFirst":true,"season":2025},{"team":"Midweek XI","date":"2025-08-06","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 8 wickets","us":{"runs":116,"wkts":10,"overs":"19.4"},"them":{"runs":117,"wkts":2,"overs":"14.5"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-08-03","comp":"League","opp":"Himley Sri Lankans CC","oppShort":"HSLC","home":true,"outcome":"L","text":"Lost by 6 runs","us":{"runs":277,"wkts":10,"overs":"39.5"},"them":{"runs":283,"wkts":10,"overs":"38.1"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-07-27","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"L","text":"Lost by 30 runs","us":{"runs":213,"wkts":8,"overs":"40.0"},"them":{"runs":243,"wkts":7,"overs":"40.0"},"usFirst":false,"season":2025},{"team":"Midweek XI","date":"2025-07-24","comp":"Friendly","opp":"Walsall Unity CC","oppShort":"WUC","home":false,"outcome":"L","text":"Lost by 35 runs","us":{"runs":184,"wkts":9,"overs":"20"},"them":{"runs":219,"wkts":9,"overs":"20"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-07-20","comp":"League","opp":"Himley Sri Lankans CC","oppShort":"HSLC","home":false,"outcome":"W","text":"Won by 9 wickets","us":{"runs":113,"wkts":1,"overs":"18.5"},"them":{"runs":112,"wkts":10,"overs":"37.4"},"usFirst":false,"season":2025},{"team":"Friendly 2nd XI ","date":"2025-07-13","comp":"Friendly","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"W","text":"Won by 38 runs","us":{"runs":129,"wkts":5,"overs":"15.0"},"them":{"runs":91,"wkts":9,"overs":"15.0"},"usFirst":true,"season":2025},{"team":"Friendly XI","date":"2025-07-13","comp":"Friendly","opp":"Aston Unity CC","oppShort":"AUC","home":false,"outcome":"L","text":"Lost by 37 runs","us":{"runs":141,"wkts":10,"overs":"26.5"},"them":{"runs":178,"wkts":10,"overs":"32.4"},"usFirst":false,"season":2025},{"team":"Friendly 2nd XI ","date":"2025-07-13","comp":"Friendly","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"W","text":"Won by 9 wickets","us":{"runs":111,"wkts":1,"overs":"18.0"},"them":{"runs":93,"wkts":10,"overs":"24.2"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-07-06","comp":"League","opp":"Springhill CC","oppShort":"SC","home":true,"outcome":"CON","text":"CON","us":null,"them":null,"usFirst":true,"season":2025},{"team":"Midweek XI","date":"2025-07-02","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 42 runs","us":{"runs":215,"wkts":8,"overs":"20"},"them":{"runs":257,"wkts":10,"overs":"19.5"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-06-29","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"W","text":"Won by 8 wickets","us":{"runs":159,"wkts":2,"overs":"22.4"},"them":{"runs":156,"wkts":10,"overs":"35.0"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-06-22","comp":"League","opp":"Amblecote & Wollaston CC","oppShort":"AWC","home":true,"outcome":"W","text":"Won by 7 wickets","us":{"runs":180,"wkts":3,"overs":"22.3"},"them":{"runs":177,"wkts":10,"overs":"36.0"},"usFirst":false,"season":2025},{"team":"Friendly XI","date":"2025-06-15","comp":"Friendly","opp":"West Midlands Police Veterans CC","oppShort":"WMPV","home":false,"outcome":"L","text":"Lost by 49 runs","us":{"runs":177,"wkts":10,"overs":"27"},"them":{"runs":226,"wkts":5,"overs":"35"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-06-15","comp":"League","opp":"Springhill CC","oppShort":"SC","home":false,"outcome":"A","text":"Abandoned","us":{"runs":257,"wkts":10,"overs":"39.2"},"them":{"runs":172,"wkts":7,"overs":"27.5"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-06-08","comp":"Friendly","opp":"Warwickshire County Council Staff CC","oppShort":"WCCS","home":false,"outcome":"L","text":"Lost by 7 wickets","us":{"runs":110,"wkts":10,"overs":"30.1"},"them":{"runs":111,"wkts":3,"overs":"21.4"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-06-01","comp":"League","opp":"Halesowen CC","oppShort":"HC","home":false,"outcome":"L","text":"Lost by 153 runs","us":{"runs":138,"wkts":10,"overs":"39.1"},"them":{"runs":291,"wkts":5,"overs":"40"},"usFirst":false,"season":2025},{"team":"Midweek XI","date":"2025-05-30","comp":"Friendly","opp":"Walsall Unity CC","oppShort":"WUC","home":false,"outcome":"L","text":"Lost by 10 wickets","us":{"runs":206,"wkts":5,"overs":"20"},"them":{"runs":208,"wkts":0,"overs":"14.2"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-05-25","comp":"Friendly","opp":"Hampton In Arden Village CC","oppShort":"HIAV","home":false,"outcome":"W","text":"Won by 5 wickets","us":{"runs":245,"wkts":5,"overs":"39.3"},"them":{"runs":244,"wkts":5,"overs":"40.0"},"usFirst":false,"season":2025},{"team":"Midweek XI","date":"2025-05-21","comp":"Friendly","opp":"Dudley Doosras CC","oppShort":"DDC","home":false,"outcome":"L","text":"Lost by 9 wickets","us":{"runs":96,"wkts":10,"overs":"17.4"},"them":{"runs":97,"wkts":1,"overs":"12.4"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-05-18","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"L","text":"Lost by 33 runs","us":{"runs":116,"wkts":10,"overs":"30.0"},"them":{"runs":149,"wkts":10,"overs":"30.0"},"usFirst":false,"season":2025},{"team":"Midweek XI","date":"2025-05-13","comp":"Friendly","opp":"Walsall Unity CC","oppShort":"WUC","home":false,"outcome":"L","text":"Lost by 8 wickets","us":{"runs":190,"wkts":5,"overs":"18"},"them":{"runs":192,"wkts":2,"overs":"17.1"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2025-05-11","comp":"League","opp":"Wightwick & Finchfield CC","oppShort":"WFC","home":false,"outcome":"L","text":"Lost by 24 runs","us":{"runs":207,"wkts":10,"overs":"35.5"},"them":{"runs":231,"wkts":8,"overs":"40.0"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-05-04","comp":"League","opp":"Bharat Parivar CC","oppShort":"BPC","home":true,"outcome":"W","text":"Won by 7 wickets","us":{"runs":128,"wkts":3,"overs":"18.5"},"them":{"runs":125,"wkts":10,"overs":"27.5"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-04-27","comp":"Friendly","opp":"Sportsman CC","oppShort":"SC","home":false,"outcome":"L","text":"Lost by 166 runs","us":{"runs":81,"wkts":10,"overs":"23.4"},"them":{"runs":247,"wkts":10,"overs":"38.0"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-04-20","comp":"Friendly","opp":"East Midlands CC","oppShort":"EMC","home":false,"outcome":"W","text":"Won by 6 wickets","us":{"runs":151,"wkts":4,"overs":"27.5"},"them":{"runs":150,"wkts":10,"overs":"33.3"},"usFirst":false,"season":2025},{"team":"1st XI","date":"2025-04-13","comp":"Friendly","opp":"Eccleshall CC","oppShort":"EC","home":false,"outcome":"L","text":"Lost by 8 wickets","us":{"runs":161,"wkts":10,"overs":"38.2"},"them":{"runs":229,"wkts":2,"overs":"32.5"},"usFirst":true,"season":2025},{"team":"1st XI","date":"2024-10-05","comp":"Friendly","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"W","text":"Won by 6 wickets","us":{"runs":179,"wkts":4,"overs":"15.3"},"them":{"runs":174,"wkts":6,"overs":"30.0"},"usFirst":false,"season":2024},{"team":"1st XI","date":"2024-09-22","comp":"Friendly","opp":"Bharat Parivar CC","oppShort":"BPC","home":false,"outcome":"A","text":"Abandoned","us":null,"them":null,"usFirst":false,"season":2024},{"team":"1st XI","date":"2024-08-11","comp":"Friendly","opp":"Moddershall CC","oppShort":"MC","home":false,"outcome":"L","text":"Lost by 242 runs","us":{"runs":91,"wkts":10,"overs":"23.4"},"them":{"runs":333,"wkts":4,"overs":"40.0"},"usFirst":false,"season":2024},{"team":"1st XI","date":"2024-07-21","comp":"Friendly","opp":"Solihull Super Kings CC","oppShort":"SSKC","home":false,"outcome":"W","text":"Won by 6 wickets","us":{"runs":126,"wkts":4,"overs":"23.3"},"them":{"runs":122,"wkts":10,"overs":"31"},"usFirst":false,"season":2024},{"team":"1st XI","date":"2024-06-23","comp":"Friendly","opp":"East Midlands CC","oppShort":"EMC","home":false,"outcome":"L","text":"Lost by 7 wickets","us":{"runs":95,"wkts":7,"overs":"20.0"},"them":{"runs":96,"wkts":3,"overs":"16.0"},"usFirst":true,"season":2024},{"team":"1st XI","date":"2024-06-23","comp":"Friendly","opp":"East Midlands CC","oppShort":"EMC","home":false,"outcome":"W","text":"Won by 10 wickets","us":{"runs":93,"wkts":0,"overs":"7.1"},"them":{"runs":92,"wkts":6,"overs":"10.0"},"usFirst":false,"season":2024}],"fixtures":[]};
const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmtD=d=>d?new Date(d+'T12:00:00').toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}):'';
const sc=i=>i?`${i.runs}${i.wkts>=10?' all out':'/'+i.wkts} (${i.overs})`:'–';
let showAll=false,lastData=null,seasonSel='all';
function renderResults(d){
  lastData=d;
  if(!document.getElementById('record'))return;
  const L={W:'W',L:'L',D:'D',T:'T',A:'A',N:'NR',C:'C'};
  const all=(d.results||[]).map(r=>({...r,season:r.season||+String(r.date).slice(0,4)}));
  const yrs=[...new Set(all.map(r=>r.season))].sort((a,b)=>b-a);
  const sf=document.getElementById('sFilter');
  if(sf)sf.innerHTML=['all',...yrs].map(y=>`<button type="button" role="tab" aria-selected="${String(y)===String(seasonSel)}" data-s="${y}">${y==='all'?'All seasons':y}</button>`).join('');
  const res=seasonSel==='all'?all:all.filter(r=>String(r.season)===String(seasonSel)),n=k=>res.filter(r=>r.outcome===k).length,pl=res.filter(r=>r.us||r.them).length;
  document.getElementById('record').innerHTML=res.length?`<div><b>${pl}</b><span>${seasonSel==='all'?(yrs.length?yrs.at(-1)+'–'+String(yrs[0]).slice(2):'')+' played':seasonSel+' played'}</span></div><div class="w"><b>${n('W')}</b><span>Won</span></div><div class="l"><b>${n('L')}</b><span>Lost</span></div><div><b>${n('A')+n('N')+n('C')}</b><span>Abandoned</span></div>`:'';
  const fg=document.getElementById('formGuide');if(fg)fg.innerHTML=res.slice(0,10).map(r=>`<i class="${r.outcome==='W'?'w':r.outcome==='L'?'l':'a'}" title="${esc(r.text)} v ${esc(r.opp)}">${r.outcome}</i>`).join('');
  const list=showAll?res:res.slice(0,5);
  document.getElementById('scorecards').innerHTML=list.map(r=>{
    const a=`BM ${sc(r.us)}`,b=`${esc(r.oppShort||r.opp)} ${sc(r.them)}`;
    const line=r.us||r.them?`<div class="line">${r.usFirst?a+' · '+b:b+' · '+a}</div>`:'';
    return `<article class="sc ${r.outcome==='W'?'w':r.outcome==='L'?'l':'a'}"><div class="badge">${L[r.outcome]||'–'}</div>
      <div class="opp">v ${esc(r.opp)}</div><div class="meta">${fmtD(r.date)} · ${esc(r.team?r.team+' · ':'')}${esc(/knockout/i.test(r.comp)?'Knockout cup':r.comp)}</div>
      ${line}<div class="verdict">${esc(r.text)}</div></article>`}).join('')||'<p class="sync">No results yet this season.</p>';
  const more=document.getElementById('moreRes');more.hidden=res.length<=5;more.textContent=showAll?'Show latest only':`Show all ${res.length} results`;
  document.getElementById('syncNote').textContent=d.syncedAt?`Synced from Play-Cricket · ${new Date(d.syncedAt).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'})}`:'Results from Play-Cricket';
}
document.getElementById('moreRes')?.addEventListener('click',()=>{showAll=!showAll;renderResults(lastData);bindTilt()});
document.getElementById('sFilter')?.addEventListener('click',e=>{const b=e.target.closest('[data-s]');if(!b)return;seasonSel=b.dataset.s;showAll=false;renderResults(lastData);bindTilt()});
function renderFixtures(list){
  if(!document.getElementById('fixtureList'))return;
  if(!list.length){document.getElementById('fixtureList').innerHTML=`<article class="fx off"><div><div class="when">Off-season</div><div class="vs">See you <em>in</em><br>April</div></div><p>The 2026 season is over. Next season's fixtures appear here automatically once they're on Play-Cricket. Winter nets run indoors.</p></article>`;return}
  document.getElementById('fixtureList').innerHTML=list.slice(0,3).map((f,i)=>{
    const when=f.date?`${new Date(f.date+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'})} · ${esc(f.time||'')}`:`${esc(f.label)} · ${esc(f.time)}`;
    const vs=f.home===false?`${esc(f.opp)} <em>v</em><br>Mavericks`:`Mavericks <em>v</em><br>${esc(f.opp)}`;
    const ha=f.home===true?'<span class="chip hot">Home</span>':f.home===false?'<span class="chip">Away</span>':'';
    return `<article class="fx${f.home?' home':''}"><div><div class="when">${when}</div><div class="vs">${vs}</div></div>
      <div class="chips">${ha}<span class="chip">${esc(f.comp)}</span><span class="chip">${esc(f.ground)}</span></div></article>`}).join('');
}
renderResults(EMBEDDED);renderFixtures(EMBEDDED.fixtures);
Promise.all(['data/results.json','data/fixtures.json'].map(u=>fetch(u,{cache:'no-store'}).then(r=>r.ok?r.json():null).catch(()=>null)))
  .then(([r,f])=>{if(r&&r.results){renderResults(r);renderTicker(r)}if(f&&f.fixtures)renderFixtures(f.fixtures)});

/* ---------- leaderboards, mini awards, full stats table ---------- */
const nf=n=>Number(n).toLocaleString('en-GB');
function renderBoards(D){
  if(!document.getElementById('boards'))return;
  const ps=D.players,top=(arr,k)=>[...arr].sort(k).slice(0,5);
  const bat=top(ps.filter(p=>p.batting.runs),(a,b)=>b.batting.runs-a.batting.runs);
  const bowl=top(ps.filter(p=>p.bowling.wkts),(a,b)=>b.bowling.wkts-a.bowling.wkts||(a.bowling.avg??99)-(b.bowling.avg??99));
  const row=(i,p,sub,v,max)=>`<div class="row"><span class="n">${i+1}</span><div class="who">${esc(p.name)}<small>${sub}</small></div><span class="val" data-count="${v}">${v}</span><div class="bar"><i style="width:${(v/max*100).toFixed(1)}%"></i></div></div>`;
  document.getElementById('boards').innerHTML=
   `<div class="board" data-tilt><h3>Top run scorers <small>2024–26 · Runs</small></h3>${bat.map((p,i)=>row(i,p,`${p.batting.inns} inns · avg ${p.batting.avg??'–'} · HS ${p.batting.hs} · SR ${p.batting.sr??'–'}`,p.batting.runs,bat[0].batting.runs)).join('')}</div>
    <div class="board" data-tilt><h3>Top wicket takers <small>2024–26 · Wkts</small></h3>${bowl.map((p,i)=>row(i,p,`${p.bowling.overs} ov · best ${p.bowling.best} · econ ${p.bowling.econ}`,p.bowling.wkts,bowl[0].bowling.wkts)).join('')}</div>`;
  const by=(f,min)=>[...ps].filter(min).sort((a,b)=>f(b)-f(a))[0];
  const six=by(p=>p.batting.sixes,()=>true),ct=by(p=>p.catches,()=>true),
        sr=by(p=>p.batting.sr||0,p=>p.batting.balls>=150),ec=by(p=>-(p.bowling.econ??99),p=>parseFloat(p.bowling.overs)>=40),
        hs=by(p=>parseInt(p.batting.hs),()=>true),bb=by(p=>{const[w,r]=(p.bowling.best||'0/0').split('/').map(Number);return w*1000-r},()=>true);
  const mini=(k,p,v,s)=>p?`<div class="mini" data-tilt><div class="k">${k}</div><div class="n">${esc(p.name)}</div><div class="v">${v}</div><div class="s">${s}</div></div>`:'';
  document.getElementById('minis').innerHTML=
    mini('Highest score',hs,hs.batting.hs,'runs in an innings')+mini('Best bowling',bb,bb.bowling.best,'in an innings')+
    mini('Most sixes',six,six.batting.sixes,`plus ${six.batting.fours} fours`)+mini('Most catches',ct,ct.catches,'in the field')+
    mini('Fastest scorer',sr,sr.batting.sr,'strike rate · min 150 balls')+mini('Tightest bowler',ec,ec.bowling.econ,'runs per over · min 40 overs')+
    mini('Most matches',by(p=>p.matches,()=>true),by(p=>p.matches,()=>true).matches,'appearances')+
    mini('Most fifties',by(p=>p.batting.fifties+p.batting.hundreds,()=>true),(p=>p.batting.fifties+p.batting.hundreds)(by(p=>p.batting.fifties+p.batting.hundreds,()=>true)),'50s and 100s');
  bindTilt();
}
const tidy=s=>s.split(' ').map(w=>(w===w.toLowerCase()||(w===w.toUpperCase()&&w.length>4))?w.charAt(0).toUpperCase()+w.slice(1).toLowerCase():w).join(' ').replace(/\s+-$/,'');
function applyPlayers(D){D.players.forEach(p=>{p.pcName=p.pcName||p.name;p.name=tidy(p.pcName)});PLAYERS=D;renderBoards(D);
  document.querySelectorAll('[data-team]').forEach(el=>{const k=el.dataset.team,v=k==='players'?D.players.length:D.team[k];if(v!=null){el.dataset.count=v;if(!el.dataset.seen||el.textContent!=='0')el.textContent=nf(v)}});
  const st=document.getElementById('seasonStrip');if(st&&D.bySeason)st.innerHTML=Object.entries(D.bySeason).sort((a,b)=>b[0]-a[0]).map(([y,v])=>`<div class="ss"><b>${y}</b><span>${nf(v.runs)} runs</span><span>${v.wkts} wickets</span><span>${v.matches} matches</span></div>`).join('');if(typeof go==='function')go(cur)}
applyPlayers(PLAYERS);
fetch('data/players.json',{cache:'no-store'}).then(r=>r.ok?r.json():null).then(d=>{if(d&&d.players&&d.players.length)applyPlayers(d)}).catch(()=>{});

/* ---------- results ticker ---------- */
function renderTicker(d){if(!document.getElementById('ticker'))return;const res=(d.results||[]).filter(r=>r.outcome==='W'||r.outcome==='L').slice(0,8);if(!res.length)return;
  const one=res.map(r=>`<span><b class="${r.outcome==='W'?'w':'l'}">${r.outcome}</b>v ${esc(r.opp)} · ${esc(r.text)}</span>`).join('');
  document.getElementById('ticker').innerHTML=one+one}
renderTicker(EMBEDDED);

/* ---------- count-up numbers ---------- */
function countUp(el){const end=+el.dataset.count;if(reduce||!end){return}const d=1400,s=performance.now();
  const f=now=>{const k=Math.min((now-s)/d,1),e=1-Math.pow(1-k,3);el.textContent=nf(Math.round(end*e));if(k<1)requestAnimationFrame(f)};requestAnimationFrame(f)}
var cio;
function watchCounts(){cio=cio||new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){countUp(e.target);cio.unobserve(e.target)}}),{threshold:.6});
  document.querySelectorAll('[data-count]:not([data-seen])').forEach(el=>{el.dataset.seen=1;cio.observe(el)})}
watchCounts();

/* ---------- 3D tilt on cards ---------- */
function bindTilt(){if(reduce||matchMedia('(hover: none)').matches)return;
  document.querySelectorAll('[data-tilt]:not([data-tb]),.num:not([data-tb]),.sc:not([data-tb]),.fx:not([data-tb])').forEach(el=>{el.dataset.tb=1;
    el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;
      el.style.transform=`perspective(900px) rotateX(${(-y*8).toFixed(2)}deg) rotateY(${(x*10).toFixed(2)}deg) translateZ(6px)`});
    el.addEventListener('pointerleave',()=>{el.style.transform=''})});watchCounts()}
bindTilt();

/* form + copy */
document.getElementById('enq')?.addEventListener('submit',e=>{e.preventDefault();const n=document.getElementById('formNote'),nm=document.getElementById('f-name').value.trim(),ct=document.getElementById('f-contact').value.trim();
  if(!nm||!ct){n.className='formnote';n.textContent='Add your name and a phone number or email so the captain can reply.';return}
  const f=e.target,b=f.querySelector('button[type=submit]');b.disabled=true;n.className='formnote';n.textContent='Sending…';
  fetch('https://formspree.io/f/mnneggba',{method:'POST',body:new FormData(f),headers:{Accept:'application/json'}})
    .then(r=>{if(!r.ok)throw 0;n.className='formnote ok';n.textContent=`Thanks ${nm}. The captain will be in touch soon.`;f.reset()})
    .catch(()=>{n.className='formnote';n.textContent='Sorry, that did not send. Please try again or message us on Instagram.'})
    .finally(()=>{b.disabled=false})});
document.querySelectorAll('[data-copy]').forEach(b=>b.addEventListener('click',()=>{const el=document.getElementById(b.dataset.copy),t=el.textContent;
  const done=()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1500)};
  navigator.clipboard?.writeText(t).then(done).catch(()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r)})}));

// Match Day reels: play muted while on screen, tap Sound to hear one
document.querySelectorAll('.reel').forEach(r=>{const v=r.querySelector('video'),b=r.querySelector('.snd');
  new IntersectionObserver(([e])=>{e.isIntersecting?v.play().catch(()=>{}):v.pause()},{threshold:.4}).observe(r);
  b.addEventListener('click',()=>{document.querySelectorAll('.reel video').forEach(o=>{if(o!==v)o.muted=true});v.muted=!v.muted;b.textContent=v.muted?'Sound':'Mute';b.setAttribute('aria-label',v.muted?'Turn sound on':'Mute');if(!v.muted)v.play()})});
