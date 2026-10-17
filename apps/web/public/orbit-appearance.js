(function(){
 var theme='system',reduceMotion=false;
 try{var saved=JSON.parse(localStorage.getItem('orbit-appearance-v1')||'null');if(saved&&['light','dark','system'].indexOf(saved.theme)!==-1)theme=saved.theme;reduceMotion=!!(saved&&saved.reduceMotion);}catch(e){}
 document.documentElement.dataset.theme=theme==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme;
 document.documentElement.dataset.motion=reduceMotion||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'paused':'on';
})();
