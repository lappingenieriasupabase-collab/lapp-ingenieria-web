/* ============================================================
   LAPP INGENIERÍA — BROCHURE
   El scroll vertical desplaza los paneles hacia el lado (pin + scrub).
   El parallax y los revelados internos usan containerAnimation, la función
   de GSAP pensada para elementos dentro de un contenedor horizontal: sin
   ella los disparadores medirían posiciones verticales que aquí no
   significan nada.
   ============================================================ */
document.body.classList.remove('no-js');

const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const HAS_GSAP = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined';

const track  = document.getElementById('track');
const stage  = document.getElementById('stage');
const panels = track ? [...track.querySelectorAll('.panel')] : [];

const hud     = document.getElementById('hud');
const hudBar  = document.getElementById('hudBar');
const hudNow  = document.getElementById('hudNow');
const hudTotal= document.getElementById('hudTotal');
const hudDots = document.getElementById('hudDots');
const hudHint = document.getElementById('hudHint');
const pad2 = n => String(n + 1).padStart(2, '0');

if(hudTotal) hudTotal.textContent = String(panels.length).padStart(2, '0');

/* ---------- índice lateral ---------- */
let goTo = () => {};
if(hudDots){
  panels.forEach((p, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.label = p.dataset.label || ('Panel ' + pad2(i));
    b.setAttribute('aria-label', 'Ir a ' + b.dataset.label);
    b.innerHTML = '<i></i>';
    b.addEventListener('click', () => goTo(i));
    hudDots.appendChild(b);
  });
}
const dots = hudDots ? [...hudDots.children] : [];

let current = -1;
function setActive(i){
  if(i === current) return;
  current = i;
  if(hudNow) hudNow.textContent = pad2(i);
  dots.forEach((d, k) => d.classList.toggle('is-on', k === i));
  const p = panels[i];
  if(hud){
    hud.classList.toggle('on-light', !!(p && p.classList.contains('panel--paper')));
    hud.classList.toggle('on-cover', i === 0);
  }
  if(hudHint) hudHint.style.opacity = i === 0 ? '1' : '0';
}

function countUp(el){
  if(el.dataset.done) return;
  el.dataset.done = '1';
  const obj = {v:0};
  gsap.to(obj, {v: parseFloat(el.dataset.to), duration:2, ease:'power2.out',
    onUpdate(){ el.textContent = Math.round(obj.v); }});
}

/* Compone la entrada de un panel: primero las líneas del titular saliendo de
   su máscara, luego el filete dibujándose y por último el resto del bloque.
   Ese orden es el que hace que se lea como una pieza y no como elementos
   apareciendo sueltos. */
function buildIntro(panel){
  const tl = gsap.timeline({paused:true});
  const lines  = panel.querySelectorAll('.reveal .ln > span');
  const rules  = panel.querySelectorAll('.b-rule');
  const imgs   = panel.querySelectorAll('.reveal-img');
  const items  = panel.querySelectorAll('.rvx');
  const kicker = panel.querySelector('.b-kicker');

  if(kicker) tl.fromTo(kicker, {opacity:0, x:-14}, {opacity:1, x:0, duration:.7, ease:'power2.out'}, 0);
  if(lines.length) tl.to(lines, {yPercent:0, duration:1.05, ease:'expo.out', stagger:.09}, .08);
  if(imgs.length) tl.fromTo(imgs,
      {clipPath:'inset(0% 0% 100% 0%)'},
      {clipPath:'inset(0% 0% 0% 0%)', duration:1.15, ease:'power3.inOut'}, .1)
    .fromTo(imgs.length ? [...imgs].map(f => f.querySelector('img')) : [],
      {scale:1.28}, {scale:1.16, duration:1.4, ease:'power2.out'}, .1);
  if(rules.length) tl.to(rules, {scaleX:1, duration:.9, ease:'power3.inOut'}, .45);
  if(items.length) tl.to(items, {opacity:1, y:0, duration:.85, ease:'power3.out', stagger:.06}, .35);
  tl.add(() => panel.querySelectorAll('.bcount').forEach(countUp), .5);
  return tl;
}

