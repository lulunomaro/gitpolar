import './graph-page.js';
import './compare-page.js';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
(function(){
  const states=new Set(),assets=new Map();
  function release(state){for(const task of state.requests||[]){task.users.delete(state);if(!task.users.size&&!task.done){task.abort.abort();task.worker?.terminate();task.reject?.(new DOMException('Cancelled','AbortError'));assets.delete(task.key);}}state.requests?.clear();}
  async function loadAsset(state,asset){
    const key=asset.format+':'+asset.contentId;let task=assets.get(key);
    if(!task){task={key,users:new Set(),abort:new AbortController()};assets.set(key,task);task.promise=(async()=>{try{const response=await fetch(asset.url,{signal:task.abort.signal,credentials:'same-origin'});if(!response.ok)throw Error('Preview content is unavailable ('+response.status+').');const bytes=await response.arrayBuffer();if(bytes.byteLength>state.meta.maxBytes)throw Error('Preview content exceeds the browser size limit.');if(task.abort.signal.aborted)throw new DOMException('Cancelled','AbortError');const worker=new Worker('/cad-worker.js');task.worker=worker;const geometry=await new Promise((resolve,reject)=>{task.reject=reject;worker.onmessage=e=>e.data.ok?resolve(e.data):reject(Error(e.data.error));worker.onerror=e=>reject(Error(e.message||'CAD parser failed.'));worker.postMessage({format:asset.format,bytes},[bytes]);});return geometry;}catch(e){assets.delete(key);throw e;}finally{task.worker?.terminate();task.worker=null;task.reject=null;task.done=true;}})();}
    task.users.add(state);state.requests.add(task);return task.promise;
  }
  async function loadModel(state,meta){
    if(meta.format!=='scene')return loadAsset(state,meta);
    const parsed=new Map();for(let i=0;i<meta.assets.length;i+=2){const batch=meta.assets.slice(i,i+2);await Promise.all(batch.map(async asset=>parsed.set(asset.path,await loadAsset(state,asset))));if(state.modelAbort.signal.aborted)throw new DOMException('Cancelled','AbortError');}
    const meshes=[];for(const component of meta.components){const data=parsed.get(component.asset);for(const [index,item] of data.meshes.entries())meshes.push({...item,name:component.name+(data.meshes.length>1?' / Body '+(index+1):''),componentId:component.id,source:component.source,assetKey:meta.assets.find(a=>a.path===component.asset).contentId+':'+index,transform:component.transform});}return {meshes};
  }
  const formatSize=n=>n>1024**2?(n/1024**2).toFixed(1)+' MiB':(n/1024).toFixed(1)+' KiB';
  function dispose(){
    for(const state of states){state.abort.abort();state.modelAbort?.abort();release(state);state.observer?.disconnect();state.controls?.dispose();state.renderer?.setAnimationLoop(null);const geometries=new Set(),materials=new Set();state.scene?.traverse(object=>{if(object.geometry)geometries.add(object.geometry);if(object.material)for(const m of Array.isArray(object.material)?object.material:[object.material])materials.add(m);});for(const geometry of geometries)geometry.dispose();for(const material of materials)material.dispose();state.renderer?.dispose();state.renderer?.forceContextLoss();}states.clear();assets.clear();
  }
  async function mount(container,options={}){
    if(!container)return;
    const state={container,abort:new AbortController(),requests:new Set(),loadId:0},parameters=new URLSearchParams({ref:container.dataset.ref,path:container.dataset.path});states.add(state);
    container.innerHTML='<div class="viewer-intro"><strong>3D preview</strong><span class="viewer-status" role="status">Checking preview version…</span></div><div class="viewer-start"><button class="button primary" data-load hidden>Load 3D preview</button><a class="button small" href="/tools/Export-SolidWorksPreview.ps1" data-helper hidden>Download SolidWorks helper</a><button class="button small" data-cancel hidden>Cancel</button></div><div class="viewer-workspace" hidden><div class="viewer-stage" aria-label="Interactive 3D model"></div><aside class="viewer-components"><div class="viewer-components-heading"><strong>Components / bodies</strong><button class="button small" data-show-all>Show all</button></div><div class="viewer-component-list"></div></aside></div><div class="viewer-toolbar" hidden><button class="button small" data-view="iso">Isometric</button><button class="button small" data-view="front">Front</button><button class="button small" data-view="top">Top</button><button class="button small" data-view="right">Right</button><button class="button small" data-view="fit">Fit</button><label>Up <select data-up-axis aria-label="Up axis"><option value="y">Y</option><option value="z">Z</option></select></label><label><input type="checkbox" data-edges>Edges</label><label>Explode <input type="range" data-explode min="0" max="100" value="0" aria-label="Exploded view"></label><button class="button small" data-fullscreen>Fullscreen</button></div><p class="viewer-help" hidden>左键旋转 · 右键平移 · 滚轮缩放。组件列表可隐藏或单独查看实体。预览用于查看，不改变原始图纸。</p>';
    const status=container.querySelector('.viewer-status'),load=container.querySelector('[data-load]'),cancel=container.querySelector('[data-cancel]');
    try {
      let meta=options.meta;if(!meta){const response=await fetch('/api/repos/'+container.dataset.repo+'/preview?'+parameters,{signal:state.abort.signal,credentials:'same-origin'});meta=await response.json();if(!response.ok)throw new Error(meta.error||'Cannot load preview metadata.');}state.meta=meta;if(!states.has(state))return;
      if(!meta.available){status.textContent=meta.reason==='stale'?'预览已过期：CAD 源文件或预览文件已改变，请重新生成并提交。':meta.reason==='not-generated'?'原生 SolidWorks 文件需要配套预览：在本地打开并保存装配/零件，运行辅助脚本导出 STEP 后一起提交。':meta.message;container.dataset.state=meta.reason;if(['not-generated','stale'].includes(meta.reason))container.querySelector('[data-helper]').hidden=false;return;}
      status.textContent=meta.format.toUpperCase()+' · '+formatSize(meta.size)+(meta.derived?' · Source version checked'+(meta.configuration?' · '+meta.configuration:''):'');load.hidden=false;
      state.load=async()=>{
        if(load.disabled||container.dataset.state==='ready')return;const loadId=++state.loadId;
        load.disabled=true;cancel.hidden=false;state.modelAbort=new AbortController();container.dataset.state='loading';status.textContent='Loading '+meta.format.toUpperCase()+' model…';
        try {
          const geometry=await loadModel(state,meta);if(!states.has(state)||state.modelAbort.signal.aborted||loadId!==state.loadId)return;
          createScene(state,geometry);container.querySelector('.viewer-workspace').hidden=false;container.querySelector('.viewer-toolbar').hidden=false;container.querySelector('.viewer-help').hidden=false;load.hidden=true;cancel.hidden=true;
          state.resize();state.fit();container.dataset.state='ready';container.dataset.meshes=String(geometry.meshes.length);
          container.dispatchEvent(new CustomEvent('preview-ready',{detail:state}));
          status.textContent=geometry.meshes.length+' components / bodies · '+state.triangles.toLocaleString()+' triangles'+(meta.derived?' · Source version checked':'')+(meta.format==='stl'?' · Units follow STL export':' · mm');
        }catch(error){if(!states.has(state)||loadId!==state.loadId)return;release(state);load.disabled=false;cancel.hidden=true;container.dataset.state='error';status.textContent=error.name==='AbortError'?'Preview loading cancelled.':error.message;}
      };load.addEventListener('click',state.load);
      cancel.addEventListener('click',()=>{state.loadId++;state.modelAbort?.abort();release(state);load.disabled=false;cancel.hidden=true;status.textContent='Preview loading cancelled.';container.dataset.state='idle';});
    }catch(error){if(error.name!=='AbortError'&&states.has(state)){status.textContent=error.message;container.dataset.state='error';}}
    return state;
  }
  function createScene(state,data){
    const container=state.container,stage=container.querySelector('.viewer-stage'),scene=new THREE.Scene(),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});state.scene=scene;state.renderer=renderer;
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setClearColor(document.documentElement.dataset.theme==='dark'?0x161b22:0xf6f8fa);stage.appendChild(renderer.domElement);renderer.domElement.tabIndex=0;
    state.upAxis=state.meta.derived&&/\.sld(?:asm|prt)$/i.test(state.meta.sourcePath)?'y':'z';
    const camera=new THREE.PerspectiveCamera(40,1,0.1,1000000),controls=new OrbitControls(camera,renderer.domElement);camera.up.set(0,0,1);controls.enableDamping=true;state.controls=controls;state.camera=camera;
    scene.add(new THREE.AmbientLight(0xffffff,1.6));const light=new THREE.DirectionalLight(0xffffff,2.4);light.position.set(1,-2,4);scene.add(light);const fill=new THREE.DirectionalLight(0xffffff,1.1);fill.position.set(-3,2,1);scene.add(fill);
    const names=new Map();
    function collectNames(node,parents=[]){const path=[...parents,...(node.name?[node.name]:[])];for(const index of node.meshes||[])names.set(index,path.join(' / '));for(const child of node.children||[])collectNames(child,path);}
    if(data.root)collectNames(data.root);
    const geometryCache=new Map(),model=new THREE.Group();state.model=model;scene.add(model);const objects=[],list=container.querySelector('.viewer-component-list');let triangles=0;
    for(const [index,item] of data.meshes.entries()){
      let geometry=geometryCache.get(item.assetKey);if(!geometry){geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(item.attributes.position.array,3));
      if(item.attributes.normal)geometry.setAttribute('normal',new THREE.BufferAttribute(item.attributes.normal.array,3));
      if(item.index)geometry.setIndex(new THREE.BufferAttribute(item.index.array,1));if(!geometry.attributes.normal)geometry.computeVertexNormals();if(item.assetKey)geometryCache.set(item.assetKey,geometry);}
      const baseColor=item.color?new THREE.Color(...item.color):new THREE.Color(0x9eabc1),materials=[new THREE.MeshStandardMaterial({color:baseColor,roughness:0.55,metalness:0.18,side:THREE.DoubleSide})];
      const count=(geometry.index?.count||geometry.attributes.position.count)/3;triangles+=count;
      if(item.brep_faces?.length){geometry.clearGroups();let cursor=0;for(const face of [...item.brep_faces].sort((a,b)=>a.first-b.first)){if(face.first>cursor)geometry.addGroup(cursor*3,(face.first-cursor)*3,0);let material=0;if(face.color){material=materials.length;materials.push(new THREE.MeshStandardMaterial({color:new THREE.Color(...face.color),roughness:0.55,metalness:0.18,side:THREE.DoubleSide}));}geometry.addGroup(face.first*3,(face.last-face.first+1)*3,material);cursor=face.last+1;}if(cursor<count)geometry.addGroup(cursor*3,(count-cursor)*3,0);}
      const mesh=new THREE.Mesh(geometry,geometry.groups.length?materials:materials[0]),name=names.get(index)||item.name||'Body '+(index+1);mesh.name=name;mesh.userData.componentId=item.componentId;mesh.userData.source=item.source||state.meta.sourcePath;if(item.transform)mesh.applyMatrix4(new THREE.Matrix4().fromArray(item.transform));mesh.userData.originalPosition=mesh.position.clone();mesh.userData.originalColors=materials.map(m=>m.color.clone());model.add(mesh);objects.push(mesh);
      const row=document.createElement('div');row.className='viewer-component-row';const label=document.createElement('label'),checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.checked=true;label.append(checkbox,document.createTextNode(name));checkbox.addEventListener('change',()=>{mesh.visible=checkbox.checked;});const isolate=document.createElement('button');isolate.className='viewer-isolate';isolate.textContent='Only';isolate.setAttribute('aria-label','Isolate '+name);isolate.addEventListener('click',()=>{for(const object of objects)object.visible=object===mesh;list.querySelectorAll('input').forEach((input,i)=>input.checked=objects[i]===mesh);});row.append(label,isolate);list.appendChild(row);
    }
    state.objects=objects;state.triangles=triangles;const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),radius=Math.max(size.x,size.y,size.z,0.001);
    for(const object of objects){object.userData.explode=new THREE.Box3().setFromObject(object).getCenter(new THREE.Vector3()).sub(center);}
    const grid=new THREE.GridHelper(radius*2,12,0x87929e,0xb8c0c9);grid.material.transparent=true;grid.material.opacity=0.22;scene.add(grid);
    const upSelect=container.querySelector('[data-up-axis]');state.setUpAxis=(axis,reset=true)=>{state.upAxis=axis==='y'?'y':'z';upSelect.value=state.upAxis;grid.rotation.set(state.upAxis==='y'?0:Math.PI/2,0,0);grid.position.copy(center);grid.position[state.upAxis]=box.min[state.upAxis]-radius*0.005;if(reset)state.fit?.();};state.setUpAxis(state.upAxis,false);upSelect.addEventListener('change',()=>state.setUpAxis(upSelect.value));
    const fit=(view='iso')=>{
      const bounds=state.compareBounds||new THREE.Box3().setFromObject(model),target=bounds.getCenter(new THREE.Vector3()),sphereRadius=Math.max(bounds.getSize(new THREE.Vector3()).length()/2,0.001);
      const vertical=THREE.MathUtils.degToRad(camera.fov/2),horizontal=Math.atan(Math.tan(vertical)*camera.aspect),fitDistance=sphereRadius/Math.sin(Math.min(vertical,horizontal))*1.1;
      const yUp=state.upAxis==='y',direction=view==='fit'?camera.position.clone().sub(controls.target).normalize():view==='front'?(yUp?new THREE.Vector3(0,0,1):new THREE.Vector3(0,-1,0)):view==='top'?(yUp?new THREE.Vector3(0,1,0):new THREE.Vector3(0,0,1)):view==='right'?new THREE.Vector3(1,0,0):(yUp?new THREE.Vector3(1,0.8,1):new THREE.Vector3(1,-1,0.8)).normalize();
      if(view!=='fit')camera.up.set(0,yUp?1:0,yUp?0:1);if(view==='top')camera.up.set(0,yUp?0:1,yUp?-1:0);
      camera.near=sphereRadius/10000;camera.far=sphereRadius*10000;camera.position.copy(target).addScaledVector(direction,fitDistance);camera.updateProjectionMatrix();controls.target.copy(target);controls.update();
    };state.fit=fit;fit();
    container.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',()=>fit(button.dataset.view)));
    container.querySelector('[data-explode]').disabled=objects.length<2;container.querySelector('[data-explode]').addEventListener('input',event=>{for(const object of objects)object.position.copy(object.userData.originalPosition).addScaledVector(object.userData.explode,Number(event.target.value)/50);});
    container.querySelector('[data-edges]').addEventListener('change',event=>{for(const mesh of objects){if(event.target.checked&&!mesh.userData.edges){const edges=new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry,40),new THREE.LineBasicMaterial({color:0x526176,transparent:true,opacity:0.5}));mesh.add(edges);mesh.userData.edges=edges;}if(mesh.userData.edges)mesh.userData.edges.visible=event.target.checked;}});
    container.querySelector('[data-show-all]').addEventListener('click',()=>{for(const object of objects)object.visible=true;list.querySelectorAll('input').forEach(input=>input.checked=true);});
    container.querySelector('[data-fullscreen]').addEventListener('click',()=>{if(document.fullscreenElement)document.exitFullscreen();else container.requestFullscreen().catch(()=>{});});
    state.resize=()=>{const width=Math.max(1,stage.clientWidth),height=Math.max(1,stage.clientHeight);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();};state.observer=new ResizeObserver(state.resize);state.observer.observe(stage);renderer.setAnimationLoop(()=>{controls.update();renderer.render(scene,camera);});
  }
  function link(left,right,enabled=()=>true){left.controls.enableDamping=false;right.controls.enableDamping=false;let updating=false;const copy=(a,b)=>{if(updating||!enabled()||!states.has(a)||!states.has(b))return;updating=true;if(b.upAxis!==a.upAxis)b.setUpAxis(a.upAxis,false);b.camera.position.copy(a.camera.position);b.camera.up.copy(a.camera.up);b.camera.near=a.camera.near;b.camera.far=a.camera.far;b.camera.fov=a.camera.fov;b.camera.updateProjectionMatrix();b.controls.target.copy(a.controls.target);b.controls.update();updating=false;};left.compareBounds=new THREE.Box3().setFromObject(left.model).union(new THREE.Box3().setFromObject(right.model));right.compareBounds=left.compareBounds;left.fit();copy(left,right);left.controls.addEventListener('change',()=>copy(left,right));right.controls.addEventListener('change',()=>copy(right,left));}
  function highlight(state,changes,side,on=true){const colors={added:0x1a7f37,removed:0xcf222e,modified:0xbf8700,moved:0x0969da,'mesh-changed':0x8250df};const byId=new Map(changes.flatMap(c=>[c.id,c.beforeId,c.afterId].filter(Boolean).map(id=>[id,c.status])));for(const mesh of state.objects||[]){const status=byId.get(mesh.userData.componentId)||byId.get(mesh.userData.source);const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];materials.forEach((m,i)=>m.color.copy(on&&colors[status]?new THREE.Color(colors[status]):mesh.userData.originalColors[i]));}}
  function focusChanges(left,right,changes,enabled){
    const statuses=new Map(changes.flatMap(c=>[c.id||c.path,c.beforeId,c.afterId].filter(Boolean).map(id=>[id,c.status])));
    const changed=mesh=>['added','removed','modified','moved'].includes(statuses.get(mesh.userData.componentId)||statuses.get(mesh.userData.source));
    if(enabled&&![...left.objects,...right.objects].some(changed))return false;
    const bounds=new THREE.Box3();
    for(const state of [left,right]){state.model.updateMatrixWorld(true);for(const mesh of state.objects){mesh.visible=!enabled||changed(mesh);if(mesh.visible){if(!mesh.geometry.boundingBox)mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld));}}
      state.container.querySelectorAll('.viewer-component-list input').forEach((input,index)=>{if(state.objects[index])input.checked=state.objects[index].visible;});
    }
    if(!bounds.isEmpty()){left.compareBounds=bounds;right.compareBounds=bounds;left.fit();right.fit();}
    return true;
  }
  window.GitpolarPreview={mount,dispose,link,highlight,focusChanges};
})();
