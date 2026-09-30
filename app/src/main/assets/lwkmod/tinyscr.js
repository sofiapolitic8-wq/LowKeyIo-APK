function c(){
var G=document.documentElement,U=function(f){return chrome.runtime.getURL(f)};
var e=document.createElement("LINK");e.async=false;e.href=U("bootstrap.css");e.rel="stylesheet";e.type="text/css";e.media="screen";G.appendChild(e);
/* PERF: scripts are inserted together with async=false -> they DOWNLOAD in parallel but still EXECUTE in this order.
   (Was: jquery -> fstags (950 KB) -> emoji (150 KB) -> main-mt, each waiting for the previous one's load event.) */
var o=document.createElement("SCRIPT");o.src=U("jquery-2.2.4.min.js");o.async=false;
var t=document.createElement("SCRIPT");t.src=U("main-mt.js");t.async=false;
G.appendChild(o);G.appendChild(t);
t.addEventListener("load",function(){
  /* lwk.js first (features), then the two big data files, which the game waits for only where it really needs them
     (fstags: skin-tag init / emoji-data: chat emoji picker; both have a safe timeout inside main-mt.js). */
  var l=document.createElement("SCRIPT");l.src=U("lwk.js");l.async=false;
  var r=document.createElement("SCRIPT");r.src=U("fstags.js");r.async=false;
  var n=document.createElement("SCRIPT");n.src=U("emoji-data.js");n.async=false;
  G.appendChild(l);G.appendChild(r);G.appendChild(n)
})
}
function u(e){return new Promise(function(t){chrome.storage.local.get(e,function(e){if(chrome.runtime.lastError){t({});return}t(e||{})})})}function s(t){return new Promise(function(e){chrome.storage.local.set(t,function(){e(!chrome.runtime.lastError)})})}function i(e,t){if(t===null||typeof t==="undefined")return undefined;if(e==="cstagext"||e==="fstagext"){try{return JSON.parse(t)}catch(e){return[]}}if(e==="cstagver"||e==="fstagver"||e==="lastupd"){var r=Number(t);return Number.isFinite(r)?r:0}return t}async function f(){var e=["menuimg","cstagext","fstagext","cstagver","fstagver","lastupd"];var t={};var r=[];for(var n=0;n<e.length;n++){var o=e[n];if(window.localStorage&&o in window.localStorage){t[o]=i(o,window.localStorage.getItem(o));r.push(o)}}if(!r.length)return;var a=await s(t);if(!a)return;for(var c=0;c<r.length;c++){window.localStorage.removeItem(r[c])}}window.onload=async function(){await f();window.localStorage.setItem("loadbench",Date.now());window.localStorage.setItem("tinyscrID",chrome.runtime.id);var e=chrome.runtime.getManifest();window.localStorage.setItem("myscrversion",e.version);window.localStorage.setItem("wyrmversion",e.version_name||e.version);var t=["logoih","twt","fb","csrvh"];for(var r=0;r<t.length;r++){var n=document.getElementById(t[r]);if(n&&typeof n.remove==="function"){n.remove()}}var o=await u(["menuimg","menuBgMode","lowkeyTheme"]);

var LV_WARN_MB=30;
function startLobbyVideo(vm,th){
  /* PERF/RAM: - chunks are read + decoded ONE AT A TIME (was: all base64 strings + all Uint8Arrays + Blob alive at once),
                 decoding uses the browser's native base64 decoder when possible
               - as soon as a game starts (#login hidden) the <video>, its blob URL and the Blob are destroyed completely;
                 they are rebuilt when the lobby comes back
               - no 700 ms getComputedStyle polling: a tiny observer on #login reacts to show/hide instead */
  var mb=(vm.size||vm.n*3*1048576)/1048576;
  if(mb>LV_WARN_MB)lobbyVideoWarn(mb);
  var lv={el:null,url:null,busy:false,gen:0},lg=document.getElementById("login");
  function inGame(){
    if(!lg||!lg.isConnected)lg=document.getElementById("login");
    if(!lg)return false;
    var d=lg.style.display;
    return d?d==="none":getComputedStyle(lg).display==="none"
  }
  function kick(){if(!lv.el)return;var p=lv.el.play();if(p&&p.catch)p.catch(function(){})}
  function destroy(){
    lv.gen++;
    if(lv.el){try{lv.el.pause()}catch(e){}lv.el.removeAttribute("src");try{lv.el.load()}catch(e){}lv.el.remove();lv.el=null}
    if(lv.url){URL.revokeObjectURL(lv.url);lv.url=null}
  }
  async function toBlob(b64){
    try{var r=await fetch("data:application/octet-stream;base64,"+b64);return await r.blob()}
    catch(e){var bin=atob(b64),arr=new Uint8Array(bin.length);for(var i=0;i<bin.length;i++)arr[i]=bin.charCodeAt(i);return new Blob([arr])}
  }
  async function build(){
    if(lv.busy||lv.el)return;
    lv.busy=true;var gen=++lv.gen;
    try{
      var parts=[];
      for(var i=0;i<vm.n;i++){
        var k="menuVideoC"+i,d=await u([k]);
        if(gen!==lv.gen)return;                     /* game started / rebuilt while we were decoding */
        parts.push(await toBlob(d[k]||""));d=null
      }
      if(gen!==lv.gen||inGame())return;
      lv.url=URL.createObjectURL(new Blob(parts,{type:vm.type||"video/mp4"}));parts=null;
      var vv=document.createElement("video");lv.el=vv;vv.id="lwk-menu-video-bg";vv.muted=true;vv.defaultMuted=true;vv.loop=true;vv.autoplay=true;vv.playsInline=true;vv.setAttribute("muted","");vv.setAttribute("playsinline","");vv.src=lv.url;
      vv.style.cssText="position:fixed;inset:0;width:100%;height:100%;object-fit:cover;border:0;z-index:-1;pointer-events:none;background:#000";
      vv.style.opacity=typeof th.bgOpacity==="number"?th.bgOpacity:1;vv.style.filter="blur("+(th.bgBlur||0)+"px) brightness("+(th.bgBright||100)+"%)";
      document.documentElement.insertBefore(vv,document.documentElement.firstChild);
      document.body.style.background="none";
      vv.addEventListener("loadeddata",kick);kick();
    }catch(e){}finally{lv.busy=false}
  }
  function sync(){
    if(inGame()){if(lv.el||lv.busy)destroy();return}
    if(document.hidden){if(lv.el&&!lv.el.paused)lv.el.pause();return}
    if(!lv.el)build();else if(lv.el.paused)kick()
  }
  document.addEventListener("click",kick,{once:true});document.addEventListener("keydown",kick,{once:true});
  document.addEventListener("visibilitychange",sync);
  if(lg&&window.MutationObserver)new MutationObserver(sync).observe(lg,{attributes:true,attributeFilter:["style","class"]});
  else setInterval(sync,1500);
  sync()
}
function lobbyVideoWarn(mb){
  try{
    console.warn("[LowKey.io] Lobby video is "+mb.toFixed(1)+" MB. It is kept in RAM while you are in the lobby - use a clip under "+LV_WARN_MB+" MB for lower memory use.");
    var w=document.createElement("div");w.id="lwk-vid-warn";
    w.style.cssText="position:fixed;left:14px;bottom:14px;z-index:2147483000;max-width:320px;padding:10px 32px 10px 12px;border-radius:12px;background:rgba(20,16,10,.94);border:1px solid rgba(230,197,142,.45);color:#efe6d3;font:600 12px/1.4 'Segoe UI',Arial,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.5)";
    w.textContent="Lobby video is "+mb.toFixed(0)+" MB - it is held in RAM while you are in the lobby (freed when a game starts). A clip under "+LV_WARN_MB+" MB uses far less memory.";
    var x=document.createElement("span");x.textContent="\u00d7";x.style.cssText="position:absolute;right:11px;top:6px;cursor:pointer;font-size:16px";x.onclick=function(){w.remove()};w.appendChild(x);
    document.body.appendChild(w);setTimeout(function(){if(w.parentNode)w.remove()},15000)
  }catch(e){}
}
async function applyMenuMedia(){
  try{
    var mode=o.menuBgMode||"image";
    document.body.style.backgroundImage="none";
    var old=document.getElementById("lwk-menu-video-bg"); if(old) old.remove();
    if(mode==="video"){
      var th=o.lowkeyTheme||{};
      var vm=(await u(["menuVideoMeta"])).menuVideoMeta;
      if(vm&&vm.n){
        startLobbyVideo(vm,th);
      } else {
        document.body.style.backgroundImage=o.menuimg?"url("+o.menuimg+")":"url(https://lwkmod.local/bdemo.webp)";
        document.body.style.backgroundSize="cover";document.body.style.backgroundRepeat="no-repeat";
      }
    } else {
      document.body.style.backgroundImage=o.menuimg?"url("+o.menuimg+")":"url(https://lwkmod.local/bdemo.webp)";
      document.body.style.backgroundSize=(o.lowkeyTheme&&o.lowkeyTheme.bgFit)||"cover"; document.body.style.backgroundRepeat="no-repeat"; document.body.style.backgroundPosition="center";
    }
  }catch(e){document.body.style.backgroundImage=o.menuimg?"url("+o.menuimg+")":"url(https://lwkmod.local/bdemo.webp)";document.body.style.backgroundSize="cover";document.body.style.backgroundRepeat="no-repeat";}
}
await applyMenuMedia();c();
chrome.runtime.onMessage.addListener(function(e,t,r){switch(e.greeting){case"playsrv":postMessage({playsrv:e.playsrv},"*");break;case"rsvars":postMessage({rsvars:e.rsvars},"*");break;case"utag":postMessage({utag:e.utag},"*");break;default:}});var a=Object.create(null);window.addEventListener("message",function(e){var t=e&&e.data;if(!t||!t.ntlStatusResp)return;var r=a[t.ntlStatusResp.id];if(!r)return;delete a[t.ntlStatusResp.id];clearTimeout(r.timer);try{r.send({ok:true,status:t.ntlStatusResp.status})}catch(e){}});chrome.runtime.onMessage.addListener(function(e,t,r){if(!e||e.greeting!=="getNtlStatus")return;var n=Math.random().toString(36).slice(2)+Date.now().toString(36);a[n]={send:r,timer:setTimeout(function(){if(!a[n])return;delete a[n];try{r({ok:false,error:"timeout"})}catch(e){}},400)};try{window.postMessage({ntlStatusReq:{id:n}},"*")}catch(e){clearTimeout(a[n].timer);delete a[n];r({ok:false,error:"postMessage failed"});return}return true})};
;(function(){
function send(c){window.postMessage({lwkCfg:{cfg:c||{}}},"*")}
function sendTheme(t){window.postMessage({lwkTheme:{theme:t||{}}},"*")}
function pull(){
  try{chrome.storage.local.get(["lwk_cfg","lowkeyTheme"],function(r){
    send(r&&r.lwk_cfg);sendTheme(r&&r.lowkeyTheme);
    if(r&&r.lowkeyTheme) applyLobbyTheme(r.lowkeyTheme);
  })}catch(e){}
}
function applyLobbyTheme(t){
  try{
    var root=document.documentElement;
    var accent=(t.accent&&t.accent!=="#ff4fa3")?t.accent:"#e6c58e", secondary=(t.secondary&&t.secondary!=="#ff86c1")?t.secondary:"#fff0b0";
    root.style.setProperty("--lwk-accent",accent);
    root.style.setProperty("--lwk-accent2",secondary);
    var old=document.getElementById("lwk-lobby-theme");if(old)old.remove();
    var st=document.createElement("style");st.id="lwk-lobby-theme";
    st.textContent=":root{--lwk-accent:"+accent+";--lwk-accent2:"+secondary+"}"+
      "body:after{content:'';position:fixed;inset:0;pointer-events:none;z-index:2147483000;border:1px solid "+accent+";opacity:.06}";
    (document.head||document.documentElement).appendChild(st);
  }catch(e){}
}
window.addEventListener("message",function(e){if(e.source===window&&e.data&&e.data.lwkReq)pull()});
try{chrome.storage.onChanged.addListener(function(c,a){
  if(a!=="local")return;
  if(c.lwk_cfg)send(c.lwk_cfg.newValue);
  if(c.lowkeyTheme){sendTheme(c.lowkeyTheme.newValue);applyLobbyTheme(c.lowkeyTheme.newValue)}
})}catch(e){}
pull();
})();
