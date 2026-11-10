import test from 'node:test';
import assert from 'node:assert/strict';
import { activeSummaries, readSummaries, localOrigin } from '../summaries.js';
import { predictionInput, DEFAULTS, PredictionRuntime } from '../core.js';

test('exact identity, active ancestors and duplicate summaries', () => {
 const detail={id:'s',blockDetails:[{blockId:'a',active:true,summary:'old'}, {blockId:'b',active:false,summary:'inactive'}, {blockId:'c',active:true,summary:'new',directBlockIds:['a','b']},{blockId:'d',active:true,summary:'new'}]};
 assert.deepEqual(activeSummaries(detail,'s'),['new']);
 assert.throws(()=>activeSummaries(detail,'other'));
});
test('only loopback HTTP origins accepted',()=>{
 for(const url of ['https://127.0.0.1','http://example.com','http://127.0.0.1/path','http://user@localhost','http://localhost?x=1']) assert.throws(()=>localOrigin(url));
 assert.equal(localOrigin('http://127.0.0.1:1234'),'http://127.0.0.1:1234');
});
test('discovery uses exact escaped session and only summary field',async()=>{
 let request;
 const result=await readSummaries('s/a',DEFAULTS,undefined,{readFile:async()=> JSON.stringify({origin:'http://127.0.0.1:1234',launchToken:'not-used'}),fetch:async(url,options)=>{request={url,options};return Response.json({id:'s/a',directMessages:['secret'],blockDetails:[{active:true,blockId:'b',summary:'summary'}]});}});
 assert.deepEqual(result,['summary']); assert.match(request.url,/s%2Fa\/detail$/); assert.equal(request.options.redirect,'error');
});
test('wrong identity, missing server and oversized response fall back',async()=>{
 for(const response of [Response.json({id:'other',blockDetails:[]}),new Response('',{status:404}),new Response('x',{headers:{'content-length':'2097153'}}),new Response('x'.repeat(2097153))]) {
 assert.deepEqual(await readSummaries('s',{...DEFAULTS,summaryOrigin:'http://localhost'},undefined,{fetch:async()=>response}),[]);
 }
});
test('serialized budget includes escaping and recent messages retain priority',()=>{
 const messages=[{role:'user',text:'"\\\n😀'.repeat(5000)},{role:'assistant',text:'LATEST'}];
 const text=predictionInput(messages,['old'.repeat(10000)],DEFAULTS);
 assert.ok(text.length<=16000); const data=JSON.parse(text);assert.equal(data.conversation.at(-1).text,'LATEST');assert.ok(data.historicalSummaries.join('').length<=4000);
 const normal=JSON.parse(predictionInput([{role:'user',text:'x'.repeat(12000)}],['y'.repeat(8000)],DEFAULTS));
 assert.equal(normal.conversation[0].text.length,12000);assert.ok(normal.historicalSummaries[0].length>3800);
});
test('status/busy/cache never read summaries; route change during read prevents model',async()=>{
 let reads=0,calls=0,release;let model='m';let ready=false;
 const runtime=new PredictionRuntime({readState:()=>({messages:[{role:'user',text:'hello'}],view:{revision:1,ready}}),selection:()=>({provider:'p',model}),readSummaries:async()=>{reads++;await new Promise(r=>release=r);return ['old'];},llm:{prepareCall:async()=>{calls++;throw Error('must not call');}}});
 const session={id:'s'};await runtime.operate(session,{action:'status'});await runtime.operate(session,{action:'generate'});assert.equal(reads,0);
 ready=true;const pending=runtime.operate(session,{action:'generate'});model='changed';release();assert.equal((await pending).status,'stale');assert.equal(calls,0);
 runtime.cache.set(session,{revision:1,model:'p/changed',suggestions:[],time:Date.now()});await runtime.operate(session,{action:'generate'});assert.equal(reads,1);
});

test('disabled summaries do not discover or fetch; rejected streams are cancelled',async()=>{
 let calls=0,cancelled=0;
 assert.deepEqual(await readSummaries('s',{summaryChars:0},undefined,{readFile:async()=>{calls++;},fetch:async()=>{calls++;}}),[]);assert.equal(calls,0);
 const response=new Response(new ReadableStream({cancel(){cancelled++;}}),{status:404});
 await readSummaries('s',{...DEFAULTS,summaryOrigin:'http://localhost'},undefined,{fetch:async()=>response});assert.equal(cancelled,1);
});
test('abort and timeout signals are passed to HTTP and fail back',async()=>{
 const controller=new AbortController();controller.abort();
 let captured;
 const result=await readSummaries('s',{...DEFAULTS,summaryOrigin:'http://localhost'},controller.signal,{fetch:async(_url,{signal})=>{captured=signal;signal.throwIfAborted();}});
 assert.deepEqual(result,[]);assert.equal(captured.aborted,true);
});
test('invalid hierarchy shapes and duplicate IDs are rejected',()=>{
 assert.throws(()=>activeSummaries({id:'s',blockDetails:[{blockId:'b',active:true,directBlockIds:'bad'}]},'s'));
 assert.throws(()=>activeSummaries({id:'s',blockDetails:[{blockId:'b',active:true},{blockId:'b',active:true}]},'s'));
});

test('actual model stream receives bounded serialized summary input',async()=>{
 let received;
 const runtime=new PredictionRuntime({readState:()=>({messages:[{role:'user',text:'latest'.repeat(2000)}],view:{revision:1,ready:true}}),selection:()=>({provider:'p',model:'m'}),readSummaries:async()=>['history'.repeat(3000)],llm:{prepareCall:async()=>({config:{},async *stream(options){received=options.messages[0].content[0].text;yield {type:'text-delta',text:'{"suggestions":[]}'};yield {type:'finish',reason:{kind:'stop'}};}})}});
 await runtime.operate({id:'s'},{action:'generate'});
 assert.ok(received.length<=16000);const parsed=JSON.parse(received);assert.equal(parsed.conversation[0].text.length,12000);assert.ok(parsed.historicalSummaries.length);
});
test('summary timeout fails back without a model call',async()=>{
 const keepAlive=setTimeout(()=>{},1800);
 try {
 const result=await readSummaries('s',{...DEFAULTS,summaryOrigin:'http://localhost'},undefined,{fetch:async(_u,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 assert.deepEqual(result,[]);
 } finally {clearTimeout(keepAlive);}
});
