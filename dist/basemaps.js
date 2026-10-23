/* Swap raster base layers without recreating terrain or analysis sources. */
(function(root){
'use strict';
const definitions={
 topo:{name:'Topográfico',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],maxzoom:17,attribution:'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)'},
 street:{name:'OpenStreetMap'},
 satellite:{name:'Satélite',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics and GIS User Community'},
 esritopo:{name:'Topográfico Esri',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}'],maxzoom:19,attribution:'Topographic © Esri, HERE, Garmin, USGS, OpenStreetMap contributors and GIS User Community'},
 gray:{name:'Cinza claro',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'],maxzoom:16,attribution:'Light Gray © Esri, HERE, Garmin and OpenStreetMap contributors'},
 military:{name:'Militar · CIGeoE 1:500 000'},
 hybrid:{name:'Híbrido · satélite',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics and GIS User Community'}
};
async function install(map){
 const panel=document.getElementById('basemapPanel'),toggle=document.getElementById('basemapToggle');
 for(const key of ['topo','hybrid','satellite','esritopo','gray']){map.addSource('base-'+key,{type:'raster',tileSize:256,...definitions[key]});map.addLayer({id:'base-'+key,type:'raster',source:'base-'+key,layout:{visibility:'none'}},'shade');}
 map.addSource('hybrid-labels',{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Labels © Esri, Garmin, HERE, OpenStreetMap contributors and GIS User Community'});
 map.addLayer({id:'hybrid-labels',type:'raster',source:'hybrid-labels',layout:{visibility:'none'}},'poly-fill');
 let militaryReady=false;try{const r=await fetch('data/cigeoe-itineraria.json',{signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error();const meta=await r.json();map.addSource('base-military',{type:'image',url:'data/cigeoe-itineraria.png',coordinates:meta.coordinates});map.addLayer({id:'base-military',type:'raster',source:'base-military',layout:{visibility:'none'},paint:{'raster-opacity':1}},'shade');militaryReady=true;}catch{panel.querySelector('[data-basemap=military]').disabled=true;}
 const select=key=>{
  for(const [name,id] of [['street','base'],...['topo','hybrid','satellite','esritopo','gray'].map(k=>[k,'base-'+k]),...(militaryReady?[['military','base-military']]:[])])map.setLayoutProperty(id,'visibility',name===key||(key==='military'&&name==='street')?'visible':'none');
  map.setLayoutProperty('hybrid-labels','visibility',key==='hybrid'?'visible':'none');
  map.setPaintProperty('shade','hillshade-exaggeration',['hybrid','satellite'].includes(key)?.12:key==='military'?0:.45);
  for(const button of panel.querySelectorAll('[data-basemap]'))button.setAttribute('aria-checked',String(button.dataset.basemap===key));
  document.getElementById('basemapName').textContent=definitions[key].name;document.getElementById('basemapCredit').hidden=key!=='military';document.getElementById('basemapNote').textContent=key==='military'?'CIGeoE · Portugal continental · escala regional 1:500 000. Cartas 1:25 000 e 1:50 000 sujeitas a licenciamento.':'O mapa base não altera os cálculos CPS ou WindNinja.';
  try{localStorage.setItem('firepotential-basemap',key);}catch{}
 };
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 for(const button of panel.querySelectorAll('[data-basemap]'))button.onclick=()=>select(button.dataset.basemap);
 panel.onkeydown=e=>{const buttons=[...panel.querySelectorAll('[data-basemap]')],keys=buttons.map(b=>b.dataset.basemap);let i=buttons.indexOf(document.activeElement);if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();i=(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+keys.length)%keys.length;buttons[i].focus();select(keys[i]);}if(e.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}};
 let initial='street';try{initial=localStorage.getItem('firepotential-basemap')||initial;}catch{}select(definitions[initial]&&(initial!=='military'||militaryReady)?initial:'street');
}
root.CPSBasemaps={install};
})(globalThis);
