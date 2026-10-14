(function(){
"use strict";
/* ================= pixel helpers ================= */
const OUT='#262234';

/* ================= SOUND (WebAudio, 8-bit synth) ================= */
const SFX=(function(){
  const AC=window.AudioContext||window.webkitAudioContext;
  let ac=null,master=null,sfxGain=null,bgmGain=null,muted=false,bgmId=null,step=0,nbuf=null;
  const N={G2:98,A2:110,C3:130.8,F3:174.6,D5:587.3,E5:659.3,G5:784,A5:880,C5:523.3,C6:1046.5,E6:1318.5};

  function init(){
    if(!AC)return;
    if(!ac){
      ac=new AC();
      master=ac.createGain();master.gain.value=muted?0:1;master.connect(ac.destination);
      sfxGain=ac.createGain();sfxGain.gain.value=.55;sfxGain.connect(master);
      bgmGain=ac.createGain();bgmGain.gain.value=.16;bgmGain.connect(master);
    }
    if(ac.state==='suspended')ac.resume();
  }
  function tone(f,t,d,type,v,f2,dest){
    if(!ac)return;
    const o=ac.createOscillator(),g=ac.createGain();
    o.type=type||'square';o.frequency.setValueAtTime(f,t);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
    g.gain.setValueAtTime(.0001,t);
    g.gain.exponentialRampToValueAtTime(v||.3,t+.01);
    g.gain.exponentialRampToValueAtTime(.0001,t+d);
    o.connect(g);g.connect(dest||sfxGain);o.start(t);o.stop(t+d+.02);
  }
  function noise(t,d,v,fc){
    if(!ac)return;
    if(!nbuf){
      nbuf=ac.createBuffer(1,Math.floor(ac.sampleRate*.5),ac.sampleRate);
      const a=nbuf.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;
    }
    const s=ac.createBufferSource(),f=ac.createBiquadFilter(),g=ac.createGain();
    s.buffer=nbuf;f.type='bandpass';f.frequency.value=fc||1800;f.Q.value=.8;
    g.gain.setValueAtTime(v||.4,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
    s.connect(f);f.connect(g);g.connect(sfxGain);s.start(t);s.stop(t+d+.02);
  }

  const fx={
    click(t){tone(660,t,.08,'square',.25,990)},
    start(t){[N.C5,N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,t+i*.07,.12,'square',.25))},
    pick(t){tone(520,t,.06,'square',.18,780)},
    drop(t){tone(300,t,.08,'triangle',.2,180)},
    ask(t){tone(N.G5,t,.07,'square',.2);tone(N.C6,t+.07,.1,'square',.2)},
    no(t){tone(220,t,.14,'sawtooth',.22,140);tone(165,t+.14,.2,'sawtooth',.22,100)},
    crunch(t){for(let i=0;i<4;i++)noise(t+i*.2,.09,.5,1400+(i%2)*900)},
    yum(t){[N.E5,N.G5,N.C6].forEach((f,i)=>tone(f,t+i*.06,.12,'square',.22))},
    pet(t){tone(N.A5,t,.09,'sine',.25,N.C6)},
    dizzy(t){for(let i=0;i<6;i++)tone(400+(i%2)*200,t+i*.08,.1,'triangle',.2,300+(i%2)*300)},
    win(t){
      [N.C5,N.E5,N.G5,N.C6,N.G5,N.C6,N.E6].forEach((f,i)=>tone(f,t+i*.11,.2,'square',.22));
      [N.C5,N.E5,N.G5].forEach(f=>tone(f,t+.8,.6,'triangle',.22));
    }
  };
  function play(name){
    if(!ac||!fx[name])return;
    fx[name](ac.currentTime+.01);
  }

  /* BGM loop sederhana */
  const MEL=[N.E5,0,N.G5,0,N.A5,N.G5,N.E5,0, N.D5,0,N.E5,0,N.G5,N.E5,N.D5,0];
  const BAS=[N.C3,N.C3,N.C3,N.C3, N.A2,N.A2,N.A2,N.A2, N.F3,N.F3,N.F3,N.F3, N.G2,N.G2,N.G2,N.G2];
  function bgmStep(){
    if(!ac||ac.state!=='running')return;
    const t=ac.currentTime+.05,i=step%16;
    if(MEL[i])tone(MEL[i],t,.2,'square',.5,null,bgmGain);
    if(i%2===0)tone(BAS[i],t,.3,'triangle',.7,null,bgmGain);
    step++;
  }
  function bgm(on){
    clearInterval(bgmId);bgmId=null;
    if(on&&AC){step=0;bgmId=setInterval(bgmStep,240)}
  }

  function setMuted(m){
    muted=m;
    if(master)master.gain.value=m?0:1;
    btn.textContent=m?'🔇':'🔊';
  }

  /* tombol mute */
  const st=document.createElement('style');
  st.textContent='.mute{position:fixed;right:max(10px,env(safe-area-inset-right));bottom:max(10px,env(safe-area-inset-bottom));z-index:60;width:40px;height:40px;border-radius:50%;border:3px solid #f6cfe0;background:rgba(40,38,70,.82);font-size:18px;line-height:1;cursor:pointer;box-shadow:0 4px 0 rgba(0,0,0,.25);padding:0;display:flex;align-items:center;justify-content:center}.mute:active{transform:translateY(3px);box-shadow:0 1px 0 rgba(0,0,0,.25)}';
  document.head.appendChild(st);
  const btn=document.createElement('button');
  btn.className='mute';btn.textContent='🔊';btn.setAttribute('aria-label','Sound');
  btn.addEventListener('pointerdown',e=>e.stopPropagation());
  btn.addEventListener('click',()=>{init();setMuted(!muted);if(!muted)play('click')});
  document.body.appendChild(btn);

  /* unlock audio di sentuhan pertama + pause saat tab disembunyikan */
  ['pointerdown','touchend','click'].forEach(ev=>document.addEventListener(ev,init,{passive:true}));
  document.addEventListener('visibilitychange',()=>{
    if(!ac)return;
    if(document.hidden)ac.suspend();else ac.resume();
  });

  return{init,play,bgm,setMuted};
})();

function spr(w,h,fn){const c=document.createElement('canvas');c.width=w;c.height=h;fn(c.getContext('2d'));return c.toDataURL()}
const R=(g,x,y,w,h,c)=>{g.fillStyle=c;g.fillRect(x,y,w,h)};
function E(g,cx,cy,rx,ry,fill,out){
  for(let y=Math.floor(cy-ry-1);y<=cy+ry+1;y++)for(let x=Math.floor(cx-rx-1);x<=cx+rx+1;x++){
    const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry,d=Math.sqrt(dx*dx+dy*dy);
    if(d<=1){g.fillStyle=(out&&d>1-1/Math.min(rx,ry))?out:fill;g.fillRect(x,y,1,1)}
  }
}
const inE=(x,y,cx,cy,rx,ry,s)=>{const dx=(x+.5-cx)/rx,dy=(y+.5-cy)/ry;return Math.sqrt(dx*dx+dy*dy)<=1-(s||0)};

/* ================= FOOD SPRITES (16x16) ================= */
const FOOD={};
FOOD.cupcake=spr(16,16,g=>{
  for(let y=10;y<=14;y++){const a=3+(y>11?1:0)+(y>13?1:0);R(g,a,y,13-a-(a-3)+0,1,'#e3a867')}
  R(g,3,10,10,2,'#e3a867');R(g,4,12,8,2,'#d99b57');R(g,5,14,6,1,'#c98847');
  [5,8,11].forEach(x=>R(g,x,10,1,4,'#c98847'));
  R(g,5,15,6,1,'#7a4a22');R(g,2,10,1,2,'#7a4a22');R(g,13,10,1,2,'#7a4a22');
  E(g,8,8,6,3.2,'#ff9cc7','#bf3f7d');E(g,8,5.5,4,3,'#ff9cc7','#bf3f7d');E(g,8,3.4,2,1.7,'#ff9cc7','#bf3f7d');
  R(g,5,8,1,1,'#4cc9f0');R(g,10,7,1,1,'#ffe066');R(g,8,5,1,1,'#7bd88f');R(g,11,9,1,1,'#fff');R(g,6,6,1,1,'#ffd9ea');R(g,7,0,2,2,'#e63946');
});
FOOD.cookie=spr(16,16,g=>{
  E(g,8,8,7,7,'#dba760','#8a5527');E(g,7,6.5,4,3.5,'#e8bb74');
  [[5,5],[9,4],[10,8],[6,10],[11,11],[4,8],[8,8]].forEach(p=>{R(g,p[0],p[1],2,2,'#4a2a14')});
  R(g,12,5,1,1,'#4a2a14');R(g,8,12,1,1,'#4a2a14');
});
FOOD.muffin=spr(16,16,g=>{
  E(g,8,7,7,5.5,'#d98a3d','#8a4a1a');E(g,6.5,5,3.5,2.5,'#eaa456');
  [[4,5],[8,3],[10,6],[6,8],[12,8]].forEach(p=>R(g,p[0],p[1],2,2,'#4a2a14'));
  for(let y=10;y<=15;y++){const a=3+(y>12?1:0)+(y>14?1:0);R(g,a,y,10-(a-3)*2,1,'#efcf9a')}
  [5,8,11].forEach(x=>R(g,x,10,1,5,'#d3a867'));R(g,5,15,6,1,'#8a6a3a');R(g,2,9,1,2,'#8a4a1a');R(g,13,9,1,2,'#8a4a1a');
});
FOOD.donut=spr(16,16,g=>{
  E(g,8,8,7,7,'#e8b46a','#9a6228');E(g,8,8,6,6,'#ff8fbf','#bf3f7d');E(g,6.5,5.5,3,2,'#ffb6d6');
  E(g,8,8,3,3,'#9a6228');
  for(let y=0;y<16;y++)for(let x=0;x<16;x++)if(Math.hypot(x+.5-8,y+.5-8)<1.9)g.clearRect(x,y,1,1);
  [[4,5,'#4cc9f0'],[11,4,'#ffe066'],[12,9,'#7bd88f'],[4,11,'#fff'],[8,13,'#ffe066'],[10,12,'#4cc9f0'],[7,3,'#fff'],[13,7,'#fff']].forEach(p=>R(g,p[0],p[1],2,1,p[2]));
});
FOOD.apple=spr(16,16,g=>{
  E(g,8,9,6.5,6,'#d62839','#7a1020');R(g,4,6,2,3,'#ff7a85');R(g,8,2,1,3,'#5a3a1a');E(g,11.5,3.2,2.6,1.6,'#4caf50','#1f6b2a');
});
FOOD.pear=spr(16,16,g=>{
  E(g,8,11,5.5,5,'#b9d44a','#5f7a1a');E(g,8,6,3.2,3.8,'#b9d44a','#5f7a1a');R(g,6,10,2,3,'#d9ec7c');R(g,8,1,1,3,'#5a3a1a');E(g,11,2.5,2.4,1.5,'#4caf50','#1f6b2a');
});
FOOD.carrot=spr(16,16,g=>{
  for(let t=0;t<12;t++){const cx=2+t,cy=13-Math.floor(t*.7),h=Math.min(3,.4+t*.28);R(g,cx,Math.round(cy-h),1,Math.round(h*2)+1,'#f57c1f')}
  R(g,7,10,1,2,'#c9570f');R(g,9,8,1,2,'#c9570f');R(g,5,12,1,1,'#c9570f');
  R(g,12,2,2,4,'#4caf50');R(g,13,1,2,3,'#2f8a3a');R(g,11,4,2,2,'#4caf50');R(g,14,4,2,3,'#2f8a3a');
});
FOOD.cabbage=spr(16,16,g=>{
  E(g,8,8,7,7,'#9ccf6a','#3f7a2a');E(g,6,9,4,5,'#b5de80','#5a9a3a');E(g,10.5,7,3.5,5,'#a7d672','#5a9a3a');
  R(g,8,3,1,10,'#dff3c0');R(g,5,6,1,6,'#dff3c0');R(g,11,5,1,5,'#dff3c0');
});
const SWEET=['cupcake','cookie','muffin','donut'];
const ORDER=['carrot','cupcake','pear','cookie','cabbage','donut','apple','muffin'];

/* heart / star / misc */
function heartSpr(n,fill,out){return spr(n,n,g=>{
  const inside=(x,y)=>{if(x<0||y<0||x>=n||y>=n)return false;const u=(x+.5-n/2)/(n/2)*1.28,v=-(y+.5-n/2.15)/(n/2)*1.28,a=u*u+v*v-1;return a*a*a-u*u*v*v*v<=0};
  for(let y=0;y<n;y++)for(let x=0;x<n;x++)if(inside(x,y)){const ed=!inside(x-1,y)||!inside(x+1,y)||!inside(x,y-1)||!inside(x,y+1);g.fillStyle=ed?out:fill;g.fillRect(x,y,1,1)}
  R(g,Math.round(n*.25),Math.round(n*.28),1,1,'#ffe0ee');
})}
const HEART=heartSpr(11,'#ff5c9a','#8b1d4a');
const STAR=spr(9,9,g=>{R(g,4,0,1,9,'#ffe066');R(g,0,4,9,1,'#ffe066');R(g,3,3,3,3,'#fff4b0');R(g,2,2,1,1,'#ffe066');R(g,6,2,1,1,'#ffe066');R(g,2,6,1,1,'#ffe066');R(g,6,6,1,1,'#ffe066')});

/* ================= CELERY (48x36) ================= */
function drawCelery(g,state){
  const K='#191722',K2='#32303f',O='#262234',W='#f4f0ef',W2='#d9d2d6',SK='#f7f2ef',B1='#6e9bc8',B2='#4d77a6',B3='#a8cdeb',BL='#3d5aa0',BL2='#25356a',MOUTH='#7a2a40';
  const full=state==='full';
  // legs
  R(g,31,22,4,8,K);R(g,30,29,6,3,O);R(g,32,29,3,1,'#6a6878');
  R(g,38,22,4,7,K);R(g,37,28,6,3,O);R(g,39,28,3,1,'#6a6878');
  // scarf strip
  R(g,26,21,3,12,BL);R(g,26,28,3,5,BL2);R(g,27,21,1,9,'#5a7ac2');
  if(full)E(g,33,17,11.5,10.5,K,'#0d0c14');
  // torso
  R(g,23,5,19,19,K);R(g,22,7,21,15,K);R(g,24,4,17,1,K2);R(g,25,6,14,2,K2);R(g,34,9,6,10,'#232030');R(g,41,8,1,12,K2);
  R(g,26,3,3,3,'#5d7fa3');R(g,27,3,1,1,'#a9c6df');
  // cuff + arm
  R(g,18,5,10,8,W);R(g,17,6,1,6,O);R(g,18,4,10,1,O);R(g,18,13,10,1,O);R(g,18,11,10,2,W2);R(g,28,6,1,6,O);
  R(g,19,14,4,8,K);R(g,19,22,4,3,W);R(g,19,25,4,1,O);R(g,18,22,1,3,O);R(g,23,22,1,3,O);
  // head: hair back, face, hair front
  E(g,13,21,12.5,11.5,B2,O);
  E(g,12,24,8.8,7.8,SK,O);
  for(let y=0;y<36;y++)for(let x=0;x<28;x++){
    if(inE(x,y,13,21,12.5,11.5,.09)&&!inE(x,y,12,26.2,7.2,5.4,0)){g.fillStyle=(y>22&&(x<5||x>19))?B2:B1;g.fillRect(x,y,1,1)}
    else if(inE(x,y,12,26.2,7.2,5.4,0)&&!inE(x,y,12,26.2,7.2,5.4,.16)&&y<31){g.fillStyle=O;g.fillRect(x,y,1,1)}
  }
  // opening re-fill face tone inside
  for(let y=0;y<36;y++)for(let x=0;x<28;x++)if(inE(x,y,12,26.2,7.2,5.4,.16)){g.fillStyle=SK;g.fillRect(x,y,1,1)}
  // hair details
  R(g,0,23,2,5,B1);R(g,1,28,1,3,B2);R(g,2,18,2,3,B1);R(g,11,8,3,3,B1);R(g,14,7,1,2,B3);R(g,12,9,1,1,B2);
  R(g,9,15,1,6,B2);R(g,15,14,1,7,B2);R(g,19,16,1,6,B2);R(g,6,13,4,1,B3);R(g,13,12,5,1,B3);R(g,5,18,1,5,B3);
  R(g,10,21,2,3,B1);R(g,13,21,2,2,B1);R(g,17,21,2,4,B1);
  // face by state
  const eyeL=(...a)=>a.forEach(p=>R(g,p[0],p[1],1,1,O));
  const blush=(c)=>{R(g,5,28,3,2,c);R(g,17,28,3,2,c)};
  if(state==='idle'){R(g,7,26,3,1,O);R(g,14,26,3,1,O);R(g,10,29,4,1,'#8a4660');R(g,11,30,2,1,MOUTH);blush('#ffc9d6')}
  else if(state==='happy'||full){eyeL([7,27],[8,26],[9,27],[14,27],[15,26],[16,27]);blush('#ff9fb6');R(g,10,29,5,1,O);R(g,11,30,3,1,'#c84a6a');if(full){R(g,18,25,1,1,'#fff');R(g,6,25,1,1,'#fff')}}
  else if(state==='eat1'){R(g,7,26,3,1,O);R(g,14,26,3,1,O);E(g,12.5,30,2.2,2,MOUTH,O);R(g,12,31,2,1,'#ff7a95');blush('#ffc9d6')}
  else if(state==='eat2'){R(g,7,26,3,1,O);R(g,14,26,3,1,O);R(g,11,29,3,1,O);R(g,4,28,3,3,'#ffc0cc');R(g,18,28,3,3,'#ffc0cc')}
  else if(state==='dizzy'){
    const sp=['.###.','#...#','#.##.','#....','.###.'];
    [[6,23],[13,23]].forEach(o=>sp.forEach((row,j)=>[...row].forEach((ch,i)=>{if(ch==='#')R(g,o[0]+i,o[1]+j,1,1,O)})));
    [[9,30],[10,31],[11,30],[12,31],[13,30],[14,31]].forEach(p=>R(g,p[0],p[1],1,1,'#8a4660'));
    R(g,5,28,3,2,'#ffc9d6');R(g,17,28,3,2,'#ffc9d6');R(g,21,19,1,3,'#8ad8ff');R(g,20,22,3,1,'#8ad8ff');
  }
  else if(state==='no'){eyeL([7,25],[8,26],[9,27],[7,27],[16,25],[15,26],[14,27],[16,27]);R(g,10,30,5,1,O);R(g,9,31,1,1,O);R(g,15,31,1,1,O);R(g,21,19,1,3,'#8ad8ff');R(g,20,22,3,1,'#8ad8ff')}
}
const ST={};['idle','happy','eat1','eat2','no','full','dizzy'].forEach(s=>ST[s]=spr(48,36,g=>drawCelery(g,s)));

/* ================= HAND + CHAIN + VASE ================= */
const HAND=spr(44,28,g=>{
  const K='#191722',K2='#32303f',W='#f4f0ef',W2='#d3cbd0';
  R(g,34,6,10,16,K);R(g,34,6,10,1,K2);
  R(g,27,7,7,14,W);R(g,27,7,7,1,OUT);R(g,27,20,7,1,OUT);R(g,27,18,7,2,W2);R(g,26,8,1,12,OUT);
  R(g,14,3,14,19,K);R(g,13,5,1,15,K);R(g,15,3,10,1,K2);
  R(g,20,2,5,8,'#4a4a55');R(g,21,3,1,6,'#9a9aa8');R(g,23,3,1,6,'#9a9aa8');R(g,20,2,5,1,'#6a6a78');
  for(let i=0;i<4;i++){const y=4+i*5;R(g,3,y,12,5,W);R(g,3,y,12,1,OUT);R(g,2,y+1,1,3,OUT);R(g,3,y+4,12,1,OUT);R(g,9,y+2,5,2,W2)}
  R(g,7,6,5,1,K);R(g,7,7,4,1,K);R(g,7,8,3,1,K);R(g,6,9,3,1,K);R(g,6,10,2,1,K);R(g,5,11,2,1,K);R(g,5,12,1,1,K);
  R(g,17,22,3,2,'#5d7fa3');
});
const CHAIN=spr(5,12,g=>{for(let i=0;i<3;i++){const y=i*4;R(g,1,y,3,4,'#6f93b8');R(g,2,y+1,1,2,'#2a3a52');R(g,1,y,3,1,'#a9c6df');R(g,0,y+1,1,2,'#4a6a8f');R(g,4,y+1,1,2,'#4a6a8f')}});
const VASE=spr(28,48,g=>{
  [12,14,16,18].forEach((x,i)=>R(g,x,18-i%2*2,1,28,'#4f7a3a'));
  R(g,13,22,1,8,'#6f9a4b');
  const L='#f3efd8',LO='#b3aa82';
  E(g,8,13,6,5,L,LO);E(g,19,10,6,5,L,LO);E(g,13,5,5,4.4,L,LO);E(g,22,17,5,4,L,LO);E(g,5,21,5,4,L,LO);
  [[7,12],[18,9],[13,4],[21,16],[5,20]].forEach(p=>{R(g,p[0],p[1],1,2,'#d86b4a');R(g,p[0]+2,p[1]+1,1,2,'#d86b4a')});
  R(g,8,30,13,17,'rgba(196,224,238,.6)');R(g,7,30,1,17,'#7fa2b5');R(g,21,30,1,17,'#7fa2b5');R(g,7,47,15,1,'#7fa2b5');R(g,8,29,13,1,'#9fc0d2');
  R(g,8,35,13,12,'rgba(150,200,225,.45)');R(g,9,31,1,12,'rgba(255,255,255,.6)');
  [12,14,16,18].forEach(x=>R(g,x,30,1,17,'rgba(79,122,58,.8)'));
});

/* ================= COVER decor ================= */
function flower(g,cx,cy,c1,c2){[[0,-4],[4,-1],[2.5,3.5],[-2.5,3.5],[-4,-1]].forEach(p=>E(g,cx+p[0],cy+p[1],2.8,2.8,c1,c2));E(g,cx,cy,2.2,2.2,'#ffd23f','#c98a10')}
const VINE=spr(26,120,g=>{
  const sx=y=>Math.round(9+4*Math.sin(y/10));
  for(let y=0;y<120;y++){R(g,sx(y),y,2,1,'#6f9a4b');R(g,sx(y),y,1,1,'#8bb866')}
  for(let y=12;y<112;y+=14){const x=sx(y),d=((y/14)|0)%2?1:-1;E(g,x+(d>0?5:-3),y-1,4,2,'#86b86a','#3f6b32')}
  flower(g,15,20,'#ff9cc7','#d4498a');flower(g,9,52,'#ff7fae','#d4498a');flower(g,17,84,'#ff9cc7','#d4498a');flower(g,10,108,'#ff7fae','#d4498a');
  E(g,20,40,2,2.5,'#ff6d9c','#b8346a');E(g,4,72,2,2.5,'#ff6d9c','#b8346a');
});

/* ================= SCENE BUILDER ================= */
function buildScene(root,mode){
  root.innerHTML=
   '<div class="scene">'+
   '<div class="tbl"></div><img class="vase"><div class="sleeve"></div><img class="hand">'+
   '<div class="rig"><img class="chain"><img class="cel"><div class="headhit"></div><div class="bubble"><img class="req"></div></div>'+
   '<div class="fx"></div>'+
   (mode==='game'?'<div class="hud"><div>SATISFIED</div><div class="row"></div></div>':'')+
   (mode==='end'?'<div class="endbox"><div class="endttl">GLUT!</div><button class="btn" id="againBtn">PLAY AGAIN</button></div>':'')+
   '</div>';
  const q=s=>root.querySelector(s);
  const S={root,mode,el:q('.scene'),tbl:q('.tbl'),vase:q('.vase'),hand:q('.hand'),sleeve:q('.sleeve'),rig:q('.rig'),chain:q('.chain'),cel:q('.cel'),head:q('.headhit'),bub:q('.bubble'),req:q('.req'),fx:q('.fx'),hud:q('.hud'),end:q('.endbox'),foods:[],u:4};
  S.vase.src=VASE;S.hand.src=HAND;S.chain.src=CHAIN;S.cel.src=ST.idle;
  if(mode==='end'){S.bub.className='bubble txt';S.bub.innerHTML='NOM NOM!';S.root.classList.add('full')}
  if(mode==='game'){
    const row=q('.hud .row');S.hearts=[];
    for(let i=0;i<NEED;i++){const im=document.createElement('img');im.src=HEART;row.appendChild(im);S.hearts.push(im)}
  }
  return S;
}
const NEED=5;
function layout(S){
  const r=S.el.getBoundingClientRect(),W=r.width,H=r.height;
  if(!W||!H)return;
  const portrait=H>W*1.05;
  const u=Math.max(3,Math.min(9,Math.floor(Math.min(W/72,H*.7/70))));
  S.u=u;S.W=W;S.H=H;
  const tH=Math.round(H*(portrait?.30:.28)),tT=H-tH;S.tH=tH;S.tT=tT;
  S.tbl.style.height=tH+'px';
  const vs=Math.max(2,Math.floor(u*.75));
  S.vase.style.width=28*vs+'px';S.vase.style.left=Math.round(W*.025)+'px';S.vase.style.bottom=(tH-12)+'px';
  const chainX=Math.min(Math.max(W*.55,27*u+8),W-21*u-8);S.chainX=chainX;
  const hL=Math.round(chainX-18.5*u);
  Object.assign(S.hand.style,{left:hL+'px',top:'0px',width:44*u+'px'});
  Object.assign(S.sleeve.style,{left:hL+44*u-1+'px',top:6*u+'px',height:16*u+'px',width:Math.max(0,W-hL-44*u+300)+'px'});
  if(S.handhit)Object.assign(S.handhit.style,{left:hL+2*u+'px',top:2*u+'px',width:26*u+'px',height:22*u+'px'});
  Object.assign(S.rig.style,{left:Math.round(chainX-2.5*u)+'px',top:22*u+'px',width:5*u+'px',height:'1px'});
  Object.assign(S.chain.style,{left:'0',top:'0',width:5*u+'px'});
  Object.assign(S.cel.style,{left:-25*u+'px',top:8*u+'px',width:48*u+'px'});
  Object.assign(S.head.style,{left:-24*u+'px',top:17*u+'px',width:24*u+'px',height:23*u+'px'});
  const k=Math.max(2,Math.floor(10*u/16));
  Object.assign(S.bub.style,{left:-18*u+'px',top:3*u+'px',width:14*u+'px',height:13*u+'px'});
  S.req.style.width=16*k+'px';
  if(S.mode==='end'){
    S.end.style.left=Math.round(chainX-6*u)+'px';
    S.end.style.top='0px';
    const bt=Math.round(68*u),bh=S.end.offsetHeight;
    S.end.style.top=Math.max(8,Math.min(bt,H-bh-10))+'px';
  }
  if(S.mode==='game'){
    const cols=portrait?4:8,rows=8/cols,mX=Math.max(8,W*.03),cellW=(W-2*mX)/cols,rowH=(tH-16)/rows;
    const size=Math.min(cellW*.88,rowH*.88),fs=Math.max(2,Math.floor(size/16));
    S.foods.forEach(f=>{
      const i=f.i,w=16*fs;
      f.home={x:Math.round(mX+(i%cols+.5)*cellW-w/2),y:Math.round(tT+14+Math.floor(i/cols)*rowH+(rowH-w)/2)};
      f.el.style.width=f.el.style.height=w+'px';
      if(!f.el.classList.contains('drag')&&!f.busy){f.el.style.left=f.home.x+'px';f.el.style.top=f.home.y+'px'}
    });
  }
}

/* ================= PAGE 2 : GAME ================= */
const P={1:document.getElementById('p1'),2:document.getElementById('p2'),3:document.getElementById('p3')};
const G=buildScene(P[2],'game');
const E3=buildScene(P[3],'end');
let fed=0,busy=false,req=null,zTop=30,ct=null,bag=[];
const shuffle=a=>a.slice().sort(()=>Math.random()-.5);

function setCel(S,st,ms){clearTimeout(ct);if(S.sh&&S.sh.dz)return;S.cel.src=ST[st];if(ms)ct=setTimeout(()=>{if(!(S.sh&&S.sh.dz))S.cel.src=ST.idle},ms)}
function rePop(el,cls){el.classList.remove(cls);void el.offsetWidth;el.classList.add(cls)}

function buildFoods(){
  ORDER.forEach((name,i)=>{
    const el=document.createElement('div');el.className='food';
    const im=document.createElement('img');im.src=FOOD[name];el.appendChild(im);G.el.appendChild(el);
    const f={name,i,el,home:{x:0,y:0},busy:false};G.foods.push(f);
    let dx=0,dy=0;
    el.addEventListener('pointerdown',e=>{
      if(f.busy)return;e.preventDefault();
      try{el.setPointerCapture(e.pointerId)}catch(_){}
      const r=el.getBoundingClientRect();dx=e.clientX-r.left;dy=e.clientY-r.top;
      el.classList.add('drag');el.style.zIndex=++zTop;SFX.play('pick');
    });
    el.addEventListener('pointermove',e=>{
      if(!el.classList.contains('drag'))return;
      const sr=G.el.getBoundingClientRect();
      el.style.left=(e.clientX-sr.left-dx)+'px';el.style.top=(e.clientY-sr.top-dy)+'px';
    });
    const up=()=>{if(el.classList.contains('drag'))drop(f)};
    el.addEventListener('pointerup',up);el.addEventListener('pointercancel',up);
  });
}
function goHome(f){f.el.classList.remove('drag');f.el.style.left=f.home.x+'px';f.el.style.top=f.home.y+'px'}

function drop(f){
  const el=f.el;el.classList.remove('drag');
  const fr=el.getBoundingClientRect(),cr=G.cel.getBoundingClientRect();
  const cx=fr.left+fr.width/2,cy=fr.top+fr.height/2,pad=G.u*1.5;
  const hit=cx>cr.left-pad&&cx<cr.right+pad&&cy>cr.top-pad&&cy<cr.bottom+pad;
  if(!hit||busy){SFX.play('drop');goHome(f);return}
  if(f.name===req)eat(f,fr,cr);
  else{
    SFX.play('no');
    setCel(G,'no',1000);G.sh.av+=(Math.random()<.5?-1:1)*7;rePop(G.bub,'bad');
    goHome(f);
  }
}
function eat(f,fr,cr){
  busy=true;f.busy=true;
  SFX.play('crunch');setTimeout(()=>SFX.play('yum'),780);
  const sr=G.el.getBoundingClientRect(),u=G.u;
  const mx=cr.left+13*u-sr.left,my=cr.top+29*u-sr.top;
  f.el.classList.add('eaten');
  f.el.style.left=(mx-fr.width/2)+'px';f.el.style.top=(my-fr.height/2)+'px';
  clearTimeout(ct);
  [['eat1',0],['eat2',200],['eat1',400],['eat2',600],['happy',780]].forEach(a=>setTimeout(()=>{G.cel.src=ST[a[0]]},a[1]));
  for(let i=0;i<7;i++){const c=document.createElement('div');c.className='crumb';c.style.left=mx+'px';c.style.top=my+'px';
    c.style.setProperty('--dx',(Math.random()*70-35)+'px');c.style.setProperty('--dy',(Math.random()*-50-5)+'px');G.fx.appendChild(c);setTimeout(()=>c.remove(),800)}
  setTimeout(()=>{
    fed++;updateHud();
    heart(G,mx+u*2,my-u*3);heart(G,mx-u*3,my-u*5);
    rePop(G.cel,'bob');
  },780);
  setTimeout(()=>{ // respawn the food
    f.el.classList.add('nt');f.el.classList.remove('eaten');
    f.el.style.left=f.home.x+'px';f.el.style.top=f.home.y+'px';f.el.style.opacity=0;
    void f.el.offsetWidth;f.el.classList.remove('nt');f.el.style.opacity=1;rePop(f.el,'popin');f.busy=false;
  },1100);
  setTimeout(()=>{
    if(fed>=NEED){setTimeout(()=>go(3),500)}
    else{busy=false;G.cel.src=ST.idle;nextReq()}
  },1250);
}
function nextReq(){
  if(!bag.length)bag=shuffle(SWEET);
  if(bag[0]===req)bag.push(bag.shift());
  req=bag.shift();
  G.req.src=FOOD[req];rePop(G.bub,'pop');SFX.play('ask');
}
function updateHud(){G.hearts.forEach((h,i)=>h.classList.toggle('on',i<fed))}
function heart(S,x,y,sm){
  const im=document.createElement('img');im.src=HEART;const w=(sm?9:13)*Math.max(2,Math.floor(S.u*.6));
  im.style.width=w+'px';im.style.left=(x-w/2)+'px';im.style.top=(y-w/2)+'px';im.style.setProperty('--dx',(Math.random()*60-30)+'px');
  S.fx.appendChild(im);setTimeout(()=>im.remove(),1350);
}
function star(S,x,y){
  const im=document.createElement('img');im.src=STAR;const w=9*Math.max(2,Math.floor(S.u*.5));
  im.style.width=w+'px';im.style.left=x+'px';im.style.top=y+'px';im.style.setProperty('--dx',(Math.random()*80-40)+'px');
  S.fx.appendChild(im);setTimeout(()=>im.remove(),1350);
}
function resetGame(){
  fed=0;busy=false;req=null;bag=['cupcake'].concat(shuffle(SWEET.filter(x=>x!=='cupcake')));updateHud();G.cel.src=ST.idle;
  G.foods.forEach(f=>{f.busy=false;f.el.classList.remove('eaten','drag');f.el.style.opacity=1});
  layout(G);nextReq();
}

/* petting (stroke the head) */
(function(){
  let lx=null,ly=null,dirX=0,dirY=0,rev=0,acc=0,lastT=0;
  G.head.addEventListener('pointermove',e=>{
    if(busy)return;
    if(lx===null){lx=e.clientX;ly=e.clientY;return}
    const dx=e.clientX-lx,dy=e.clientY-ly;
    if(Math.abs(dx)>=3){const d=Math.sign(dx);if(dirX&&d!==dirX){rev++}dirX=d;lx=e.clientX}
    if(Math.abs(dy)>=3){const d=Math.sign(dy);if(dirY&&d!==dirY){rev++}dirY=d;ly=e.clientY}
    if(rev>=2){
      rev=0;const now=Date.now();
      const sr=G.el.getBoundingClientRect();
      heart(G,e.clientX-sr.left+(Math.random()*30-15),e.clientY-sr.top-10);
      if(now-lastT>500){rePop(G.cel,'bob');SFX.play('pet')}lastT=now;
      setCel(G,'happy',1100);
    }
  });
  const reset=()=>{lx=ly=null;dirX=dirY=0;rev=0};
  G.head.addEventListener('pointerleave',reset);G.head.addEventListener('pointerup',reset);G.head.addEventListener('pointerdown',()=>{lx=ly=null;dirX=dirY=0});
})();

/* ================= drag the hand -> Celery swings ================= */
function enableShake(S){
  const st={hx:0,hy:0,hvx:0,hvy:0,tx:0,ty:0,drag:false,ang:0,av:0,pvx:0,dz:false,dzT:0};S.sh=st;
  const hh=document.createElement('div');hh.className='handhit';S.el.appendChild(hh);S.handhit=hh;
  S.dzs=[];
  if(S.mode==='game')for(let i=0;i<3;i++){const im=document.createElement('img');im.src=STAR;im.className='dzs';
    im.style.filter=['none','hue-rotate(300deg)','hue-rotate(170deg)'][i];S.rig.appendChild(im);S.dzs.push(im)}
  let px0=0,py0=0,b0x=0,b0y=0;
  hh.addEventListener('pointerdown',e=>{e.preventDefault();try{hh.setPointerCapture(e.pointerId)}catch(_){}
    st.drag=true;px0=e.clientX;py0=e.clientY;b0x=st.hx;b0y=st.hy;st.tx=st.hx;st.ty=st.hy;hh.classList.add('grab')});
  hh.addEventListener('pointermove',e=>{if(!st.drag)return;st.tx=b0x+e.clientX-px0;st.ty=b0y+e.clientY-py0});
  const up=()=>{st.drag=false;hh.classList.remove('grab')};
  hh.addEventListener('pointerup',up);hh.addEventListener('pointercancel',up);
}
let lastT=performance.now();
function tick(now){
  const dt=Math.min(.033,Math.max(.001,(now-lastT)/1000));lastT=now;
  [G,E3].forEach(S=>{
    const st=S.sh;if(!st||!S.u)return;
    const u=S.u;
    if(st.drag){
      st.tx=Math.max(-S.W*.4,Math.min(S.W*.4,st.tx));st.ty=Math.max(-3*u,Math.min(S.H*.22,st.ty));
      const k=Math.min(1,dt*22),nx=st.hx+(st.tx-st.hx)*k,ny=st.hy+(st.ty-st.hy)*k;
      st.hvx=(nx-st.hx)/dt;st.hvy=(ny-st.hy)/dt;st.hx=nx;st.hy=ny;
    }else{
      st.hvx+=(-90*st.hx-11*st.hvx)*dt;st.hvy+=(-90*st.hy-11*st.hvy)*dt;
      st.hx+=st.hvx*dt;st.hy+=st.hvy*dt;
    }
    const ax=Math.max(-8000,Math.min(8000,(st.hvx-st.pvx)/dt));st.pvx=st.hvx;
    const L=28*u;
    st.av+=(-30*st.ang-1.3*st.av+ax/L*.6)*dt;
    st.ang+=st.av*dt;
    if(st.ang>1.25){st.ang=1.25;st.av*=-.3}else if(st.ang<-1.25){st.ang=-1.25;st.av*=-.3}
    const disp=st.ang+.04*Math.sin(now/1000*2.2+(S===E3?1.5:0));
    const tr='translate('+st.hx.toFixed(1)+'px,'+st.hy.toFixed(1)+'px)';
    S.hand.style.transform=tr;S.sleeve.style.transform=tr;if(S.handhit)S.handhit.style.transform=tr;
    S.rig.style.transform=tr+' rotate('+disp.toFixed(4)+'rad)';
    if(S===G){ // dizzy face when shaken hard
      if(Math.abs(st.av)>3.5&&!busy){if(!st.dz){st.dz=true;clearTimeout(ct);G.cel.src=ST.dizzy;G.cel.classList.add('dizzy');SFX.play('dizzy')}st.dzT=now}
      else if(st.dz&&now-st.dzT>1400){st.dz=false;G.cel.classList.remove('dizzy');if(!busy)G.cel.src=ST.idle}
      const show=st.dz&&!busy;
      if(show){
        const ph=now/1000*7,sw=9*Math.max(2,Math.floor(u*.45));
        S.dzs.forEach((im,i)=>{
          const a=ph+i*2.094,s=.85+.3*Math.sin(a);
          im.style.display='block';im.style.width=sw*s+'px';
          im.style.left=(-12*u+10*u*Math.cos(a)-sw*s/2)+'px';
          im.style.top=(15*u+2.5*u*Math.sin(a)-sw*s/2)+'px';
          im.style.zIndex=Math.sin(a)>0?3:0;
        });
      }else S.dzs.forEach(im=>im.style.display='none');
    }
  });
  requestAnimationFrame(tick);
}
enableShake(G);enableShake(E3);requestAnimationFrame(tick);

/* ================= PAGE 3 ================= */
let fxTimer=null;
function startEnd(){
  stopEnd();layout(E3);E3.cel.src=ST.full;
  const burst=()=>{
    const sr=E3.el.getBoundingClientRect(),u=E3.u,cx=sr.left+E3.chainX-sr.left;
    const hx=E3.chainX-14*u+(Math.random()*16-8)*u,hy=22*u+22*u+(Math.random()*10-5)*u;
    heart(E3,hx,hy);
    if(Math.random()<.7)star(E3,E3.chainX-30*u+Math.random()*50*u,22*u+Math.random()*36*u);
    if(Math.random()<.35){const z=document.createElement('div');z.className='zz';z.textContent='Z';z.style.left=(E3.chainX-22*u)+'px';z.style.top=(22*u+20*u)+'px';E3.fx.appendChild(z);setTimeout(()=>z.remove(),2300)}
  };
  burst();fxTimer=setInterval(burst,420);
}
function stopEnd(){clearInterval(fxTimer);fxTimer=null;E3.fx.innerHTML=''}

/* ================= NAV ================= */
function go(n){
  Object.keys(P).forEach(k=>P[k].classList.toggle('active',+k===n));
  if(n===2){resetGame();stopEnd();SFX.bgm(true)}
  if(n===3){startEnd();SFX.bgm(false);SFX.play('win')}
  if(n===1){stopEnd();SFX.bgm(false)}
}
document.getElementById('playBtn').addEventListener('click',()=>{SFX.init();SFX.play('start');go(2)});
document.getElementById('againBtn').addEventListener('click',()=>{SFX.init();SFX.play('start');go(2)});

/* cover decor */
function coverDecor(){
  const W=innerWidth,H=innerHeight,k=Math.max(2,Math.min(H*.8/120,W*.16/26));
  ['vineL','vineR'].forEach(id=>{const v=document.getElementById(id);v.src=VINE;v.style.height=120*k+'px';v.style.width=26*k+'px'});
}
coverDecor();
for(let i=0;i<16;i++){const p=document.createElement('div');p.className='petal';
  p.style.left=Math.random()*100+'vw';p.style.setProperty('--dx',(Math.random()*120-60)+'px');
  p.style.animationDuration=(7+Math.random()*7)+'s';p.style.animationDelay=(-Math.random()*12)+'s';
  p.style.transform='scale('+(.6+Math.random()*.8)+')';P[1].appendChild(p)}

(function(){
  let i=0;
  document.querySelectorAll('.ttl').forEach(t=>{const s=t.textContent.trim();t.textContent='';[...s].forEach(ch=>{const sp=document.createElement('span');sp.textContent=ch;sp.style.setProperty('--i',i++);t.appendChild(sp)})});
  const sp=document.getElementById('sparkles');
  for(let n=0;n<18;n++){const im=document.createElement('img');im.src=STAR;im.className='tw';im.style.width=(2+Math.floor(Math.random()*2))*9+'px';
    im.style.left=(4+Math.random()*92)+'%';im.style.top=(4+Math.random()*92)+'%';im.style.animationDelay=(-Math.random()*2.4)+'s';im.style.animationDuration=(1.8+Math.random()*2)+'s';sp.appendChild(im)}
  [FOOD.cupcake,FOOD.donut,FOOD.cookie,FOOD.muffin,HEART,FOOD.cupcake,FOOD.donut].forEach((src,n)=>{
    const im=document.createElement('img');im.src=src;im.className='fl';im.style.width=(src===HEART?11:16)*(2+n%2)+'px';
    im.style.left=((6+n*13)%92)+'%';im.style.bottom='-70px';im.style.animationDuration=(10+Math.random()*7)+'s';im.style.animationDelay=(-Math.random()*14)+'s';sp.appendChild(im)});
})();
buildFoods();
function relayout(){coverDecor();layout(G);layout(E3)}
addEventListener('resize',relayout);addEventListener('orientationchange',()=>setTimeout(relayout,200));
document.addEventListener('contextmenu',e=>e.preventDefault());
document.addEventListener('gesturestart',e=>e.preventDefault());
relayout();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(relayout);
})();