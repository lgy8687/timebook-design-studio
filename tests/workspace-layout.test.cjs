const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const test=require('node:test');
const source=fs.readFileSync(path.join(__dirname,'../unified.html'),'utf8');
const section=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const node=(x,y,width,height,parent=null)=>({x:()=>x,y:()=>y,width:()=>width,height:()=>height,hasName:()=>!parent,parent});
test('fit canvas includes remote boards and nested item coordinates',()=>{
 let scale,position;
 const context=vm.createContext({zoom:.7,stage:{width:()=>800,height:()=>600,scale:v=>scale=v,position:v=>position=v,draw:()=>{}},parentBoard:n=>n.parent,coverBackground:()=>{},positionQuick:()=>{},$:()=>({textContent:''})});
 vm.runInContext(section('function fitNodes(nodes)', '$("fitSelection").onclick'),context);
 context.nodes=[node(-100,50,200,300),node(1800,-100,100,150)];
 vm.runInContext('fitNodes(nodes)',context);
 assert.equal(scale.x,.36);assert.equal(position.x,76);assert.equal(position.y,255);
 const board=node(1000,200,384,832);context.nodes=[node(40,60,100,80,board)];vm.runInContext('fitNodes(nodes)',context);
 assert.equal(scale.x,2);assert.equal(position.x,-1780);assert.equal(position.y,-300);
 context.nodes=[];assert.doesNotThrow(()=>vm.runInContext('fitNodes(nodes)',context));
});
test('left tabs keep assets and layers mutually exclusive',()=>{
 const elements=Object.fromEntries(['tabAssets','panelAssets','tabLayers','panelLayers'].map(id=>[id,{hidden:false,setAttribute(k,v){this[k]=v}}]));const context=vm.createContext({$:id=>elements[id]});vm.runInContext(section('function showLeftPanel(name)', '$("tabAssets").onclick'),context);
 context.name='panelLayers';vm.runInContext('showLeftPanel(name)',context);assert.equal(elements.panelAssets.hidden,true);assert.equal(elements.panelLayers.hidden,false);assert.equal(elements.tabLayers['aria-selected'],'true');
 context.name='panelAssets';vm.runInContext('showLeftPanel(name)',context);assert.equal(elements.panelAssets.hidden,false);assert.equal(elements.panelLayers.hidden,true);
});

test('fit canvas uses transformed visual bounds when available',()=>{
 let scale,position;
 const context=vm.createContext({zoom:.7,layer:{},stage:{width:()=>800,height:()=>600,scale:v=>scale=v,position:v=>position=v,draw:()=>{}},coverBackground:()=>{},positionQuick:()=>{},$:()=>({textContent:''})});
 vm.runInContext(section('function fitNodes(nodes)', '$("fitSelection").onclick'),context);
 context.nodes=[{getClientRect:()=>({x:100,y:200,width:400,height:100})}];
 vm.runInContext('fitNodes(nodes)',context);
 assert.equal(scale.x,1.8);assert.equal(position.x,-140);assert.equal(position.y,-150);
});

test('OCR cleanup failure always releases the analyze button',async()=>{
 const button={disabled:true};const context=vm.createContext({agentBusy:true,$:()=>button,console:{warn:()=>{}}});
 vm.runInContext(section('async function finishOcr(worker)', 'function serialize()'),context);
 context.worker={terminate:async()=>{throw Error('worker already stopped');}};
 await vm.runInContext('finishOcr(worker)',context);
 assert.equal(context.agentBusy,false);assert.equal(button.disabled,false);
});

