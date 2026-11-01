
(function(){
 var $=function(i){return document.getElementById(i)},p=function(n){return(n<10?'0':'')+n};
 var hm=function(d){return p(d.getHours())+':'+p(d.getMinutes())};
 function tick(){
  if(!$('en-hora'))return;
  var now=new Date();now.setSeconds(0,0);
  var at=function(m){return new Date(now.getTime()+m*60000)};
  $('en-hora').textContent=hm(now);
  $('en-fecha').textContent=now.toLocaleDateString('es',{weekday:'long',day:'numeric',month:'long'}).replace(',','');
  $('en-r1').textContent=hm(at(-80));$('en-r2').textContent=hm(at(-20));$('en-r3').textContent=hm(at(10));
  $('en-av').textContent='Empieza en 10 minutos \u00b7 '+hm(at(10));
 }
 var ios=/iphone|ipad|ipod/i.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 var st=window.navigator.standalone===true||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches);
 if(ios&&!st)$('en-ios').hidden=false;
 tick();setInterval(tick,20000);
})();
