# CAD 预览依赖

- Three.js 0.187.0，MIT。来源：https://github.com/mrdoob/three.js/tree/r187
- occt-import-js 0.0.23，包中提供 LGPL 2.1 文本。JS/WASM 原样复制到 public/cad-vendor，独立加载，可替换构建。
- occt-import-js 对应 npm 源包：https://registry.npmjs.org/occt-import-js/-/occt-import-js-0.0.23.tgz
- 上游源码、OCCT 子模块与构建说明：https://github.com/kovacsv/occt-import-js

完整许可文本随 THIRD_PARTY_NOTICES.md、public/LICENSE.three.txt 与 public/cad-vendor/LICENSE.occt-import-js.txt 提供。自己的查看器源码在 viewer/，构建脚本在 scripts/build-viewer.mjs。

浏览器验证用模型来自安装包的 test/testfiles：simple-basic-cube/cube.stp、cube-10x10mm/Cube 10x10.stl、cax-if/as1_pe_203.stp。来源说明保存在对应依赖的 source.txt，分别指向 GrabCAD 简单立方体与 CAX-IF STEP 测试库。它们用于验证解析和渲染，不是用户机器人装配。
