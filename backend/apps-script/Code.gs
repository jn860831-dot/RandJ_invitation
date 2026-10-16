const RSVP_FORM_ID = '1cAbKdvyxApFYm4syGAYSD2U6QIC3EOqp9tnpaRItIpc';
const RSVP_ORIGINS = ['https://jn860831-dot.github.io', 'http://localhost:8000', 'http://127.0.0.1:8000','https://randj-rsvp-test-20261016.quirkyflea1024.chatgpt.site'];
const RSVP_FIELDS = [
['entry.47567131',559010565,'TEXT',true],['entry.817650951',1986749434,'TEXT',true],['entry.702656616',1000670115,'TEXT',true],
['entry.1167794548',667159756,'MULTIPLE_CHOICE',true],['entry.1274159287',2135515430,'PARAGRAPH_TEXT',true],['entry.1865481609',661441018,'MULTIPLE_CHOICE',true],
['entry.1355534598',1911471563,'LIST',true],['entry.1321594175',1697522376,'MULTIPLE_CHOICE',true],['entry.789501486',1386900411,'LIST',true],
['entry.1361480921',9012301,'MULTIPLE_CHOICE',true],['entry.1352188447',1866987749,'MULTIPLE_CHOICE',true],['entry.1105773361',869853503,'TEXT',false],['entry.65394930',1605731225,'PARAGRAPH_TEXT',false]
];
function authorizeRsvp() { return FormApp.openById(RSVP_FORM_ID).getTitle(); }
function doPost(e) {
const p = e && e.parameter || {};
const origin = String(p.origin || '');
if (RSVP_ORIGINS.indexOf(origin) < 0) return HtmlService.createHtmlOutput('Origin not allowed');
const requestId = String(p.requestId || ''), nonce = String(p.nonce || '');
const result = {type:'randj-rsvp-result',requestId:requestId,nonce:nonce,ok:false,code:'rejected'};
let lock, reserved = false;
try {
if (!/^[a-f0-9-]{36}$/.test(requestId) || !/^[a-f0-9-]{36}$/.test(nonce)) throw new Error('invalid request');
if (!p.payload || p.payload.length > 18000) throw new Error('invalid payload');
const values = JSON.parse(p.payload);
if (!values || Array.isArray(values) || typeof values !== 'object') throw new Error('invalid values');
const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,p.payload));
lock = LockService.getScriptLock();
if (!lock.tryLock(15000)) { result.code='busy'; return rsvpReply_(result,origin); }
const props=PropertiesService.getScriptProperties(),key='rsvp:'+requestId;
const previous=props.getProperty(key);
if (previous) {
const stored=JSON.parse(previous);
if (stored.digest !== digest) throw new Error('request conflict');
if (stored.state === 'done') { result.ok=true; result.code='saved'; } else result.code='uncertain';
return rsvpReply_(result,origin);
}
const form=FormApp.openById(RSVP_FORM_ID);
if (!form.isAcceptingResponses()) throw new Error('form closed');
let response=form.createResponse();
const knownIds=RSVP_FIELDS.map(function(f){return f[1];});
form.getItems().forEach(function(item){
const type=String(item.getType());
const cast={TEXT:'asTextItem',PARAGRAPH_TEXT:'asParagraphTextItem',MULTIPLE_CHOICE:'asMultipleChoiceItem',LIST:'asListItem',CHECKBOX:'asCheckboxItem',DATE:'asDateItem',DATETIME:'asDateTimeItem',TIME:'asTimeItem',DURATION:'asDurationItem',SCALE:'asScaleItem',GRID:'asGridItem',CHECKBOX_GRID:'asCheckboxGridItem'};
if (knownIds.indexOf(item.getId())<0 && cast[type] && item[cast[type]]().isRequired()) throw new Error('unmapped required item');
});
RSVP_FIELDS.forEach(function(field){
const value=values[field[0]];
if (typeof value !== 'string' || value.length>3000 || (field[3] && !value.trim())) throw new Error('invalid field');
const item=form.getItemById(field[1]);
if (!item || String(item.getType()) !== field[2]) throw new Error('schema changed');
const methods={TEXT:'asTextItem',PARAGRAPH_TEXT:'asParagraphTextItem',MULTIPLE_CHOICE:'asMultipleChoiceItem',LIST:'asListItem'};
const typed=item[methods[field[2]]]();
if (typed.isRequired() && !value.trim()) throw new Error('required field');
if (field[2] === 'LIST' || field[2] === 'MULTIPLE_CHOICE') {
if (typed.getChoices().map(function(c){return c.getValue();}).indexOf(value)<0) throw new Error('invalid choice');
}
if (value) response.withItemResponse(typed.createResponse(value));
});
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values['entry.702656616'])) throw new Error('invalid email');
if (values['entry.1352188447'] === '我要我要！請寄給我' && !values['entry.1105773361'].trim()) throw new Error('address required');
props.setProperty(key,JSON.stringify({state:'pending',digest:digest}));
reserved=true;
const saved=response.submit(),id=saved.getId();
if (!id || !form.getResponse(id).getId()) throw new Error('not confirmed');
props.setProperty(key,JSON.stringify({state:'done',digest:digest}));
result.ok=true;result.code='saved';
} catch (_) { result.code=reserved?'uncertain':'rejected'; }
finally { if (lock && lock.hasLock()) lock.releaseLock(); }
return rsvpReply_(result,origin);
}
function rsvpReply_(result,origin) {
const data=JSON.stringify(result).replace(/</g,String.fromCharCode(92)+'u003c');
return HtmlService.createHtmlOutput('<!doctype html><script>window.top.postMessage('+data+','+JSON.stringify(origin)+');</script>').setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
