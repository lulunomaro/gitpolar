import test from 'node:test';
import assert from 'node:assert/strict';
import {comparisonHref,comparisonFiles,filterComparisonFiles,comparisonTree} from '../viewer/compare-navigation.js';

const assembly='英雄总装.SLDASM',part='底盘/板 + 草稿#1.SLDPRT';
const changes=[{path:part,status:'modified',dependency:true},{path:'旧件/支撑.SLDPRT',status:'removed'},{path:'新件/支撑.SLDPRT',status:'added'},{path:'README.md',status:'modified'},{path:'.gitpolar/previews/scene.json',status:'modified'}];
const baseFiles=[assembly,part,'旧件/支撑.SLDPRT','README.md','.gitpolar/previews/scene.json'].map(path=>({path}));
const headFiles=[assembly,part,'新件/支撑.SLDPRT','README.md','.gitpolar/previews/mesh.stl'].map(path=>({path}));

test('comparison tree keeps removed files and an unchanged selected assembly without marking it modified',()=>{
  const files=comparisonFiles({changes,baseFiles,headFiles,path:assembly});
  assert.equal(files.length,5);assert(files.every(file=>!file.path.startsWith('.gitpolar/')));
  assert.equal(files.find(file=>file.path===assembly).status,'unchanged');
  assert.equal(files.find(file=>file.path==='旧件/支撑.SLDPRT').status,'removed');
  assert.equal(files.find(file=>file.path==='新件/支撑.SLDPRT').status,'added');
  assert.deepEqual(new Set(filterComparisonFiles(files,{selected:assembly}).map(file=>file.path)),new Set([assembly,part,'旧件/支撑.SLDPRT','新件/支撑.SLDPRT','README.md']));
});

test('all-files navigation includes unchanged source files and supports path filtering',()=>{
  const files=comparisonFiles({changes,baseFiles:[...baseFiles,{path:'库/Bearing.SLDPRT'}],headFiles});
  assert(!filterComparisonFiles(files,{}).some(file=>file.path===assembly));
  assert(filterComparisonFiles(files,{mode:'all'}).some(file=>file.path===assembly));
  assert.deepEqual(filterComparisonFiles(files,{mode:'all',query:'库/BEARING'}).map(file=>file.path),['库/Bearing.SLDPRT']);
  assert.deepEqual(filterComparisonFiles(files,{mode:'all',query:'板 + 草稿#1'}).map(file=>file.path),[part]);
});

test('file tree handles a file replaced by a directory across two Git versions',()=>{
  const files=[{path:'模块',status:'removed'},{path:'模块/零件.SLDPRT',status:'added'},{path:'模块/装配/总装.SLDASM',status:'added'}];
  const tree=comparisonTree(files);
  assert.equal(tree.length,2);assert.equal(tree[0].path,'模块');assert(tree[0].children);assert.equal(tree[0].count,2);
  assert.equal(tree[1].file.status,'removed');assert.equal(tree[0].children[0].path,'模块/装配');
  assert.equal(tree[0].children[0].children[0].path,'模块/装配/总装.SLDASM');
});

test('selected unchanged files are available before the complete directory index arrives',()=>{
  const files=comparisonFiles({changes,path:assembly});
  assert.equal(files.find(file=>file.path===assembly).status,'unchanged');
  assert(filterComparisonFiles(files,{selected:assembly}).some(file=>file.path===assembly));
});

test('comparison links preserve both exact versions and Unicode, spaces, plus and fragment characters',()=>{
  const base='feature/底盘',head='a'.repeat(40),target=comparisonHref('hero-2026-mecanum',base,head,part);
  const query=new URLSearchParams(target.slice(target.indexOf('?')+1));
  assert.equal(query.get('base'),base);assert.equal(query.get('head'),head);assert.equal(query.get('path'),part);
  assert(!target.includes('#1.SLDPRT'));
});
