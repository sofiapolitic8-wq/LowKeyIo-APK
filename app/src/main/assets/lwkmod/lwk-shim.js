/* LowKey.io APK: chrome.* shim (storage + messaging over localStorage) + touch buttons */
(function(){
if(window.__lwkShim)return;window.__lwkShim=1;
var K="__lwkext_store",BASE="https://lwkmod.local/",chg=[];
function rd(){try{return JSON.parse(localStorage.getItem(K)||"{}")||{}}catch(e){return{}}}
function wr(o){try{localStorage.setItem(K,JSON.stringify(o))}catch(e){}}
function later(f){setTimeout(f,0)}
function clone(v){return v===undefined?v:JSON.parse(JSON.stringify(v))}
function pick(o,keys){var r={},i;if(keys==null)return clone(o);if(typeof keys==="string")keys=[keys];
 if(Array.isArray(keys)){for(i=0;i<keys.length;i++)if(keys[i] in o)r[keys[i]]=clone(o[keys[i]])}
 else{for(i in keys)r[i]=(i in o)?clone(o[i]):keys[i]}return r}
function fire(c){for(var i=0;i<chg.length;i++){try{chg[i](c,"local")}catch(e){}}}
var local={
 get:function(k,cb){var r=pick(rd(),k);if(cb)later(function(){cb(r)})},
 set:function(d,cb){var o=rd(),c={},k;for(k in d){c[k]={oldValue:o[k],newValue:clone(d[k])};o[k]=clone(d[k])}wr(o);later(function(){cb&&cb();fire(c)})},
 remove:function(k,cb){var o=rd(),c={},i;k=[].concat(k||[]);for(i=0;i<k.length;i++){c[k[i]]={oldValue:o[k[i]]};delete o[k[i]]}wr(o);later(function(){cb&&cb();fire(c)})}
};
function send(a,b,c){var m,cb;if(typeof a==="string"){m=b;cb=c}else{m=a;cb=b}
 if(typeof m==="function"){cb=m;m=null}
 var g=m&&m.greeting?String(m.greeting):"";
 function reply(r){later(function(){cb&&cb(r)})}
 if(g==="ntlStorageGet")reply({ok:true,data:pick(rd(),m.keys||null)});
 else if(g==="ntlStorageSet")local.set(m.data||{},function(){reply({ok:true})});
 else if(g==="ntlStorageRemove")local.remove(m.keys||[],function(){reply({ok:true})});
 else if(g==="dwnldbarON"||g==="dwnldbarOFF")reply({ok:true});
 else reply({ok:false,error:"unsupported"});}
window.chrome=window.chrome||{};
chrome.storage={local:local,onChanged:{addListener:function(f){chg.push(f)}}};
chrome.runtime={id:"lwkmod",lastError:undefined,getURL:function(p){return BASE+p},
 getManifest:function(){return{version:"9.72",name:"LowKey.io"}},
 sendMessage:send,onMessage:{addListener:function(){}}};

/* ---- touch buttons: Spine / Eyes / Settings (drag the grip to move) ---- */
function cfg(){return rd().lwk_cfg||{}}
function fk(k){try{window.dispatchEvent(new KeyboardEvent("keydown",{key:k,bubbles:true,cancelable:true}))}catch(e){}}
function build(){
 if(document.getElementById("lwkTouch")||!document.body)return;
 var st=document.createElement("style");
 st.textContent="#lwkTouch{position:fixed;z-index:99990;display:flex;flex-direction:column;gap:6px;touch-action:none;user-select:none;-webkit-user-select:none}"+
 "#lwkTouch button{min-width:52px;min-height:44px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(18,18,24,.72);color:#f2efe8;font:600 12px sans-serif;padding:6px 10px;position:relative}"+
 "#lwkTouch button:active{background:rgba(230,197,142,.35)}#lwkTouch button.on{border-color:#e6c58e;color:#e6c58e}"+
 "#lwkTouch .grip{min-height:16px;height:16px;padding:0;text-align:center;line-height:12px;color:#8a8577}";
 document.head.appendChild(st);
 var w=document.createElement("div");w.id="lwkTouch";
 var pos={};try{pos=JSON.parse(localStorage.getItem("__lwkext_btnpos")||"{}")}catch(e){}
 w.style.right=pos.r!=null?pos.r+"px":"8px";w.style.top=pos.t!=null?pos.t+"px":"32%";
 function mk(txt,cls,fn){var b=document.createElement("button");b.textContent=txt;if(cls)b.className=cls;
  ["touchstart","touchend","mousedown","mouseup","click"].forEach(function(t){b.addEventListener(t,function(e){e.stopPropagation()},{passive:true})});
  if(fn)b.addEventListener("click",fn);w.appendChild(b);return b}
 var grip=mk("\u22EE\u22EE","grip");
 var sp=mk("Spine",null,function(){fk(cfg().spineKey||"p")});
 mk("Eyes",null,function(){fk(cfg().eyesKey||"u")});
 mk("\u2699 Menu",null,function(){fk(".");setTimeout(function(){fk(".")},60)});
 function paint(){sp.className=cfg().spineView?"on":""}
 chg.push(function(c){if(c.lwk_cfg)paint()});paint();
 var sx,sy,r0,t0,mv=false;
 grip.addEventListener("touchstart",function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY;r0=parseFloat(w.style.right)||8;t0=parseFloat(w.style.top)||0;
  if(String(w.style.top).indexOf("%")>0)t0=w.getBoundingClientRect().top;mv=true},{passive:true});
 grip.addEventListener("touchmove",function(e){if(!mv)return;var t=e.touches[0];
  var r=Math.max(0,Math.min(innerWidth-60,r0-(t.clientX-sx))),tp=Math.max(0,Math.min(innerHeight-140,t0+(t.clientY-sy)));
  w.style.right=r+"px";w.style.top=tp+"px";w.dataset.r=r;w.dataset.t=tp},{passive:true});
 grip.addEventListener("touchend",function(){if(mv&&w.dataset.r!=null)try{localStorage.setItem("__lwkext_btnpos",JSON.stringify({r:+w.dataset.r,t:+w.dataset.t}))}catch(e){}mv=false},{passive:true});
 document.body.appendChild(w);
}
if(document.body)build();else document.addEventListener("DOMContentLoaded",build);
})();
