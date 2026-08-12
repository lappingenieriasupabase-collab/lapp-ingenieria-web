document.body.classList.remove('no-js');
(function(){ const y = document.getElementById('year'); if(y) y.textContent = new Date().getFullYear(); })();
/* habilita :active en iOS Safari (por defecto lo ignora en enlaces sin listener de touch),
   necesario para el efecto de "presionado" de las tarjetas */
document.addEventListener('touchstart', function(){}, {passive:true});

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_GSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

/* ---------- ticker ---------- */
(function(){
  const row = document.getElementById('tickerRow');
  if(!row) return;
  const custom = row.getAttribute('data-items');
  const items = custom ? custom.split('|') : ['Obra civil','Obra eléctrica','Infraestructura datacenter','Metalmecánica','Subestaciones','Piso técnico','Pasillos fríos','Interventoría','Barreras acústicas','Remodelaciones'];
  const html = items.map(t=>'<span>'+t+'</span>').join('');
  row.innerHTML = html + html;
})();

/* ---------- nav ---------- */
(function(){
  const nav = document.getElementById('nav');
  const menu = document.getElementById('menu');
  const burger = document.getElementById('burger');
  const progress = document.getElementById('progress');
  if(!nav || !menu || !burger || !progress) return;
  let last = 0;
  function onScroll(){
    const y = window.scrollY;
    const h = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.width = (h>0 ? (y/h)*100 : 0) + '%';
    nav.classList.toggle('is-solid', y > window.innerHeight * 0.86);
    if(!menu.classList.contains('is-open')){
      nav.classList.toggle('is-hidden', y > last && y > 420);
    }
    last = y;
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();

  burger.addEventListener('click', ()=>{
    const open = menu.classList.toggle('is-open');
    burger.setAttribute('aria-expanded', open);
    document.body.style.overflow = open ? 'hidden' : '';
    nav.classList.toggle('is-solid', !open && window.scrollY > window.innerHeight*.86);
  });
  menu.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
    menu.classList.remove('is-open');
    burger.setAttribute('aria-expanded','false');
    document.body.style.overflow='';
  }));
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape' && menu.classList.contains('is-open')) burger.click();
  });

  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', e=>{
      const id = a.getAttribute('href');
      if(id.length < 2) return;
      const el = document.querySelector(id);
      if(!el) return;
      e.preventDefault();
      window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY - 10, behavior: REDUCED ? 'auto' : 'smooth'});
    });
  });
})();

/* ---------- carrusel del hero: medio + frase ----------
   Cada diapositiva (vídeo o imagen) va emparejada con su frase. El vídeo manda:
   se pasa a la siguiente cuando TERMINA de reproducirse, no con un cronómetro
   fijo; las imágenes se sostienen los milisegundos de su data-hold.
   Las frases se desplazan dentro de ranuras recortadas, escalonadas, para que
   el cambio se lea como un pase de diapositiva y no como un simple fundido.
   Se pausa si la pestaña pasa a segundo plano o si el hero sale de pantalla. */
