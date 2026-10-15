(function(){
 var theme='dark';
 try{var saved=JSON.parse(localStorage.getItem('orbit-appearance-v1')||'null');if(saved&&(saved.theme==='light'||saved.theme==='dark'))theme=saved.theme;}catch(e){}
 document.documentElement.dataset.theme=theme;
 document.documentElement.dataset.motion=window.matchMedia('(prefers-reduced-motion: reduce)').matches?'paused':'on';
})();
