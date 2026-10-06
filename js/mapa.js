/* GEO-DS — mapa bilingue. As posições e os indicadores approx são preservados.
   Leaflet 1.9.4 / Leaflet.markercluster 1.5.3; lista e detalhes funcionam sem a cartografia. */
(() => {
  'use strict';
  const G=window.GEOAtlas;if(!G)return;
  const {$,$$,lang,models,byId,title,modelURL,techOf,esc,icon,validPosition}=G;
  const T={
    pt:{models:'modelos',model:'modelo',details:'Ver detalhes',choose:'Seleciona um modelo na lista ou um ponto no mapa.',close:'Fechar detalhes',sensor:'Sensor',area:'Área',latitude:'Latitude',longitude:'Longitude',approx:'Posição aproximada, por confirmar.',explore:'Explorar em 3D',catalog:'Ver no catálogo',copy:'Copiar ligação',unavailable:'Não foi possível abrir a cartografia. A lista e os detalhes dos modelos continuam disponíveis.',tiles:'A cartografia de base não está a responder. Podes continuar a explorar os pontos e a lista.',zoomIn:'Aproximar',zoomOut:'Afastar',noResults:'Não encontrámos modelos com estes filtros.',download:'Localizações exportadas em GeoJSON.'},
    en:{models:'models',model:'model',details:'Show details',choose:'Select a model in the list or a point on the map.',close:'Close details',sensor:'Sensor',area:'Area',latitude:'Latitude',longitude:'Longitude',approx:'Approximate position, to be confirmed.',explore:'Explore in 3D',catalog:'Show in catalogue',copy:'Copy link',unavailable:'The base map could not be opened. The model list and details remain available.',tiles:'The base map is not responding. You can still explore the points and the list.',zoomIn:'Zoom in',zoomOut:'Zoom out',noResults:'No models match these filters.',download:'Locations exported as GeoJSON.'}
  }[lang];
  const search=$('#model-search'),clear=$('.search-clear'),list=$('#map-list'),detail=$('#detail'),message=$('#map-message');
  const narrow=window.matchMedia('(max-width: 900px)');
  let state=G.readState(),visible=[],selected=null,opener=null,map=null,cluster=null,previousSelected=null;
  let layers={},markers=new Map(),tileFailures=0;
  search.value=state.q;

  function messageText(text){message.hidden=false;message.replaceChildren();const p=document.createElement('p');p.textContent=text;message.append(p);}
  function markerIcon(model,active=false){return window.L.divIcon({className:`pin-hit${active?' is-selected':''}`,html:`<span class="pin pin-${model.t}${model.approx?' pin-approx':''}"></span>`,iconSize:[40,40],iconAnchor:[20,20]});}
  function setBase(base,write=true){
    state.base=base;
    $$('[data-basemap]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.basemap===base)));
    if(map){Object.values(layers).forEach(layer=>{if(map.hasLayer(layer))map.removeLayer(layer);});layers[base].addTo(map);tileFailures=0;message.hidden=true;}
    if(write)G.patchURL({base});
  }
  function initMap(){
    if(!window.L?.map){messageText(T.unavailable);$$('[data-basemap]').forEach(button=>button.disabled=true);$('#map-fit').disabled=true;$('.map-legend').hidden=true;return;}
    const L=window.L,first=models.find(validPosition);
    map=L.map('map',{zoomControl:false,minZoom:3,maxZoom:19,zoomAnimation:!G.motionQuery.matches,fadeAnimation:!G.motionQuery.matches,markerZoomAnimation:!G.motionQuery.matches}).setView(first?[first.lat,first.lng]:[38.6,-8],7);
    L.control.zoom({position:'bottomright',zoomInTitle:T.zoomIn,zoomOutTitle:T.zoomOut}).addTo(map);
    L.control.scale({position:'bottomleft',imperial:false,maxWidth:120}).addTo(map);
    const base='https://server.arcgisonline.com/ArcGIS/rest/services/';
    const attribution='Tiles &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener noreferrer">Esri</a>';
    const darkBase=L.tileLayer(base+'Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:16,attribution});
    const darkLabels=L.tileLayer(base+'Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,maxNativeZoom:16,attribution});
    const satellite=L.tileLayer(base+'World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution});
    layers={street:L.layerGroup([darkBase,darkLabels]),satellite};
    for(const layer of [darkBase,darkLabels,satellite]){
      layer.on('tileerror',()=>{if(map.hasLayer(layer)&&++tileFailures>=3)messageText(T.tiles);});
      layer.on('tileload',()=>{if(map.hasLayer(layer)){tileFailures=0;message.hidden=true;}});
    }
    setBase(state.base,false);
    cluster=L.markerClusterGroup?L.markerClusterGroup({showCoverageOnHover:false,maxClusterRadius:42,spiderfyOnMaxZoom:true,spiderfyDistanceMultiplier:1.3,animate:!G.motionQuery.matches,spiderLegPolylineOptions:{weight:1,color:'#bddbc7',opacity:.7},iconCreateFunction:group=>L.divIcon({className:'geo-cluster',html:`<span>${group.getChildCount()}</span>`,iconSize:[42,42],iconAnchor:[21,21]})}):L.layerGroup();
    map.addLayer(cluster);
    for(const model of models.filter(validPosition)){
      const marker=L.marker([model.lat,model.lng],{title:title(model),alt:title(model),keyboard:true,icon:markerIcon(model)});
      marker.on('click',()=>select(model.id,false,marker.getElement?.()));markers.set(model.id,marker);
    }
    map.on('click',()=>{if(narrow.matches&&!$('#model-dialog').open)hideDetail(false);});
    if('ResizeObserver' in window)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe($('.map-stage'));
    else window.addEventListener('resize',()=>map.invalidateSize({pan:false}),{passive:true});
    message.hidden=true;
  }
  function fit(){
    const positions=visible.filter(validPosition).map(model=>[model.lat,model.lng]);
    if(map&&positions.length)map.fitBounds(window.L.latLngBounds(positions),{padding:[40,40],maxZoom:14,animate:!G.motionQuery.matches});
  }
  function renderList(){
    list.innerHTML=visible.map(model=>`<button class="map-result${selected?.id===model.id?' is-selected':''}" type="button" data-select="${esc(model.id)}" aria-pressed="${selected?.id===model.id}" aria-label="${T.details} — ${esc(title(model))}"><span class="dot" data-tech="${techOf(model).id}"></span><span class="result-name">${esc(title(model))}<small>${techOf(model).title}</small></span>${icon('right')}</button>`).join('');
    $('.map-empty').hidden=visible.length>0;
  }
  function positionText(value){return new Intl.NumberFormat(G.locale,{maximumFractionDigits:6}).format(value);}
  function renderDetail(model){
    let rows='';
    for(const [field,label] of [['sensor',T.sensor],['area',T.area]])if(model[field])rows+=`<dt>${label}</dt><dd>${esc(model[field])}</dd>`;
    if(validPosition(model))rows+=`<dt>${T.latitude}</dt><dd>${positionText(model.lat)}°</dd><dt>${T.longitude}</dt><dd>${positionText(model.lng)}°</dd>`;
    detail.innerHTML=`<button type="button" class="detail-close icon-button" aria-label="${T.close}">${icon('close')}</button><div class="card-media detail-media"><div class="thumb-fallback" aria-hidden="true"><svg viewBox="0 0 400 250"><use href="#contours"/></svg>${icon('cube')}<span>${G.T.thumbnail}</span></div><img src="../images/${esc(model.img)}" alt="${esc(title(model))}" width="960" height="600" decoding="async"></div><span class="map-tag" data-tech="${techOf(model).id}">${techOf(model).title}</span><h2 id="detail-title">${esc(title(model))}</h2>${rows?`<dl>${rows}</dl>`:''}${model.approx?`<p class="map-note">${icon('pin')}${T.approx}</p>`:''}<div class="detail-actions"><a class="button button-primary" href="${modelURL(model)}" data-open="${esc(model.id)}" target="_blank" rel="noopener noreferrer">${T.explore}${icon('arrow')}</a><button class="icon-button" type="button" data-copy-model aria-label="${T.copy}" title="${T.copy}">${icon('link')}</button></div><a class="detail-catalog text-link" href="${esc(G.routeURL('index.html',{focus:model.id}))}">${T.catalog}${icon('arrow')}</a>`;
    detail.hidden=false;detail.classList.add('is-open');G.images(detail);
  }
  function updateSelectionIcons(){
    if(previousSelected&&markers.has(previousSelected)){markers.get(previousSelected).setIcon(markerIcon(byId.get(previousSelected)));markers.get(previousSelected).setZIndexOffset(0);}
    if(selected&&markers.has(selected.id))markers.get(selected.id).setIcon(markerIcon(selected,true));
    previousSelected=selected?.id||null;
  }
  function select(id,locate=true,trigger=null){
    const model=byId.get(id);if(!model)return;selected=model;opener=trigger||document.activeElement;state.model=id;
    G.patchURL({model:id});renderDetail(model);renderList();updateSelectionIcons();
    if(map&&locate&&markers.has(id)){
      const marker=markers.get(id);
      if(cluster.zoomToShowLayer)cluster.zoomToShowLayer(marker,()=>marker.setZIndexOffset(1000));
      else map.setView([model.lat,model.lng],Math.max(map.getZoom(),14),{animate:!G.motionQuery.matches});
    }
    if(narrow.matches&&$('.map-stage').getBoundingClientRect().bottom<100)$('.map-stage').scrollIntoView({behavior:G.scrollBehavior(),block:'start'});
    if(!narrow.matches)detail.scrollIntoView({behavior:'auto',block:'nearest'});
  }
  function hideDetail(restoreFocus=true){
    const oldId=selected?.id;selected=null;state.model=null;detail.hidden=true;detail.classList.remove('is-open');updateSelectionIcons();G.patchURL({model:null});renderList();
    if(restoreFocus){const button=oldId?list.querySelector(`[data-select="${oldId}"]`):null;if(button)button.focus({preventScroll:true});else if(opener?.isConnected)opener.focus({preventScroll:true});}
  }
  function refresh(write=true){
    state.q=search.value.trim();visible=G.sortModels(models.filter(model=>G.match(model,state)),'asc');
    if(selected&&!visible.includes(selected)){selected=null;state.model=null;detail.hidden=true;detail.classList.remove('is-open');updateSelectionIcons();}
    if(cluster){cluster.clearLayers();const active=visible.map(model=>markers.get(model.id)).filter(Boolean);if(cluster.addLayers)cluster.addLayers(active);else active.forEach(marker=>cluster.addLayer(marker));}
    $('#results-count').textContent=`${G.number(visible.length)} / ${G.number(models.length)} ${visible.length===1?T.model:T.models}`;
    clear.hidden=!search.value;
    $$('[data-filter]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.filter===state.tech)));
    $('#map-export').disabled=!visible.some(validPosition);$('#map-fit').disabled=!map||!visible.some(validPosition);
    G.setPool(visible);renderList();if(write)G.patchURL({q:state.q,tech:state.tech,model:state.model});
  }
  function exportLocations(){
    const features=visible.filter(validPosition).map(model=>({type:'Feature',id:model.id,geometry:{type:'Point',coordinates:[model.lng,model.lat]},properties:{title_pt:model.title?.pt||'',title_en:model.title?.en||'',technology:model.t,sensor:model.sensor||null,area:model.area||null,approximate_position:Boolean(model.approx),model_url:modelURL(model),thumbnail:model.img||null}}));
    const blob=new Blob([JSON.stringify({type:'FeatureCollection',features},null,2)],{type:'application/geo+json;charset=utf-8'});
    const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`geods-${lang}-locations.geojson`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  list.addEventListener('click',event=>{const button=event.target.closest('[data-select]');if(button)select(button.dataset.select,true,button);});
  detail.addEventListener('click',event=>{if(event.target.closest('.detail-close'))hideDetail();if(event.target.closest('[data-copy-model]'))G.copyURL();});
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!$('#model-dialog').open&&selected)hideDetail();});
  search.addEventListener('input',()=>refresh());clear.addEventListener('click',()=>{search.value='';refresh();search.focus();});
  $$('[data-filter]').forEach(button=>button.addEventListener('click',()=>{state.tech=button.dataset.filter;refresh();}));
  $('#reset-filters').addEventListener('click',()=>{state.tech='all';search.value='';refresh();fit();search.focus();});
  $('#map-fit').addEventListener('click',fit);$('#map-export').addEventListener('click',exportLocations);
  $$('[data-basemap]').forEach(button=>button.addEventListener('click',()=>setBase(button.dataset.basemap)));
  try{initMap();}catch(error){try{map?.remove();}catch(_){}map=null;cluster=null;markers.clear();messageText(T.unavailable);$('#map-fit').disabled=true;$$('[data-basemap]').forEach(button=>button.disabled=true);$('.map-legend').hidden=true;console.warn('GEO-DS: cartography could not be initialised.',error);}
  refresh(false);fit();
  if(state.model){const model=byId.get(state.model);if(model&&!visible.includes(model)){state.tech='all';search.value='';refresh();}if(model)select(model.id,true);}
  if(state.viewer)G.openViewer(state.viewer);
})();