(function(){
  const media = document.getElementById('heroMedia');
  const rot = document.getElementById('heroRotator');
  if(!HAS_GSAP || REDUCED) return;

  const slides = media ? [...media.querySelectorAll('.hero__slide')] : [];
  const phrases = rot ? [...rot.querySelectorAll('.hero__phrase')] : [];
  const steps = Math.max(slides.length, phrases.length);
  if(steps < 2) return;

  const linesOf = p => p.querySelectorAll('.hero__tx');
  const vidOf = s => s && s.querySelector('video');
  let i = 0, timer = null, preTimer = null, busy = false, paused = false;

  /* Sólo en móvil: no tocamos el comportamiento de escritorio.
     Ahí sobra memoria para tener dos vídeos 1080p cargando a la vez, pero en
     el navegador embebido de apps como WhatsApp (mucha menos memoria que un
     navegador normal) precargar el segundo vídeo desde el segundo cero —
     mientras el primero ya está decodificando— puede tirar la pestaña justo
     cuando el segundo empieza a reproducirse. En móvil se retrasa la
     precarga a los últimos ~2.5s del vídeo actual, para que nunca haya dos
     vídeos pesados descargándose/decodificando al mismo tiempo. */
  const isMobile = window.matchMedia('(max-width: 820px)').matches;

  /* a partir de aquí el desplazamiento lo controla GSAP, no el CSS */
  if(rot){
    rot.classList.add('is-live');
    phrases.forEach((p, idx) => { if(idx !== 0) gsap.set(linesOf(p), {yPercent:115}); });
  }

  const clearTimer = () => { if(timer){ clearTimeout(timer); timer = null; } if(preTimer){ clearTimeout(preTimer); preTimer = null; } };

  function schedule(){
    clearTimer();
    if(paused) return;
    const s = slides[i], v = vidOf(s);
    if(v){
      /* red de seguridad por si 'ended' no llega (error de red, autoplay bloqueado) */
      const dur = (v.duration && isFinite(v.duration)) ? v.duration * 1000 : 10000;
      timer = setTimeout(advance, dur + 1500);
      if(isMobile) preTimer = setTimeout(() => preload(i), Math.max(0, dur - 2500));
    } else {
      timer = setTimeout(advance, parseInt((s && s.dataset.hold) || '6500', 10));
    }
  }

  function preload(idx){
    const nv = vidOf(slides[(idx + 1) % steps]);
    if(nv && nv.preload === 'none') nv.preload = 'auto';
  }

  function play(idx){
    const v = vidOf(slides[idx]);
    if(v){
      try { v.currentTime = 0; } catch(e){}
      const pr = v.play(); if(pr && pr.catch) pr.catch(()=>{});
    }
    /* en escritorio, igual que siempre: precarga inmediata para que el corte
       no se note. En móvil lo hace schedule(), retrasado, ver arriba. */
    if(!isMobile) preload(idx);
  }

  function advance(){
    if(busy || paused) return;
    busy = true;
    const ni = (i + 1) % steps;

    if(slides.length){
      const cur = slides[i], nxt = slides[ni];
      nxt.classList.add('is-on');
      play(ni);
      gsap.fromTo(nxt, {opacity:0}, {opacity:1, duration:1.1, ease:'power2.inOut'});
      gsap.to(cur, {opacity:0, duration:1.1, ease:'power2.inOut', onComplete(){
        cur.classList.remove('is-on');
        const cv = vidOf(cur); if(cv) cv.pause();
        gsap.set(cur, {clearProps:'opacity'});
      }});
    }

    if(phrases.length){
      const cp = phrases[i], np = phrases[ni];
      gsap.to(linesOf(cp), {yPercent:-115, duration:.8, ease:'power3.inOut', stagger:.075});
      np.classList.add('is-on');
      gsap.fromTo(linesOf(np), {yPercent:115},
        {yPercent:0, duration:.9, ease:'power3.out', stagger:.075,
         onStart(){ cp.classList.remove('is-on'); }});
    }

    i = ni;
    setTimeout(()=>{ busy = false; }, 1200);
    schedule();
  }

  /* el final del vídeo es lo que dispara el cambio */
  slides.forEach((s, idx) => {
    const v = vidOf(s);
    if(!v) return;
    v.removeAttribute('loop');
    v.addEventListener('ended', () => { if(idx === i) advance(); });
  });

  function setPaused(p){
    if(paused === p) return;
    paused = p;
    const v = vidOf(slides[i]);
    if(p){ clearTimer(); if(v) v.pause(); }
    else { if(v){ const pr = v.play(); if(pr && pr.catch) pr.catch(()=>{}); } schedule(); }
  }

  document.addEventListener('visibilitychange', () => setPaused(document.hidden));
  /* no gastar CPU reproduciendo el hero cuando ya no se ve */
  const heroEl = document.querySelector('.hero');
  if(heroEl && 'IntersectionObserver' in window){
    new IntersectionObserver(es => setPaused(!es[0].isIntersecting || document.hidden),
      {threshold:0}).observe(heroEl);
  }

  play(0);
  schedule();
})();

/* ---------- vídeos: reproducir sólo en pantalla ---------- */
(function(){
  const vids = [...document.querySelectorAll('.js-inview')];
  if(!vids.length) return;
  if(!('IntersectionObserver' in window)){ vids.forEach(v=>{v.setAttribute('autoplay','');v.play&&v.play().catch(()=>{});}); return; }
  const io = new IntersectionObserver(entries=>{
    entries.forEach(en=>{
      const v = en.target;
      if(en.isIntersecting){ if(v.preload==='none') v.preload='auto'; v.play && v.play().catch(()=>{}); }
      else { v.pause && v.pause(); }
    });
  }, {rootMargin:'120px 0px', threshold:.15});
  vids.forEach(v=>io.observe(v));
})();

