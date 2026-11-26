import { STLLoader } from 'three/addons/loaders/STLLoader.js';
(function(){
  let occtPromise;
  self.onmessage=async event=>{
    try {
      const {format,bytes}=event.data;let result;
      if(format==='stl'){
        const geometry=new STLLoader().parse(bytes);
        if(!geometry.attributes.position?.count)throw new Error('STL contains no renderable geometry.');
        result={root:{name:'STL',meshes:[0],children:[]},meshes:[{name:'STL model',attributes:{position:{array:geometry.attributes.position.array},normal:{array:geometry.attributes.normal.array}},index:null}]};
      }else{
        if(!occtPromise){importScripts('/cad-vendor/occt-import-js.js');occtPromise=occtimportjs({locateFile:name=>'/cad-vendor/'+name,print:()=>{},printErr:()=>{}});}
        const occt=await occtPromise;
        result=occt.ReadStepFile(new Uint8Array(bytes),{linearUnit:'millimeter',linearDeflectionType:'bounding_box_ratio',linearDeflection:0.001,angularDeflection:0.5});
        if(!result.success||!result.meshes?.length)throw new Error('STEP contains no renderable geometry. Check that its referenced geometry is included.');
      }
      const buffers=[];
      for(const mesh of result.meshes){
        mesh.attributes.position.array=new Float32Array(mesh.attributes.position.array);buffers.push(mesh.attributes.position.array.buffer);
        if(mesh.attributes.normal){mesh.attributes.normal.array=new Float32Array(mesh.attributes.normal.array);buffers.push(mesh.attributes.normal.array.buffer);}
        if(mesh.index){mesh.index.array=new Uint32Array(mesh.index.array);buffers.push(mesh.index.array.buffer);}
      }
      self.postMessage({ok:true,root:result.root,meshes:result.meshes},buffers);
    }catch(error){self.postMessage({ok:false,error:error.message||'Cannot parse this CAD model.'});}
  };
})();
