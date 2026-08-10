/* ============================================================
   LAPP INGENIERÍA — CONTACTO Y ASISTENTE DE WHATSAPP

   Un único compositor de mensaje alimenta las dos vías:
     · el formulario (con vista previa que se arma mientras se escribe)
     · el asistente conversacional del botón flotante
   Así el cliente siempre envía el mismo mensaje cordial, escriba donde
   escriba, y el texto sólo se mantiene en un sitio.
   ============================================================ */
(function(){
'use strict';

const WA_NUMBER = '573108064136';           // celular de LAPP
const MAIL_TO   = 'la.gerencia@lappingenieria.com';
const TIPOS = ['Obra civil','Obra eléctrica','Infraestructura datacenter','Metalmecánica','Remodelación','Mantenimiento','Otro'];

/* ---------- compositor: el corazón de todo ---------- */
function buildMessage(d){
  const nombre = (d.nombre || '').trim();
  const tipo   = (d.tipo   || '').trim();
  const ciudad = (d.ciudad || '').trim();
  const tel    = (d.telefono || '').trim();
  const correo = (d.correo || '').trim();
  const desc   = (d.mensaje || '').trim();

  const L = [];
  L.push('Hola LAPP Ingeniería, buen día.');
  L.push('');
  L.push(nombre ? `Mi nombre es ${nombre}.` : 'Quisiera solicitar información.');

  let linea = '';
  if(tipo && ciudad)      linea = `Estoy interesado en ${tipo.toLowerCase()} en ${ciudad}.`;
  else if(tipo)           linea = `Estoy interesado en ${tipo.toLowerCase()}.`;
  else if(ciudad)         linea = `El proyecto sería en ${ciudad}.`;
  if(linea) L.push(linea);

  if(desc){ L.push(''); L.push(desc); }

  const datos = [];
  if(tel)    datos.push(`Teléfono: ${tel}`);
  if(correo) datos.push(`Correo: ${correo}`);
  if(datos.length){ L.push(''); L.push('Mis datos de contacto:'); datos.forEach(x => L.push(x)); }

  L.push('');
  L.push('Quedo atento a su respuesta. Muchas gracias.');
  return L.join('\n');
}

const waLink   = msg => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
const mailLink = (msg, nombre) =>
  `mailto:${MAIL_TO}?subject=${encodeURIComponent('Solicitud de información' + (nombre ? ' — ' + nombre : ''))}&body=${encodeURIComponent(msg)}`;

/* ============================================================
   1 · FORMULARIO con vista previa en vivo
   ============================================================ */
(function initForm(){
  const form = document.getElementById('quoteForm');
  if(!form) return;

  const preview = document.getElementById('msgPreview');
  const note    = document.getElementById('formNote');
  const chipBox = document.getElementById('fTipo');
  const tipoIn  = form.querySelector('[name="tipo"]');

  /* fichas de tipo de proyecto */
  if(chipBox){
    TIPOS.forEach(t => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = t;
      b.addEventListener('click', () => {
        const on = b.classList.contains('is-on');
        [...chipBox.children].forEach(c => c.classList.remove('is-on'));
        if(!on) b.classList.add('is-on');
        if(tipoIn) tipoIn.value = on ? '' : t;
        render();
      });
      chipBox.appendChild(b);
    });
  }

  const read = () => {
    const d = {};
    new FormData(form).forEach((v, k) => { d[k] = v; });
    return d;
  };

  function render(){
    if(preview) preview.textContent = buildMessage(read());
  }

  form.addEventListener('input', render);
  render();

  function validar(d){
    if(!(d.nombre || '').trim()) return 'Falta su nombre para poder saludarlo por su nombre.';
    if(!(d.telefono || '').trim() && !(d.correo || '').trim())
      return 'Déjenos un teléfono o un correo para poder responderle.';
    return null;
  }

  function aviso(txt, warn){
    if(!note) return;
    note.textContent = txt;
    note.classList.toggle('is-warn', !!warn);
  }
  const NOTA = note ? note.textContent : '';

  form.addEventListener('submit', e => e.preventDefault());

  const btnWa = document.getElementById('sendWa');
  if(btnWa) btnWa.addEventListener('click', () => {
    const d = read(), err = validar(d);
    if(err){ aviso(err, true); return; }
    aviso('Abrimos WhatsApp con su mensaje listo. Sólo debe pulsar enviar.');
    window.open(waLink(buildMessage(d)), '_blank', 'noopener');
  });

  const btnMail = document.getElementById('sendMail');
  if(btnMail) btnMail.addEventListener('click', () => {
    const d = read(), err = validar(d);
    if(err){ aviso(err, true); return; }
    aviso('Abrimos su cliente de correo con el mensaje listo. Revise que se haya enviado.');
    window.location.href = mailLink(buildMessage(d), d.nombre);
  });

  form.addEventListener('input', () => { if(note && note.classList.contains('is-warn')) aviso(NOTA, false); });
})();

/* ============================================================
   2 · ASISTENTE CONVERSACIONAL del botón flotante
   ============================================================ */
(function initBot(){
  const trigger = document.querySelector('.wa');
  if(!trigger) return;

  const ICON_WA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.5 14.4c-.3-.2-1.7-.9-2-1s-.5-.2-.7.1-.8 1-.9 1.2-.3.2-.6.1a8 8 0 0 1-2.4-1.5 9 9 0 0 1-1.6-2c-.2-.3 0-.5.1-.6l.5-.6.3-.5v-.5l-1-2.3c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.7-.7 2-1.4.2-.7.2-1.3.2-1.4l-.6-.4zM12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2z"/></svg>';

  /* el asistente se inyecta desde aquí para que exista en todas las páginas
     sin duplicar marcado en cada HTML */
  const bot = document.createElement('aside');
  bot.className = 'bot';
  bot.id = 'waBot';
  bot.setAttribute('role', 'dialog');
  bot.setAttribute('aria-modal', 'false');
  bot.setAttribute('aria-label', 'Asistente de LAPP Ingeniería');
  bot.innerHTML = `
    <div class="bot__head">
      <div class="bot__ava">${ICON_WA}</div>
      <div class="bot__id"><b>LAPP Ingeniería</b><span><i></i>Le respondemos por WhatsApp</span></div>
      <button class="bot__x" type="button" aria-label="Cerrar asistente">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7l1.4-1.4 6.3 6.3 6.3-6.3z"/></svg>
      </button>
    </div>
    <div class="bot__log" id="botLog" aria-live="polite"></div>
    <div class="bot__foot">
      <div class="bot__chips" id="botChips"></div>
      <form class="bot__form" id="botForm">
        <input id="botInput" type="text" autocomplete="off" placeholder="Escriba aquí…" aria-label="Su respuesta">
        <button class="bot__send" type="submit" aria-label="Enviar respuesta">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2.5 21 23 12 2.5 3l.01 7L17 12 2.51 14z"/></svg>
        </button>
      </form>
      <div class="bot__cta is-hidden" id="botCta">
        <a id="botSend" href="#" target="_blank" rel="noopener">${ICON_WA} Enviar por WhatsApp</a>
        <button type="button" id="botRestart" aria-label="Empezar de nuevo">Reiniciar</button>
      </div>
    </div>`;
  document.body.appendChild(bot);

  const log     = bot.querySelector('#botLog');
  const chips   = bot.querySelector('#botChips');
  const form    = bot.querySelector('#botForm');
  const input   = bot.querySelector('#botInput');
  const cta     = bot.querySelector('#botCta');
  const sendA   = bot.querySelector('#botSend');
  const restart = bot.querySelector('#botRestart');

  let data = {}, step = 0, busy = false;

  const scroll = () => { log.scrollTop = log.scrollHeight; };

  function say(text, cls){
    const el = document.createElement('div');
    el.className = 'msg ' + (cls || 'msg--bot');
    el.textContent = text;
    log.appendChild(el); scroll();
    return el;
  }

  /* pausa con indicador de escritura: sin ella el bot responde tan rápido
     que se siente automático y frío */
  function botSay(text, cls){
    return new Promise(resolve => {
      const t = document.createElement('div');
      t.className = 'typing';
      t.innerHTML = '<i></i><i></i><i></i>';
      log.appendChild(t); scroll();
      setTimeout(() => {
        t.remove();
        say(text, cls || 'msg--bot');
        resolve();
      }, Math.min(1100, 380 + text.length * 12));
    });
  }

  function setChips(list){
    chips.innerHTML = '';
    (list || []).forEach(txt => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = txt;
      b.addEventListener('click', () => answer(txt));
      chips.appendChild(b);
    });
  }

  const STEPS = [
    { key:'nombre',   ask:'¡Hola! Soy el asistente de LAPP Ingeniería 👷\nPara empezar, ¿cuál es su nombre?', ph:'Su nombre y apellido' },
    { key:'tipo',     ask:d => `Mucho gusto, ${d.nombre.split(' ')[0]}. ¿Qué necesita construir o intervenir?`, chips:TIPOS, ph:'O escríbalo con sus palabras' },
    { key:'ciudad',   ask:'¿En qué ciudad o municipio sería el proyecto?', ph:'Ciudad o municipio' },
    { key:'mensaje',  ask:'Cuénteme brevemente de qué se trata. Entre más detalle, más precisa será la cotización.', ph:'Describa su proyecto', chips:['Prefiero contarlo por WhatsApp'] },
    { key:'telefono', ask:'¿A qué número lo podemos contactar?', ph:'Ej. 310 000 0000', chips:['Prefiero dejar solo el correo'] },
    { key:'correo',   ask:'Por último, ¿cuál es su correo electrónico?', ph:'nombre@empresa.com', chips:['Omitir'] }
  ];

  const OMITIR = ['omitir','prefiero contarlo por whatsapp','prefiero dejar solo el correo'];

  async function ask(){
    const s = STEPS[step];
    if(!s) return finish();
    busy = true;
    setChips([]);
    await botSay(typeof s.ask === 'function' ? s.ask(data) : s.ask);
    setChips(s.chips);
    input.placeholder = s.ph || 'Escriba aquí…';
    busy = false;
    if(window.matchMedia('(min-width: 900px)').matches) input.focus();
  }

  async function answer(text){
    if(busy) return;
    const v = (text || '').trim();
    if(!v) return;
    say(v, 'msg--me');
    input.value = '';
    setChips([]);

    const s = STEPS[step];
    data[s.key] = OMITIR.includes(v.toLowerCase()) ? '' : v;
    step++;
    await ask();
  }

  async function finish(){
    busy = true;
    const msg = buildMessage(data);
    await botSay('Listo. Este es el mensaje que le llegará a LAPP:');
    say(msg, 'msg--sum');
    await botSay('Si está de acuerdo, pulse el botón y se abrirá WhatsApp con todo escrito.');
    sendA.href = waLink(msg);
    form.classList.add('is-hidden');
    cta.classList.remove('is-hidden');
    busy = false;
  }

  function reset(){
    data = {}; step = 0;
    log.innerHTML = '';
    cta.classList.add('is-hidden');
    form.classList.remove('is-hidden');
    ask();
  }

  form.addEventListener('submit', e => { e.preventDefault(); answer(input.value); });
  restart.addEventListener('click', reset);

  function open(){
    bot.classList.add('is-open');
    trigger.classList.add('is-open');
    trigger.setAttribute('aria-expanded', 'true');
    if(!log.children.length) ask();
  }
  function close(){
    bot.classList.remove('is-open');
    trigger.classList.remove('is-open');
    trigger.setAttribute('aria-expanded', 'false');
  }

  /* el enlace directo a WhatsApp queda como alternativa si no hay JS */
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', 'waBot');
  trigger.addEventListener('click', e => {
    e.preventDefault();
    bot.classList.contains('is-open') ? close() : open();
  });

  bot.querySelector('.bot__x').addEventListener('click', close);
  document.addEventListener('keydown', e => {
    if(e.key === 'Escape' && bot.classList.contains('is-open')){ close(); trigger.focus(); }
  });
})();

})();
