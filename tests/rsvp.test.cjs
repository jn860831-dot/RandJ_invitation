const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const crypto = require('node:crypto');
const backend = fs.readFileSync('backend/apps-script/Code.gs', 'utf8');
const choices = {
  'entry.1167794548':['新郎的家人／親友','新娘的家人／親友','大學同學/朋友','研究所同學/朋友','高中同學/朋友','教會朋友','其他'],
  'entry.1865481609':['會','不會'],
  'entry.1321594175':['一定到！','不克參加，獻上我的祝福～～'],
  'entry.1355534598':['我的祝福會到','1 位','2 位','3 位','4 位','5 位以上（我會聯絡你！）'],
  'entry.789501486':['我的祝福會到','1 位','2 位','3 位','4 位','5 位以上（我會聯絡你！）'],
  'entry.1361480921':['葷食','素食'],
  'entry.1352188447':['我要我要！請寄給我','電子的就好，謝謝～']
};
let submissions = 0, failSubmit = false, failRead = false, closed = false;
const properties = new Map();
const context = vm.createContext({
  Utilities:{DigestAlgorithm:{SHA_256:'sha256'},computeDigest:(_,v)=>crypto.createHash('sha256').update(v).digest(),base64EncodeWebSafe:v=>Buffer.from(v).toString('base64url')},
  LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock(){}})},
  PropertiesService:{getScriptProperties:()=>({getProperty:k=>properties.get(k),setProperty:(k,v)=>properties.set(k,v)})},
  HtmlService:{XFrameOptionsMode:{ALLOWALL:1},createHtmlOutput:html=>({html,setXFrameOptionsMode(){return this;}})},
  FormApp:{openById:()=>form}
});
vm.runInContext(backend,context);
const fields = vm.runInContext('RSVP_FIELDS', context);
const items = fields.map(([entry,id,type,required])=>{
  const typed = {isRequired:()=>required,getChoices:()=>choices[entry].map(v=>({getValue:()=>v})),createResponse:value=>({entry,value})};
  return {getId:()=>id,getType:()=>type,asTextItem:()=>typed,asParagraphTextItem:()=>typed,asMultipleChoiceItem:()=>typed,asListItem:()=>typed};
});
const form = {
  isAcceptingResponses:()=>!closed,getItems:()=>items,getItemById:id=>items.find(i=>i.getId()===id),
  createResponse:()=>({withItemResponse(){return this;},submit(){submissions++;if(failSubmit)throw Error('interrupted');return {getId:()=> 'saved-id'};}}),
  getResponse:()=>{if(failRead)throw Error('read unavailable');return {getId:()=> 'saved-id'};}
};
const values = Object.fromEntries(fields.map(([entry])=>[entry, choices[entry]?.[0] || 'RSVP 測試']));
values['entry.702656616']='rsvp-test@example.com';
function request(v=values,id=crypto.randomUUID()) {
  const output=context.doPost({parameter:{origin:'http://localhost:8000',requestId:id,nonce:crypto.randomUUID(),payload:JSON.stringify(v)}}).html;
  return JSON.parse(output.match(/postMessage\((.*),"http/)[1]);
}
const id=crypto.randomUUID();
assert.equal(request(values,id).ok,true);
assert.equal(request(values,id).ok,true);
assert.equal(submissions,1,'same request is acknowledged without another write');
assert.equal(request({...values,'entry.47567131':'changed'},id).ok,false);
assert.equal(submissions,1);
assert.equal(request({...values,'entry.1167794548':'新郎的家人/親友'}).code,'rejected');
assert.equal(request({...values,'entry.1274159287':''}).code,'rejected');
assert.equal(request({...values,'entry.1105773361':''}).code,'rejected');
closed=true;assert.equal(request().code,'rejected');closed=false;
failRead=true;
const uncertainId=crypto.randomUUID();
assert.equal(request(values,uncertainId).code,'uncertain');
failRead=false;
const count=submissions;
assert.equal(request(values,uncertainId).code,'uncertain');
assert.equal(submissions,count,'unconfirmed write must not be repeated');
for(const relation of choices['entry.1167794548']) assert.equal(request({...values,'entry.1167794548':relation}).ok,true);
console.log('Backend: confirmed save, idempotency, request conflict, invalid choice, required fields, closed form, interrupted confirmation, and all relationships passed.');

const frontend=fs.readFileSync('js/script.js','utf8');
function browserHarness(configured=true) {
  const listeners={}, winListeners={}, timers=[];
  const memory=new Map();
  const node=()=>({value:'',hidden:false,innerHTML:'送出',children:[],addEventListener(type,fn){this.listeners??={};this.listeners[type]=fn;},append(...v){this.children.push(...v);},remove(){this.removed=true;},focus(){this.focused=true;},submit(){this.submitted=true;}});
  const form=node(), status=node(), success=node(), button=node();
  success.hidden=true;
  const fields={name:'RSVP 測試',phone:'0900000000',email:'rsvp-test@example.com',relationship:'大學同學/朋友',otherRelationship:'',ceremony:'yes',banquet:'no',ceremonyGuests:'1',banquetGuests:'0',diet:'葷食',paperInvitation:'digital',invitationAddress:'',message:'test'};
  const controls=Object.entries(fields).map(([name,value])=>({...node(),name,value,type:'text'}));
  controls.paperInvitation=controls.find(c=>c.name==='paperInvitation');
  form.elements=controls;form.reportValidity=()=>true;form.querySelector=()=>button;
  const ids={'rsvp-form':form,'form-status':status,'rsvp-success':success,'relationship':controls.find(c=>c.name==='relationship'),'other-relationship-field':node(),'other-relationship':controls.find(c=>c.name==='otherRelationship'),'invitation-address-field':node(),'invitation-address':controls.find(c=>c.name==='invitationAddress')};
  const body=node();
  const window={setInterval(){},addEventListener:(t,fn)=>winListeners[t]=fn,removeEventListener:t=>delete winListeners[t]};
  const ctx=vm.createContext({document:{getElementById:id=>ids[id]||null,querySelectorAll:()=>[],createElement:()=>node(),body},window,IntersectionObserver:class{observe(){}},localStorage:{getItem:k=>memory.get(k)||null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)},FormData:class{constructor(f){this.f=f;}get(k){return this.f.elements.find(e=>e.name===k)?.value;}},URLSearchParams,URL,crypto,location:{origin:'http://localhost:8000'},setTimeout:fn=>{timers.push(fn);return 1;},clearTimeout(){}});
  vm.runInContext(frontend.replace(/const RSVP_ENDPOINT = '[^']*';/,configured?"const RSVP_ENDPOINT = 'https://script.google.com/macros/s/test/exec';":"const RSVP_ENDPOINT = '';"),ctx);
  return {form,status,success,button,memory,body,timers,winListeners,async send(){await form.listeners.submit({preventDefault(){}});},reply(data={},origin='https://script.googleusercontent.com'){
    const transport=body.children.findLast(n=>n.method==='POST');
    const vals=Object.fromEntries(transport.children.map(i=>[i.name,i.value]));
    winListeners.message?.({origin,data:{type:'randj-rsvp-result',requestId:vals.requestId,nonce:vals.nonce,...data}});
  }};
}
(async()=>{
  let h=browserHarness(false);await h.send();assert.equal(h.body.children.length,0);assert.equal(h.success.hidden,true);
  h=browserHarness();await h.send();
  const posted=Object.fromEntries(h.body.children[1].children.map(n=>[n.name,n.value]));
  assert.equal(request(JSON.parse(posted.payload)).ok,true,'actual frontend mapping must pass current Google choice fixture');
  assert.equal(h.success.hidden,true);assert.equal(h.button.disabled,true);
  assert.notEqual(h.body.children[1].target,'_blank','submissions never open a new tab');
  h.reply({ok:true,code:'saved'},'https://evil.example');assert.equal(h.success.hidden,true);
  h.reply({ok:true,code:'saved',nonce:'wrong'});assert.equal(h.success.hidden,true);
  h.reply({ok:true,code:'saved'});assert.equal(h.success.hidden,false);assert.equal(h.form.hidden,true);assert.equal(h.memory.has('randj-rsvp-draft-v1'),false);
  h=browserHarness();await h.send();h.reply({ok:false,code:'rejected'});assert.equal(h.success.hidden,true);assert.equal(h.form.hidden,false);assert.equal(h.memory.has('randj-rsvp-draft-v1'),true);
  h=browserHarness();await h.send();h.timers[0]();assert.equal(h.success.hidden,true);assert.equal(h.button.disabled,false);assert.equal(h.memory.has('randj-rsvp-pending-v2'),true);
  const firstId=JSON.parse(h.memory.get('randj-rsvp-pending-v2')).requestId;await h.send();assert.equal(JSON.parse(h.memory.get('randj-rsvp-pending-v2')).requestId,firstId);
  console.log('Frontend: no popup, unconfigured service, spoofed origin/nonce, confirmed success, rejected save, timeout preservation, and same-ID retry passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
