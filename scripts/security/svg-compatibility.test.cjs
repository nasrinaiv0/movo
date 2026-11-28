'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {resolve}=require('node:path');
const app=createRequire(resolve(process.cwd(),'package.json'));
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><style>circle:nth-child(2){fill:red}</style><circle cx="4" cy="4" r="2"/><circle cx="8" cy="8" r="3"/></svg>';
test('actual installed SVG stack preserves viewBox and handles nth-child selector',async()=>{
 const webpack=app.resolve('@svgr/webpack');const plugin=createRequire(webpack).resolve('@svgr/plugin-svgo');const svgo=createRequire(plugin)('svgo');
 const result=typeof svgo.optimize==='function'?await svgo.optimize(svg,{plugins:[]}):await new svgo({plugins:[]}).optimize(svg);assert.match(result.data,/viewBox/);
 const svgoRequire=createRequire(createRequire(plugin).resolve('svgo'));const css=svgoRequire('css-select');assert.equal(typeof css.compile(':nth-child(2)'),'function');
 const core=createRequire(webpack)('@svgr/core');const transform=core.transform||core.default||core;const out=await transform(svg,{svgo:false},{componentName:'SyntheticIcon'});assert.match(out,/viewBox/);assert.match(out,/SyntheticIcon/);
});