if(!HAS_GSAP){
  document.querySelectorAll('.rvx').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
  document.querySelectorAll('.bcount').forEach(el => { el.textContent = el.dataset.to; });
} else {
  gsap.registerPlugin(ScrollTrigger);
  if(REDUCED) document.body.classList.add('is-static');

  /* estado de partida de los elementos animados */
  gsap.set('.reveal .ln > span', {yPercent:112});
  gsap.set('.b-rule', {scaleX:0});

  const mm = gsap.matchMedia();

  /* ============ ESCRITORIO: recorrido horizontal ============ */
  mm.add('(min-width: 901px) and (prefers-reduced-motion: no-preference)', () => {
    const distance = () => Math.max(0, track.scrollWidth - window.innerWidth);

    const sweep = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: stage, pin: true, scrub: 1, start: 'top top',
        end: () => '+=' + distance(),
        anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate(self){
          if(hudBar) hudBar.style.width = (self.progress * 100).toFixed(2) + '%';
          const x = self.progress * distance() + window.innerWidth / 2;
          let idx = 0;
          for(let i = 0; i < panels.length; i++){
            if(panels[i].offsetLeft <= x) idx = i; else break;
          }
          setActive(idx);
        }
      }
    });

    goTo = (i) => {
      const st = sweep.scrollTrigger;
      if(!st || !panels[i]) return;
      window.scrollTo({top: st.start + panels[i].offsetLeft, behavior:'smooth'});
    };

    /* parallax de las capas de fondo */
    const layers = gsap.utils.toArray('[data-speed]');
    layers.forEach(el => {
      const s = parseFloat(el.dataset.speed) || 0;
      gsap.fromTo(el, {xPercent: s}, {
        xPercent: -s, ease:'none',
        scrollTrigger:{
          trigger: el.closest('.panel'), containerAnimation: sweep,
          start:'left right', end:'right left', scrub:true, invalidateOnRefresh:true
        }
      });
    });

    /* entrada compuesta por panel */
    const triggers = [];
    panels.forEach((p, i) => {
      const tl = buildIntro(p);
      if(i === 0){ tl.delay(.25).play(); return; }
      triggers.push(ScrollTrigger.create({
        trigger: p, containerAnimation: sweep,
        start: 'left 72%', once: true, onEnter: () => tl.play()
      }));
    });

    setActive(0);

    const onKey = (e) => {
      if(e.key === 'ArrowRight' || e.key === 'PageDown'){ e.preventDefault(); goTo(Math.min(current + 1, panels.length - 1)); }
      else if(e.key === 'ArrowLeft' || e.key === 'PageUp'){ e.preventDefault(); goTo(Math.max(current - 1, 0)); }
      else if(e.key === 'Home'){ e.preventDefault(); goTo(0); }
      else if(e.key === 'End'){ e.preventDefault(); goTo(panels.length - 1); }
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      triggers.forEach(t => t.kill());
      gsap.set(track, {x:0});
      goTo = () => {};
    };
  });

  /* ============ VERTICAL: móvil y movimiento reducido ============ */
  mm.add('(max-width: 900px), (prefers-reduced-motion: reduce)', () => {
    document.body.classList.add('is-static');

    const triggers = panels.map((p, i) => {
      const tl = buildIntro(p);
      if(i === 0){ tl.delay(.2).play(); return null; }
      return ScrollTrigger.create({trigger:p, start:'top 78%', once:true, onEnter:() => tl.play()});
    }).filter(Boolean);

    const onScroll = () => {
      const h = document.documentElement.scrollHeight - window.innerHeight;
      if(hudBar) hudBar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0).toFixed(2) + '%';
      const mid = window.innerHeight / 2;
      let idx = 0;
      panels.forEach((p, i) => { if(p.getBoundingClientRect().top <= mid) idx = i; });
      setActive(idx);
    };
    window.addEventListener('scroll', onScroll, {passive:true});
    onScroll();

    goTo = (i) => panels[i] && panels[i].scrollIntoView({behavior:'smooth', block:'start'});

    return () => {
      window.removeEventListener('scroll', onScroll);
      triggers.forEach(t => t.kill());
      document.body.classList.remove('is-static');
      goTo = () => {};
    };
  });

  if(document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh());
}
