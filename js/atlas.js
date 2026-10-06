/* GEO-DS Atlas — catálogo, idiomas, ligações e visualizador partilhados.
   Os dados científicos são mantidos em data/modelos.js. Sem dependências JS. */
(() => {
  'use strict';
  const $ = (selector, parent = document) => parent.querySelector(selector);
  const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];
  const lang = document.documentElement.lang.startsWith('en') ? 'en' : 'pt';
  const locale = lang === 'en' ? 'en' : 'pt-PT';
  const page = document.body.dataset.page;
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const normalise = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase(locale);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const icon = name => `<svg class="icon" aria-hidden="true"><use href="#i-${name}"/></svg>`;
  const T = {
    pt: {
      tech:['LiDAR Aéreo','LiDAR Terrestre','Multiespectral','Hiperespectral'], model:'modelo', models:'modelos', preparing:'Modelos em preparação', soon:'Em breve',
      thumbnail:'Miniatura indisponível', explore:'Explorar em 3D', onmap:'Ver no mapa', closeMenu:'Fechar menu', openMenu:'Abrir menu',
      fullscreen:'Abrir visualizador em ecrã inteiro', exitFullscreen:'Sair do ecrã inteiro', maximize:'Expandir visualizador', restore:'Repor tamanho do visualizador', fullscreenBlocked:'O browser não permitiu o ecrã inteiro. O visualizador foi expandido na página.', pause:'Pausar animação', resume:'Retomar animação',
      copied:'Ligação copiada.', copyFailed:'Seleciona e copia o endereço da página para partilhar esta vista.',
      theme:{geochemistry:'Geoquímica',mining:'Mineração e geologia',landscape:'Paisagem e ambiente',terrain:'Território e classificação',heritage:'Património e arquitetura'}
    },
    en: {
      tech:['Airborne LiDAR','Terrestrial LiDAR','Multispectral','Hyperspectral'], model:'model', models:'models', preparing:'Models in preparation', soon:'Coming soon',
      thumbnail:'Preview unavailable', explore:'Explore in 3D', onmap:'Show on map', closeMenu:'Close menu', openMenu:'Open menu',
      fullscreen:'Open viewer in fullscreen', exitFullscreen:'Exit fullscreen', maximize:'Expand viewer', restore:'Restore viewer size', fullscreenBlocked:'The browser did not allow fullscreen. The viewer has been expanded within the page.', pause:'Pause animation', resume:'Resume animation',
      copied:'Link copied.', copyFailed:'Select and copy the page address to share this view.',
      theme:{geochemistry:'Geochemistry',mining:'Mining and geology',landscape:'Landscape and environment',terrain:'Terrain and classification',heritage:'Heritage and architecture'}
    }
  }[lang];
  const keys = ['aereo','terrestre','multi','hyper'];
  const technologies = keys.map((key,index) => ({key,id:String(index+1).padStart(2,'0'),title:T.tech[index]}));
  const mapFile = lang === 'en' ? 'map.html' : 'mapa.html';
  const models = (Array.isArray(window.MODELOS) ? window.MODELOS : []).filter(model => model && /^[\w-]+$/.test(model.id) && /^[\w-]+$/.test(model.url) && keys.includes(model.t));
  const byId = new Map(models.map(model => [model.id,model]));
  const title = model => model.title?.[lang] || model.title?.pt || model.id;
  const modelURL = model => `https://realitymax.co/embed/${model.url}`;
  const techOf = model => technologies.find(tech => tech.key === model.t);
  const collator = new Intl.Collator(locale, {sensitivity:'base',numeric:true});
  const scrollBehavior = () => motionQuery.matches ? 'auto' : 'smooth';
  const validPosition = model => Number.isFinite(model.lat) && Number.isFinite(model.lng) && Math.abs(model.lat) <= 90 && Math.abs(model.lng) <= 180;
  const number = value => new Intl.NumberFormat(locale).format(value);
  function theme(model) {
    const name = normalise(model.title?.pt);
    if (name.includes('distribuicao')) return 'geochemistry';
    if (name.includes('mina') || name.includes('vale da arca')) return 'mining';
    if (['ndvi','pradaria','coelheiros'].some(word => name.includes(word))) return 'landscape';
    if (['modelo digital','vegetacao','edificios','ruas e chao','carros'].some(word => name.includes(word)) || name === 'alcacer do sal') return 'terrain';
    return 'heritage';
  }
  const techAliases={aereo:'LiDAR Aéreo Airborne LiDAR',terrestre:'LiDAR Terrestre Terrestrial LiDAR',multi:'Multiespectral Multispectral',hyper:'Hiperespectral Hyperspectral'};
  const themeAliases={geochemistry:'Geoquímica Geochemistry',mining:'Mineração Geologia Mining Geology',landscape:'Paisagem Ambiente Landscape Environment',terrain:'Território Classificação Terrain Classification',heritage:'Património Arquitetura Heritage Architecture'};
  const searchable = new Map(models.map(model => [model.id, normalise([model.title?.pt,model.title?.en,model.sensor,model.area,techAliases[model.t],themeAliases[theme(model)]].join(' '))]));
  function readState() {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash.slice(1);
    const selectedTech = params.get('tech') || (page === 'catalog' && technologies.some(tech => tech.id === hash) ? hash : 'all');
    return {q:(params.get('q') || '').slice(0,180),tech:technologies.some(tech=>tech.id===selectedTech)?selectedTech:'all',sort:['asc','desc'].includes(params.get('sort'))?params.get('sort'):'original',view:params.get('view')==='list'?'list':'grid',model:byId.has(params.get('model'))?params.get('model'):null,viewer:byId.has(params.get('viewer'))?params.get('viewer'):null,focus:byId.has(params.get('focus'))?params.get('focus'):null,base:params.get('base')==='satellite'?'satellite':'street'};
  }
  function patchURL(changes, hash) {
    const url = new URL(window.location.href);
    for (const [key,value] of Object.entries(changes)) {
      if (value === null || value === undefined || value === '' || value === 'all' || (key==='sort' && value==='original') || (key==='view' && value==='grid') || (key==='base' && value==='street')) url.searchParams.delete(key);
      else url.searchParams.set(key,String(value));
    }
    if (hash !== undefined) url.hash = hash;
    try { history.replaceState(null,'',url); } catch (_) { /* O catálogo continua funcional quando aberto diretamente. */ }
    updateRouteLinks();
    return url;
  }
  function routeURL(file, extras = {}) {
    const url = new URL(file,window.location.href);
    url.search = window.location.search;
    for (const key of ['viewer','model','focus']) url.searchParams.delete(key);
    for (const [key,value] of Object.entries(extras)) if (value != null) url.searchParams.set(key,String(value));
    return url.href;
  }
  function updateRouteLinks() {
    $$('[data-language]').forEach(link => {
      const file = page==='map' ? (link.dataset.language==='en'?'map.html':'mapa.html') : 'index.html';
      const url = new URL(`../${link.dataset.language}/${file}`,window.location.href);
      url.search=window.location.search;url.hash=window.location.hash;link.href=url.href;
    });
    $$('[data-route-map]').forEach(link => link.href=routeURL(mapFile));
    $$('[data-route-catalog]').forEach(link => link.href=routeURL('index.html',readState().model?{focus:readState().model}:{}));
  }
  function match(model,state) {
    const tech = technologies.find(item=>item.id===state.tech);
    return (!tech || model.t===tech.key) && normalise(state.q).split(/\s+/).filter(Boolean).every(term=>(searchable.get(model.id)||'').includes(term));
  }
  function sortModels(list,order='original') {
    if (order==='original') return list;
    return [...list].sort((a,b)=>collator.compare(title(a),title(b))*(order==='desc'?-1:1));
  }
  let toastTimer;
  function toast(message) {
    const el=$('#toast');if(!el)return;
    if(dialog?.open)($('#viewer-shell')||dialog).append(el);else document.body.append(el);
    clearTimeout(toastTimer);el.textContent=message;el.hidden=false;toastTimer=setTimeout(()=>el.hidden=true,3300);
  }
  async function copyURL(url = window.location.href) {
    try { await navigator.clipboard.writeText(url);toast(T.copied); } catch (_) {toast(T.copyFailed);}
  }
  function images(parent=document) {
    $$('img',parent).forEach(img=>{
      if (img.dataset.errorBound) return;img.dataset.errorBound='true';
      const fallback=img.parentElement?.querySelector('.thumb-fallback');
      const loaded=()=>{const available=img.naturalWidth>0;img.hidden=!available;if(fallback)fallback.hidden=available;};
      const failed=()=>{img.hidden=true;if(fallback)fallback.hidden=false;};
      img.addEventListener('load',loaded);img.addEventListener('error',failed);if(img.complete)loaded();
    });
  }
  function cardHTML(model,index) {
    const tech=techOf(model),name=esc(title(model)),url=modelURL(model);
    const metadata=['sensor','area'].filter(key=>model[key]).map(key=>`<span>${key==='sensor'?'Sensor':lang==='en'?'Area':'Área'}: ${esc(model[key])}</span>`).join('');
    return `<article class="model-card reveal" data-model="${esc(model.id)}" data-tech="${tech.id}" style="--fallback-angle:${(index*13)%60-30}deg;--fallback-x:${25+(index*17)%50}%"><a class="card-link" href="${url}" target="_blank" rel="noopener noreferrer" data-open="${esc(model.id)}" aria-label="${T.explore} — ${name}"><div class="card-media"><div class="thumb-fallback" aria-hidden="true"><svg viewBox="0 0 400 250"><use href="#contours"/></svg>${icon('cube')}<span>${T.thumbnail}</span></div><img src="../images/${esc(model.img)}" alt="${name}" loading="lazy" decoding="async" width="960" height="600"><span class="media-badge" aria-hidden="true">${icon('cube')}3D</span><span class="card-hover" aria-hidden="true"><span>${T.explore}</span>${icon('arrow')}</span></div><div class="card-info"><div class="card-meta"><span class="card-tech">${tech.title}</span><span class="card-number">${tech.id}.${String(index).padStart(2,'0')}</span></div><h4>${name}</h4><p class="card-theme">${T.theme[theme(model)]}</p>${metadata?`<div class="card-extra">${metadata}</div>`:''}</div></a><div class="card-actions"><a class="card-explore" href="${url}" target="_blank" rel="noopener noreferrer" data-open="${esc(model.id)}">${T.explore}${icon('arrow')}</a><a class="card-map" href="${esc(routeURL(mapFile,{model:model.id}))}" aria-label="${T.onmap} — ${name}" title="${T.onmap}">${icon('pin')}</a></div></article>`;
  }
  const menuToggle=$('.menu-toggle'),nav=$('#main-nav');
  function closeMenu(){nav?.classList.remove('is-open');menuToggle?.setAttribute('aria-expanded','false');menuToggle?.setAttribute('aria-label',T.openMenu);}
  if(menuToggle){menuToggle.hidden=false;menuToggle.addEventListener('click',()=>{const open=menuToggle.getAttribute('aria-expanded')!=='true';nav.classList.toggle('is-open',open);menuToggle.setAttribute('aria-expanded',String(open));menuToggle.setAttribute('aria-label',open?T.closeMenu:T.openMenu);});}
  document.addEventListener('click',event=>{if(!event.target.closest('.site-header'))closeMenu();});
  $('.brand')?.addEventListener('click',closeMenu);
  const logo=$('.brand-image');
  if(logo){const loaded=()=>{if(logo.naturalWidth)$('.brand').dataset.logo='loaded';};logo.addEventListener('load',loaded);if(logo.complete)loaded();}

  /* Um iframe de cada vez. Fechar o diálogo descarrega os recursos do modelo. */
  const dialog=$('#model-dialog'),mount=$('#iframe-mount'),loading=$('.viewer-loading');
  let pool=[...models],viewerModels=[],viewerIndex=0,opener=null,loadTimeout,generation=0;
  function setPool(list){pool=[...list];}
  function showModel(index) {
    const model=viewerModels[index];if(!model)return;viewerIndex=index;
    const current=++generation;clearTimeout(loadTimeout);mount.replaceChildren();
    $('#viewer-title').textContent=title(model);$('#viewer-technology').textContent=`${techOf(model).title} / GEO-DS LAB`;
    $('#viewer-position').textContent=`${String(index+1).padStart(2,'0')} / ${String(viewerModels.length).padStart(2,'0')}`;
    $('#viewer-prev').disabled=index===0;$('#viewer-next').disabled=index===viewerModels.length-1;
    $('#viewer-external').href=modelURL(model);$('#viewer-slow-link').href=modelURL(model);
    const mapLink=$('#viewer-map');mapLink.href=routeURL(mapFile,{model:model.id});mapLink.hidden=!validPosition(model);
    loading.hidden=false;$('.viewer-slow').hidden=true;
    const frame=document.createElement('iframe');frame.title=`${title(model)} — RealityMax`;frame.allow='fullscreen; xr-spatial-tracking';frame.setAttribute('allowfullscreen','');frame.referrerPolicy='strict-origin-when-cross-origin';
    frame.addEventListener('load',()=>{if(current===generation){clearTimeout(loadTimeout);loading.hidden=true;}},{once:true});frame.src=modelURL(model);mount.append(frame);
    loadTimeout=setTimeout(()=>{if(current===generation&&!loading.hidden)$('.viewer-slow').hidden=false;},14000);
    patchURL({viewer:model.id});
  }
  function openViewer(id,trigger=null) {
    const model=byId.get(id);if(!model||!dialog||typeof dialog.showModal!=='function')return false;
    opener=trigger||document.activeElement;viewerModels=pool.includes(model)?[...pool]:[...models];
    document.body.classList.add('viewer-open');if(!dialog.open)dialog.showModal();showModel(viewerModels.indexOf(model));return true;
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('[data-open]');
    if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey||event.button>0)return;
    if(openViewer(link.dataset.open,link))event.preventDefault();
  });
  if(dialog){
    $('#viewer-close').addEventListener('click',()=>dialog.close());
    dialog.addEventListener('close',()=>{if(viewerIsFullscreen()&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});++generation;clearTimeout(loadTimeout);mount.replaceChildren();document.body.classList.remove('viewer-open');dialog.classList.remove('is-maximized');const notice=$('#toast');if(notice&&dialog.contains(notice))document.body.append(notice);syncFullscreen();patchURL(page==='catalog'?{viewer:null,model:null}:{viewer:null});if(opener?.isConnected)opener.focus({preventScroll:true});});
    dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const b=dialog.getBoundingClientRect();if(event.clientX<b.left||event.clientX>b.right||event.clientY<b.top||event.clientY>b.bottom)dialog.close();});
    $('#viewer-prev').addEventListener('click',()=>showModel(viewerIndex-1));$('#viewer-next').addEventListener('click',()=>showModel(viewerIndex+1));$('#viewer-copy').addEventListener('click',()=>copyURL());
    const fullscreen=$('#viewer-fullscreen'),viewerShell=$('#viewer-shell');
    const supportsFullscreen=Boolean(document.fullscreenEnabled&&viewerShell?.requestFullscreen);
    function viewerIsFullscreen(){return Boolean(document.fullscreenElement&&dialog.contains(document.fullscreenElement));}
    function syncFullscreen(){
      const full=viewerIsFullscreen(),expanded=dialog.classList.contains('is-maximized');
      const label=full?T.exitFullscreen:expanded?T.restore:supportsFullscreen?T.fullscreen:T.maximize;
      fullscreen.setAttribute('aria-label',label);fullscreen.setAttribute('title',label);fullscreen.setAttribute('aria-pressed',String(full||expanded));
    }
    fullscreen.hidden=false;syncFullscreen();
    fullscreen.addEventListener('click',async()=>{
      if(dialog.classList.contains('is-maximized')){dialog.classList.remove('is-maximized');syncFullscreen();return;}
      if(!supportsFullscreen){dialog.classList.add('is-maximized');syncFullscreen();return;}
      try {
        if(viewerIsFullscreen())await document.exitFullscreen();
        else {await viewerShell.requestFullscreen();if(!dialog.open&&viewerIsFullscreen())await document.exitFullscreen();}
      } catch (_) {if(dialog.open){dialog.classList.add('is-maximized');toast(T.fullscreenBlocked);}}
      syncFullscreen();
    });
    document.addEventListener('fullscreenchange',syncFullscreen);
  }
  document.addEventListener('keydown',event=>{
    const editing=event.target.closest('input,textarea,select,[contenteditable="true"]');
    if(event.key==='Escape')closeMenu();
    if(dialog?.open){if(!editing&&event.key==='ArrowLeft'){event.preventDefault();showModel(viewerIndex-1);}if(!editing&&event.key==='ArrowRight'){event.preventDefault();showModel(viewerIndex+1);}return;}
    if(event.key==='/'&&!editing&&!event.ctrlKey&&!event.metaKey&&!event.altKey){const search=$('#model-search');if(search){event.preventDefault();search.focus();search.scrollIntoView({behavior:scrollBehavior(),block:'center'});}}
  });
  $$('[data-total-models]').forEach(el=>el.textContent=number(models.length));
  $$('[data-tech-total]').forEach(el=>{const tech=technologies.find(item=>item.id===el.dataset.techTotal);const count=models.filter(model=>model.t===tech?.key).length;el.textContent=count?number(count):T.soon;});
  images();updateRouteLinks();

  /* API comum usada pelo mapa; não exige que o serviço de cartografia responda. */
  window.GEOAtlas={$, $$,lang,locale,T,page,models,byId,technologies,mapFile,title,modelURL,techOf,theme,normalise,esc,icon,number,validPosition,match,sortModels,readState,patchURL,routeURL,updateRouteLinks,images,copyURL,openViewer,setPool,scrollBehavior,motionQuery};

  function initCatalog(){
    const catalog=$('#atlas'),search=$('#model-search'),clear=$('.search-clear'),sort=$('#model-sort'),sections=$$('[data-section]');
    let state=readState(),visible=[];
    /* Os instantâneos HTML são legíveis sem JS; a versão interativa usa os dados partilhados. */
    for(const section of sections){const tech=technologies.find(item=>item.id===section.dataset.section);const grid=$('.models-grid',section);if(grid)grid.innerHTML=models.filter(model=>model.t===tech.key).map((model,index)=>cardHTML(model,index+1)).join('');}
    const cards=new Map($$('.model-card').map(card=>[card.dataset.model,card]));
    images(catalog);$('.catalog-toolbar').hidden=false;search.value=state.q;sort.value=state.sort;
    let observer;
    if('IntersectionObserver' in window&&!motionQuery.matches){document.documentElement.classList.add('js');observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{rootMargin:'80px 0px',threshold:.03});$$('.reveal').forEach(el=>observer.observe(el));}
    function reveal(){for(const card of cards.values())if(!card.hidden&&card.getBoundingClientRect().top<window.innerHeight+80)card.classList.add('is-visible');}
    function apply(write=true){
      state.q=search.value.trim();state.sort=sort.value;visible=[];
      for(const section of sections){const tech=technologies.find(item=>item.id===section.dataset.section);const sorted=sortModels(models.filter(model=>model.t===tech.key),state.sort);const found=sorted.filter(model=>match(model,state));visible.push(...found);
        for(const model of sorted){const card=cards.get(model.id);card.hidden=!found.includes(model);$('.models-grid',section).append(card);}
        const preparing=tech.key==='hyper'&&!sorted.length&&!state.q&&(state.tech==='all'||state.tech===tech.id);
        section.hidden=!found.length&&!preparing;$('.section-count',section).textContent=preparing?T.soon:String(found.length).padStart(2,'0');
      }
      const preparingOnly=state.tech==='04'&&!state.q&&!models.some(model=>model.t==='hyper');
      $('.empty-state').hidden=visible.length>0||preparingOnly;clear.hidden=!search.value;
      $('#results-count').textContent=preparingOnly?T.preparing:`${number(visible.length)} ${visible.length===1?T.model:T.models}${state.q||state.tech!=='all'?` / ${number(models.length)}`:''}`;
      $$('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===state.tech)));
      $$('.nav-links [data-tech-nav]').forEach(link=>{if(link.dataset.tech===state.tech)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
      catalog.dataset.view=state.view;$$('.view-control button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.view===state.view)));
      setPool(visible);if(write)patchURL({q:state.q,tech:state.tech,sort:state.sort,view:state.view},'atlas');
      for(const model of models){const card=cards.get(model.id);if(card)$('.card-map',card).href=routeURL(mapFile,{model:model.id});}
      reveal();
    }
    search.addEventListener('input',()=>apply());sort.addEventListener('change',()=>apply());
    clear.addEventListener('click',()=>{search.value='';apply();search.focus();});
    $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.tech=button.dataset.filter;apply();if(catalog.getBoundingClientRect().top<-180)$('.catalog-toolbar').scrollIntoView({behavior:scrollBehavior(),block:'start'});}));
    $('#reset-filters').addEventListener('click',()=>{state.tech='all';search.value='';apply();search.focus();});
    $$('.view-control button').forEach(button=>button.addEventListener('click',()=>{state.view=button.dataset.view;apply();}));
    $$('[data-tech-nav]').forEach(link=>link.addEventListener('click',event=>{if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;event.preventDefault();state.tech=link.dataset.tech;search.value='';apply();closeMenu();document.getElementById(state.tech).scrollIntoView({behavior:scrollBehavior(),block:'start'});patchURL({},state.tech);}));
    let queued=false;function progress(){const max=document.documentElement.scrollHeight-window.innerHeight;$('.reading-progress').style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,window.scrollY/max)):0})`;queued=false;}
    window.addEventListener('scroll',()=>{if(!queued){queued=true;requestAnimationFrame(progress);}},{passive:true});window.addEventListener('resize',progress,{passive:true});
    apply(false);progress();
    if(state.focus&&cards.has(state.focus)){const card=cards.get(state.focus);if(card.hidden){state.tech='all';search.value='';apply();}card.classList.add('is-selected','is-visible');card.scrollIntoView({behavior:'auto',block:'center'});}
    if(state.viewer||state.model)openViewer(state.viewer||state.model);
    if($('#terrain')){try{initTerrain();}catch(_){const fallback=$('.scene-fallback');if(fallback)fallback.removeAttribute('hidden');}}
  }
    function initTerrain() {
      const canvas = $('#terrain');
      const ctx = canvas.getContext('2d', { alpha: true });
      if (!ctx) return;
      const scene = $('.hero-scene');
      $('.scene-fallback').setAttribute('hidden', '');
      canvas.hidden = false;
      $('.scene-controls').hidden = false;
      $('.scene-hint').hidden = false;
      let seed = 2749;
      const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
      const heightAt = (x, z) => .12 + 1.35 * Math.exp(-((x + .5) ** 2 * .52 + (z - .1) ** 2 * 1.15)) + .72 * Math.exp(-((x - 1.2) ** 2 * 1.5 + (z + .5) ** 2)) + .10 * Math.sin(x * 3.4 + z * 2) + .06 * Math.cos(z * 6.2 - x * 1.8);
      const points = [];
      for (let z = -2.65; z <= 2.65; z += .052) for (let x = -3.15; x <= 3.15; x += .052) {
        const radius = (x / 3.1) ** 2 + (z / 2.6) ** 2;
        if (radius > 1 + .035 * Math.sin(x * 7 + z * 5)) continue;
        const px = x + (random() - .5) * .04;
        const pz = z + (random() - .5) * .04;
        const y = heightAt(px, pz) + (random() - .5) * .035;
        points.push({ x: px, z: pz, y, brightness: random(), side: false });
        if (radius > .88 && random() > .3) for (let sy = -.52; sy < y; sy += .12) points.push({ x: px, z: pz, y: sy, brightness: random() * .5, side: true });
      }
      let w = 0, h = 0, pixelRatio = 1;
      let baseYaw = -.62, yawOffset = 0, tiltOffset = 0;
      let mode = 'shape';
      let paused = motionQuery.matches;
      let inView = true, dragging = false, pointerX = 0, pointerY = 0;
      let animation = 0, lastFrame = 0, elapsed = 0;
      const paletteShape = ['#31473a','#405a48','#53715a','#6a896b','#809e7d','#9db894','#bfceb0','#dfdfc8'];
      const paletteHeight = ['#405967','#527e85','#73a39a','#96b99c','#b9caaa','#d8d7ad','#e5c691','#e8ad79'];
      const bins = Array.from({ length: 16 }, () => []);
      const pause = $('#pause-scene');
      function syncPause() {
        pause.setAttribute('aria-pressed', String(paused));
        pause.setAttribute('aria-label', paused ? T.resume : T.pause);
        $('use', pause).setAttribute('href', paused ? '#i-play' : '#i-pause');
      }
      function draw() {
        if (!w || !h) return;
        ctx.clearRect(0, 0, w, h);
        const yaw = baseYaw + yawOffset + (paused ? 0 : Math.sin(elapsed * .00010) * .07);
        const pitch = .72 + tiltOffset;
        const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
        const scale = Math.min(w / 7.6, h / 5.1);
        const centreX = w * .50, centreY = h * .55;
        /* Leitura espacial: plano base, sem valores geográficos inventados. */
        ctx.save(); ctx.strokeStyle = '#bddbc712'; ctx.lineWidth = 1;
        function project(x, y, z) {
          const rx = x * cy - z * sy, rz = x * sy + z * cy;
          return [centreX + rx * scale, centreY - (y * cp - rz * sp) * scale];
        }
        for (let z = -3; z <= 3; z += 1) {
          const a = project(-3.6, -.65, z), b = project(3.6, -.65, z); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
        }
        for (let x = -3; x <= 3; x += 1) {
          const a = project(x, -.65, -3), b = project(x, -.65, 3); ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
        }
        ctx.restore();
        bins.forEach(bin => bin.length = 0);
        const scan = paused ? 10 : Math.sin(elapsed * .00022) * 3.3;
        const stride = w < 450 ? 2 : 1;
        for (let index = 0; index < points.length; index += stride) {
          const p = points[index];
          const rx = p.x * cy - p.z * sy, rz = p.x * sy + p.z * cy;
          const px = centreX + rx * scale, py = centreY - (p.y * cp - rz * sp) * scale;
          let level = mode === 'height' ? Math.floor((p.y + .3) / 1.95 * 7) : Math.floor(2 + p.y * 2.1 + p.brightness * 1.2);
          if (!p.side && Math.abs(p.x - scan) < .13) level += 2;
          level = Math.max(0, Math.min(7, level));
          bins[level + (p.side ? 8 : 0)].push(px, py);
        }
        const palette = mode === 'height' ? paletteHeight : paletteShape;
        for (let b = 8; b < 24; b++) {
          const index = b % 16, bin = bins[index];
          if (!bin.length) continue;
          ctx.fillStyle = palette[index % 8]; ctx.globalAlpha = index >= 8 ? .32 : .85;
          const size = index >= 8 ? .85 : Math.min(1.5, Math.max(.95, scale * .014));
          ctx.beginPath(); for (let j = 0; j < bin.length; j += 2) ctx.rect(bin[j], bin[j + 1], size, size); ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
      function canAnimate() { return !paused && inView && !document.hidden && !dialog.open; }
      function tick(now) {
        animation = 0;
        if (!canAnimate()) return;
        if (now - lastFrame >= 32) { elapsed += Math.min(64, now - (lastFrame || now)); lastFrame = now; draw(); }
        animation = requestAnimationFrame(tick);
      }
      function resume() { if (canAnimate() && !animation) { lastFrame = 0; animation = requestAnimationFrame(tick); } }
      function stop() { cancelAnimationFrame(animation); animation = 0; }
      function resize() {
        const bounds = scene.getBoundingClientRect(); w = bounds.width; h = bounds.height;
        pixelRatio = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = Math.round(w * pixelRatio); canvas.height = Math.round(h * pixelRatio); ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0); draw();
      }
      pause.addEventListener('click', () => { paused = !paused; syncPause(); if (paused) { stop(); draw(); } else resume(); });
      $$('[data-scene-mode]').forEach(button => button.addEventListener('click', () => {
        mode = button.dataset.sceneMode; $$('[data-scene-mode]').forEach(el => el.setAttribute('aria-pressed', String(el === button))); draw();
      }));
      canvas.addEventListener('pointerdown', event => { if (event.button !== 0) return; dragging = true; pointerX = event.clientX; pointerY = event.clientY; canvas.setPointerCapture(event.pointerId); });
      canvas.addEventListener('pointermove', event => {
        if (!dragging) return;
        yawOffset += (event.clientX - pointerX) * .006; tiltOffset = Math.max(-.18, Math.min(.22, tiltOffset + (event.clientY - pointerY) * .003)); pointerX = event.clientX; pointerY = event.clientY; draw();
      });
      ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(type => canvas.addEventListener(type, () => dragging = false));
      canvas.addEventListener('keydown', event => {
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); yawOffset += event.key === 'ArrowLeft' ? -.12 : .12; draw(); }
      });
      if ('ResizeObserver' in window) new ResizeObserver(resize).observe(scene); else window.addEventListener('resize', resize, { passive: true });
      if ('IntersectionObserver' in window) new IntersectionObserver(entries => { inView = entries[0].isIntersecting; if (inView) resume(); else stop(); }).observe(scene);
      document.addEventListener('visibilitychange', () => document.hidden ? stop() : resume());
      new MutationObserver(() => dialog.open ? stop() : resume()).observe(dialog, { attributes: true, attributeFilter: ['open'] });
      motionQuery.addEventListener('change', event => { paused = event.matches; syncPause(); if (paused) { stop(); draw(); } else resume(); });
      syncPause(); resize(); resume();
    }

  if(page==='catalog'&&models.length)initCatalog();
})();
