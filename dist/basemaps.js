/* Swap raster base layers without recreating terrain or analysis sources. */
(function(root){
'use strict';
const definitions={
 topo:{name:'Topográfico',tiles:['https://a.tile.opentopomap.org/{z}/{x}/{y}.png'],maxzoom:17,attribution:'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)'},
 street:{name:'OpenStreetMap'},
 hybrid:{name:'Híbrido · satélite',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],maxzoom:19,attribution:'Imagery © Esri, Maxar, Earthstar Geographics and GIS User Community'}
};
function install(map){
 const panel=document.getElementById('basemapPanel'),toggle=document.getElementById('basemapToggle');
 for(const key of ['topo','hybrid']){map.addSource('base-'+key,{type:'raster',tileSize:256,...definitions[key]});map.addLayer({id:'base-'+key,type:'raster',source:'base-'+key,layout:{visibility:'none'}},'shade');}
 map.addSource('hybrid-labels',{type:'raster',tiles:['https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'],tileSize:256,maxzoom:19,attribution:'Labels © Esri, Garmin, HERE, OpenStreetMap contributors and GIS User Community'});
 map.addLayer({id:'hybrid-labels',type:'raster',source:'hybrid-labels',layout:{visibility:'none'}},'poly-fill');
 const select=key=>{
  for(const [name,id] of [['street','base'],['topo','base-topo'],['hybrid','base-hybrid']])map.setLayoutProperty(id,'visibility',name===key?'visible':'none');
  map.setLayoutProperty('hybrid-labels','visibility',key==='hybrid'?'visible':'none');
  map.setPaintProperty('shade','hillshade-exaggeration',key==='hybrid'?.12:.45);
  for(const button of panel.querySelectorAll('[data-basemap]'))button.setAttribute('aria-checked',String(button.dataset.basemap===key));
  document.getElementById('basemapName').textContent=definitions[key].name;
  try{localStorage.setItem('firepotential-basemap',key);}catch{}
 };
 toggle.onclick=()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden));};
 for(const button of panel.querySelectorAll('[data-basemap]'))button.onclick=()=>select(button.dataset.basemap);
 panel.onkeydown=e=>{const keys=['topo','street','hybrid'],buttons=[...panel.querySelectorAll('[data-basemap]')];let i=buttons.indexOf(document.activeElement);if(['ArrowRight','ArrowDown','ArrowLeft','ArrowUp'].includes(e.key)){e.preventDefault();i=(i+(e.key==='ArrowLeft'||e.key==='ArrowUp'?-1:1)+3)%3;buttons[i].focus();select(keys[i]);}if(e.key==='Escape'){panel.hidden=true;toggle.setAttribute('aria-expanded','false');toggle.focus();}};
 let initial='street';try{initial=localStorage.getItem('firepotential-basemap')||initial;}catch{}select(definitions[initial]?initial:'street');
}
root.CPSBasemaps={install};
})(globalThis);