/* ---------- formulario -> mailto ---------- */
(function(){
  const form = document.getElementById('quoteForm');
  const note = document.getElementById('formNote');
  if(!form) return;
  form.addEventListener('submit', e=>{
    e.preventDefault();
    const d = new FormData(form);
    const nombre = (d.get('nombre')||'').toString().trim();
    const correo = (d.get('correo')||'').toString().trim();
    if(!nombre || !correo){
      if(note){ note.textContent = 'Falta el nombre o el correo. Complete los dos campos para poder responderle.'; note.style.color = '#0893D4'; }
      return;
    }
    const body = ['Nombre: '+nombre,'Correo: '+correo,'Teléfono: '+(d.get('telefono')||'—'),'','Proyecto:',(d.get('mensaje')||'—')].join('\n');
    window.location.href = 'mailto:la.gerencia@lappingenieria.com?subject=' + encodeURIComponent('Solicitud de presupuesto — '+nombre) + '&body=' + encodeURIComponent(body);
    if(note){ note.textContent = 'Abrimos su cliente de correo con el mensaje listo. Revise que se haya enviado.'; note.style.color = 'rgba(255,255,255,.42)'; }
  });
})();


/* ============================================================
   GSAP + SCROLLTRIGGER
   ============================================================ */
if(HAS_GSAP && !REDUCED){
  gsap.registerPlugin(ScrollTrigger);

  /* --- entrada del hero --- */
  /* clearProps borra los estilos inline que deja GSAP al terminar: un transform u opacity
     residual en un ancestro convierte al elemento en "backdrop root" y deja sin efecto el
     backdrop-filter de los paneles de vidrio (.lg) que lleva dentro. */
  const HERO_GLASS = !!document.querySelector('.hero .lg');
  const intro = gsap.timeline({delay:.15});
  /* el zoom y el parallax se aplican al contenedor de medios, no a cada vídeo o
     imagen: así no chocan con el escalado base del CSS ni con la deriva lenta
     de las diapositivas fijas */
  intro.fromTo('.hero__media', {scale:1.07}, {scale:1, duration:2.6, ease:'power2.out'}, 0)
       .from('.hero__line', {opacity:0, y:24, duration:1, ease:'power3.out', clearProps:'transform,opacity'}, .3)
       .from('.hero__eyebrow, .hero__badge', {opacity:0, y:18, duration:.9, ease:'power3.out', clearProps:'transform,opacity'}, .2)
       .from('.hero__sub, .hero__acts > *', {opacity:0, y:26, duration:.9, ease:'power3.out', stagger:.08, clearProps:'transform,opacity'}, .85)
       .from('.hero__cue', {opacity:0, duration:.9, ease:'power2.out'}, 1.2)
       .from('.hero .gridplane', {opacity:0, duration:1.6, ease:'power2.out'}, .4);

  /* --- parallax del hero al hacer scroll --- */
  gsap.to('.hero__media', {
    yPercent:14, ease:'none',
    scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}
  });
  /* el parallax del bloque de texto se omite si el hero usa vidrio: animar su opacidad
     y su transform anularía la refracción de los paneles .lg que contiene */
  if(!HERO_GLASS){
    gsap.to('.hero__in', {
      yPercent:-24, opacity:.25, ease:'none',
      scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}
    });
  }
  gsap.to('.hero .gridplane i', {
    backgroundPositionY:'190px', ease:'none',
    scrollTrigger:{trigger:'.hero', start:'top top', end:'bottom top', scrub:true}
  });

  /* --- revelados genéricos --- */
  gsap.utils.toArray('.rv').forEach(el=>{
    gsap.to(el, {
      opacity:1, y:0, duration:1.05, ease:'power3.out',
      scrollTrigger:{trigger:el, start:'top 88%', once:true}
    });
  });

  /* --- contadores --- */
  gsap.utils.toArray('.count').forEach(el=>{
    const to = parseFloat(el.dataset.to);
    const obj = {v:0};
    ScrollTrigger.create({
      trigger:el, start:'top 92%', once:true,
      onEnter:()=>gsap.to(obj,{v:to, duration:1.9, ease:'power2.out', onUpdate:()=>{el.textContent = Math.round(obj.v);}})
    });
  });

  /* --- manifiesto: revelado palabra por palabra --- */
  (function(){
    const t = document.getElementById('manifestText');
    if(!t) return;
    const words = t.textContent.trim().split(/\s+/);
    t.innerHTML = words.map(w=>'<span>'+w+'</span>').join(' ');
    gsap.fromTo(t.querySelectorAll('span'),
      {color:'#D3D8DC'},
      {color:'#0B0D0F', ease:'none', stagger:.6,
       scrollTrigger:{trigger:t, start:'top 78%', end:'bottom 58%', scrub:.6}}
    );
  })();

  /* --- QUIÉNES SOMOS: la imagen se abre a pantalla completa (pin) --- */
  (function(){
    const frame = document.getElementById('somosFrame');
    if(!frame) return;
    const img = frame.querySelector('img');
    gsap.timeline({
      scrollTrigger:{
        trigger:'#somosStage', start:'top top',
        end:()=> '+=' + (window.innerHeight * (window.innerWidth < 760 ? 1.05 : 1.6)),
        scrub:.7, pin:true, anticipatePin:1, invalidateOnRefresh:true
      }
    })
    .to(frame, {width:'100vw', height:'100svh', borderRadius:0, boxShadow:'0 0 0 rgba(0,0,0,0)', ease:'power2.inOut'}, 0)
    .fromTo(img, {scale:1.28}, {scale:1, ease:'power2.inOut'}, 0)
    .to('#somosShade', {opacity:1, ease:'power1.in'}, .35)
    .fromTo('#somosCap', {opacity:0, y:36}, {opacity:1, y:0, ease:'power2.out'}, .55);
  })();

  /* --- frentes: la imagen se abre y hace parallax --- */
  gsap.utils.toArray('.front').forEach(front=>{
    const box = front.querySelector('.front__img');
    const media = box.querySelector('img, video');
    gsap.fromTo(box,
      {clipPath:'inset(12% 6% 12% 6% round 3px)'},
      {clipPath:'inset(0% 0% 0% 0% round 3px)', ease:'power2.out',
       scrollTrigger:{trigger:front, start:'top 88%', end:'top 34%', scrub:.7}}
    );
    gsap.fromTo(media, {yPercent:-9, scale:1.18}, {
      yPercent:9, scale:1.06, ease:'none',
      scrollTrigger:{trigger:front, start:'top bottom', end:'bottom top', scrub:.7}
    });
  });

  /* --- capacidades: aparición escalonada --- */
  gsap.from('#capsList .capcard, #capsList .cap', {
    opacity:0, y:26, duration:.8, ease:'power3.out', stagger:{each:.045, from:'start'},
    scrollTrigger:{trigger:'#capsList', start:'top 84%', once:true}, clearProps:'transform,opacity'
  });

  /* --- MEDIA EXPANSIVA: el vídeo se abre a todo el ancho --- */
  (function(){
    const frame = document.getElementById('expandFrame');
    const vid = document.getElementById('obraVideo');
    if(!frame) return;
    const section = frame.closest('section');
    const sectionSel = section && section.id ? '#'+section.id : frame;
    gsap.fromTo(frame,
      {clipPath:'inset(0% 16% 0% 16% round 4px)'},
      {clipPath:'inset(0% 0% 0% 0% round 0px)', ease:'none',
       scrollTrigger:{trigger:sectionSel, start:'top 82%', end:'top 8%', scrub:.8}}
    );
    if(vid){
      gsap.fromTo(vid, {scale:1.24, yPercent:-6}, {
        scale:1, yPercent:6, ease:'none',
        scrollTrigger:{trigger:sectionSel, start:'top bottom', end:'bottom top', scrub:.8}
      });
    }
    gsap.from(frame.parentElement.querySelectorAll('.expand__cap > *'), {
      opacity:0, y:34, duration:1, ease:'power3.out', stagger:.12,
      scrollTrigger:{trigger:sectionSel, start:'top 45%', once:true}
    });
  })();

  /* --- PROYECTOS: scroll horizontal con pin --- */
  (function(){
    const track = document.getElementById('pjTrack');
    if(!track) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px)', ()=>{
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth + 40);
      const tw = gsap.to(track, {
        x: () => -dist(), ease:'none',
        scrollTrigger:{
          trigger:'#proyectos', start:'top top', end:()=> '+=' + dist(),
          scrub:.8, pin:true, anticipatePin:1, invalidateOnRefresh:true
        }
      });
      return ()=>{ tw.scrollTrigger && tw.scrollTrigger.kill(); tw.kill(); gsap.set(track,{x:0}); };
    });
  })();

  /* --- tarjetas del índice de proyectos --- */
  gsap.from('.idx-card', {
    opacity:0, y:28, duration:.7, ease:'power3.out', stagger:.05,
    scrollTrigger:{trigger:'#projectsList', start:'top 86%', once:true}
  });

  /* --- render de edificación: parallax + apertura --- */
  (function(){
    const wrapEl = document.getElementById('aboutMedia');
    if(!wrapEl) return;
    gsap.fromTo(wrapEl,
      {clipPath:'inset(0% 22% 0% 22% round 3px)'},
      {clipPath:'inset(0% 0% 0% 0% round 0px)', ease:'none',
       scrollTrigger:{trigger:wrapEl, start:'top 92%', end:'top 22%', scrub:.8}}
    );
    gsap.fromTo(wrapEl.querySelector('img'), {yPercent:-10, scale:1.24}, {
      yPercent:10, scale:1.06, ease:'none',
      scrollTrigger:{trigger:wrapEl, start:'top bottom', end:'bottom top', scrub:.8}
    });
  })();

  /* --- retículas en fuga de las secciones oscuras --- */
  gsap.utils.toArray('.caps .gridplane i, .contact .gridplane i, .foot .gridplane i').forEach(g=>{
    gsap.fromTo(g, {backgroundPositionY:'0px'}, {
      backgroundPositionY:'240px', ease:'none',
      scrollTrigger:{trigger:g.closest('section, footer'), start:'top bottom', end:'bottom top', scrub:true}
    });
  });

  /* --- servicios: galería filtrada con parallax --- */
  (function(){
    const lista = document.getElementById('svcList');
    if(!lista) return;
    const items = [...lista.querySelectorAll('.svcx__item')];
    const filtros = document.getElementById('svcFilters');
    const vacio = document.getElementById('svcEmpty');

    /* parallax: la imagen es más alta que su marco y ese excedente es el
       recorrido. Se guarda el disparador de cada una para poder rehacerlos
       cuando el filtro cambia la altura de la página. */
    const capas = [];
    items.forEach(it => {
      const img = it.querySelector('.svcx__media img');
      if(!img) return;
      capas.push(gsap.fromTo(img, {yPercent:-9}, {
        yPercent:9, ease:'none',
        scrollTrigger:{trigger:it, start:'top bottom', end:'bottom top', scrub:.8, invalidateOnRefresh:true}
      }));
    });

    /* entrada escalonada: primero la imagen, luego el texto */
    items.forEach(it => {
      const media = it.querySelector('.svcx__media');
      const cuerpo = it.querySelector('.svcx__body');
      const tl = gsap.timeline({scrollTrigger:{trigger:it, start:'top 80%', once:true}});
      if(media) tl.fromTo(media, {opacity:0, y:46, clipPath:'inset(12% 0% 12% 0%)'},
        {opacity:1, y:0, clipPath:'inset(0% 0% 0% 0%)', duration:1.05, ease:'power3.out'}, 0);
      if(cuerpo) tl.fromTo(cuerpo.children, {opacity:0, y:26},
        {opacity:1, y:0, duration:.8, ease:'power3.out', stagger:.08}, .18);
    });

    /* filtrado */
    if(filtros){
      filtros.addEventListener('click', e => {
        const btn = e.target.closest('button[data-cat]');
        if(!btn) return;
        const cat = btn.dataset.cat;

        [...filtros.querySelectorAll('button')].forEach(b => {
          const on = b === btn;
          b.classList.toggle('is-on', on);
          b.setAttribute('aria-pressed', String(on));
        });

        let visibles = 0;
        items.forEach(it => {
          const mostrar = cat === 'all' || it.dataset.cat === cat;
          it.classList.toggle('is-off', !mostrar);
          if(mostrar){
            visibles++;
            gsap.fromTo(it, {opacity:0, y:18}, {opacity:1, y:0, duration:.5, ease:'power2.out', overwrite:true});
          }
        });
        if(vacio) vacio.classList.toggle('is-on', visibles === 0);

        /* al ocultar filas cambia la altura del documento: sin esto los
           disparadores de parallax quedarían midiendo posiciones viejas */
        ScrollTrigger.refresh();
      });
    }
  })();

  /* --- clientes: marquesina infinita que responde al scroll --- */
  (function(){
    const row = document.getElementById('cliRow');
    if(!row) return;
    const marquee = row.parentElement;

    /* se clona el contenido hasta cubrir dos veces el ancho visible: así el
       bucle nunca deja un hueco, sin importar cuántos logos haya */
    const base = [...row.children];
    const anchoBase = () => base.reduce((s, el) => s + el.getBoundingClientRect().width, 0);
    let objetivo = Math.max(window.innerWidth * 2, anchoBase() * 2);
    let guarda = 0;
    while(row.getBoundingClientRect().width < objetivo && guarda++ < 40){
      base.forEach(el => row.appendChild(el.cloneNode(true)));
    }

    /* la mitad de la pista: al recorrerla, el contenido clonado ya ocupa
       exactamente el mismo sitio y el salto es invisible */
    const mitad = () => row.scrollWidth / 2;
    const loop = gsap.to(row, {
      x: () => -mitad(), duration: 34, ease:'none', repeat:-1,
      modifiers:{ x: gsap.utils.unitize(x => parseFloat(x) % mitad()) }
    });

    /* al hacer scroll se acelera, y al subir cambia de sentido: el bloque deja
       de sentirse como un GIF y responde a lo que hace el usuario */
    let vuelta = null;
    ScrollTrigger.create({
      trigger: marquee, start:'top bottom', end:'bottom top',
      onUpdate(self){
        const v = gsap.utils.clamp(-6, 6, self.getVelocity() / 260);
        const objetivo = self.direction === -1 ? -1 - Math.abs(v) : 1 + Math.abs(v);
        gsap.to(loop, {timeScale: objetivo, duration:.25, overwrite:true});
        clearTimeout(vuelta);
        vuelta = setTimeout(() => {
          gsap.to(loop, {timeScale: self.direction === -1 ? -1 : 1, duration:.9, ease:'power2.out', overwrite:true});
        }, 180);
      }
    });

    /* leve desfase de las tarjetas: da profundidad sin distraer */
    gsap.utils.toArray('.cli__card').forEach((card, i) => {
      gsap.fromTo(card, {y: i % 2 ? 34 : 54}, {
        y: i % 2 ? -20 : -34, ease:'none',
        scrollTrigger:{trigger:'.cli', start:'top bottom', end:'bottom top', scrub:.9}
      });
    });
  })();

  /* --- marca del footer --- */
  gsap.from('.foot__mark', {
    opacity:0, y:70, duration:1.4, ease:'power3.out',
    scrollTrigger:{trigger:'.foot', start:'top 82%', once:true}
  });

  if(document.fonts && document.fonts.ready){ document.fonts.ready.then(()=>ScrollTrigger.refresh()); }
  window.addEventListener('load', ()=>ScrollTrigger.refresh());
} else {
  /* --- fallback sin GSAP o con movimiento reducido --- */
  document.querySelectorAll('.rv').forEach(el=>{el.style.opacity=1;el.style.transform='none';});
  document.querySelectorAll('.count').forEach(el=>{el.textContent = el.dataset.to;});
  const stage = document.getElementById('somosStage');
  const frame = document.getElementById('somosFrame');
  if(stage && frame){
    stage.style.height='auto';
    stage.style.paddingBlock='clamp(40px,7vw,90px)';
    frame.style.width='100%';
    frame.style.height='min(78svh,760px)';
    frame.style.borderRadius='0';
    frame.style.boxShadow='none';
    const shade = document.getElementById('somosShade'); if(shade) shade.style.opacity='1';
    const cap = document.getElementById('somosCap'); if(cap) cap.style.opacity='1';
  }
  const ef = document.getElementById('expandFrame'); if(ef) ef.style.clipPath='none';
  const track = document.getElementById('pjTrack'); if(track) track.style.overflowX='auto';
}
