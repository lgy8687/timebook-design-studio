const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../unified.html'), 'utf8');
function section(start, end) { return source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))); }

test('OCR text parameters round-trip through the actual export and import functions', () => {
    const attrs = {type:'text',itemName:'识别文字',x:25,y:40,width:180,height:36,label:'你好',ocrText:true,fill:'transparent',stroke:'transparent',color:'#273d4c',fontSize:18,radius:0,borderWidth:0};
    const node = {getAttrs:()=>attrs,hasName:()=>false,x:()=>attrs.x,y:()=>attrs.y,width:()=>attrs.width,height:()=>attrs.height,scaleX:()=>1,scaleY:()=>1};
    const context = vm.createContext({node,types:{text:'文字'},parentBoard:()=>null,defaults:{text:{width:180,height:36}},window:{TIMEBOOK_ICONS:{}}});
    vm.runInContext(section('function summaryData(n)', 'const comparison ='),context);
    vm.runInContext(section('const map = {', 'const parsed = data.map'),context);
    const result = vm.runInContext('parse(summaryData(node))',context);
    for (const prop of ['x','y','width','height','label','ocrText','fill','stroke','fontSize','borderWidth']) assert.equal(result[prop],attrs[prop],prop);
    assert.equal(vm.runInContext('parse({类型:"文字"}).ocrText',context),false);
    assert.throws(()=>vm.runInContext('parse({类型:"文字",背景:"invalid"})',context),/颜色/);
});

test('region selection maps interior and out-of-bounds points to image pixels', () => {
    const code=section('function point(e)', 'function update(e)');
    const point=new Function('preview','image',code+'return point;')({getBoundingClientRect:()=>({left:10,top:20,width:200,height:400})},{width:1000,height:2000});
    assert.deepEqual(point({clientX:60,clientY:120}),{x:250,y:500});
    assert.deepEqual(point({clientX:-5,clientY:900}),{x:0,y:2000});
});

test('all inline JavaScript compiles', () => {
    const scripts=[...source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)].map(m=>m[1]).filter(s=>s.trim());
    assert.ok(scripts.length);
    for(const code of scripts) new vm.Script(code);
});

test('reference images participate in Konva hit detection after redraw', () => {
    const Konva=require('../vendor/konva/konva.min.js');
    const context=vm.createContext({Konva,Image:class {},window:{}});
    vm.runInContext(section('function drawItem(g)', 'function addItem(b, d)'),context);
    const group=new Konva.Group({type:'image',width:100,height:200,imageData:'data:image/png;base64,'});
    context.group=group;
    vm.runInContext('drawItem(group)',context);
    assert.equal(group.getChildren().length,1);
    assert.equal(group.getChildren()[0].isListening(),true);
    group.destroy();
});
