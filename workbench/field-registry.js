(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.AtomPromptRegistry=api;})(typeof globalThis==='object'?globalThis:this,function(){
'use strict';
const CLAIM_MODES=['LOGICAL','MATHEMATICAL','EMPIRICAL','HISTORICAL','PHILOSOPHICAL','THEOLOGICAL','BRIDGE','ANALOGY','CONJECTURE'];
const SECTION_PROMPTS={
 identity:{key:'identity',label:'Identity / Lineage',version:'identity-v1',prompt:'Explain identity and lineage without inventing identifiers or granting authority. Application code owns UUIDs.'},
 claims:{key:'claims',label:'Claims',version:'claims-v1',prompt:'Extract the narrowest independently gradable assertion. Preserve scope, quantifiers, boundaries, and source wording; do not strengthen the source.'},
 evidence:{key:'evidence',label:'Evidence',version:'evidence-v1',prompt:'Describe preserved evidence and what alternatives it discriminates between. Do not confuse evidence, proof, or the claim it bears on.'},
 proof:{key:'proof',label:'Proof',version:'proof-v1',prompt:'Capture premises, licensed derivation steps, exact conclusion, assumptions, receipt, and proof boundary.'},
 process:{key:'process',label:'Process / Derivation',version:'process-v1',prompt:'Capture reproducible ordered operations, inputs, outputs, failure modes, and execution receipt without treating a process as proof.'},
 lineage:{key:'lineage',label:'Lineage',version:'lineage-v1',prompt:'Recommend typed relationships using existing authoritative identifiers only. Never invent identity or canon status.'},
 discovery:{key:'discovery',label:'Discovery',version:'discovery-v1',prompt:'Surface important questions, tensions, relationships, and candidate fields that do not honestly fit the current schema. Mark them NO CURRENT FIELD.'},
 other:{key:'other',label:'Other ATOM fields',version:'other-v1',prompt:'Propose only source-grounded values appropriate to the named ATOM field. Leave the field unanswered rather than forcing a fit.'}
};
const SPECIAL={
 fam:{code:'ID001',section:'identity',purpose:'Explain the existing atom-family identity; application code remains authoritative.',question:'Explain how this atom belongs to an existing identity or lineage. Do not create an identifier.',type:'identity explanation'},
 statement:{code:'C001',section:'claims',purpose:'Capture the technical claim at its narrowest defensible scope.',question:'What single technical claim does the preserved source support?',type:'free text'},
 cclass:{code:'C002',section:'claims',purpose:'Classify the mode of the claim without changing its status.',question:'Which claim mode best describes the argumentative job of this claim?',type:'enum',allowedValues:CLAIM_MODES},
 depends:{code:'PR001',section:'process',purpose:'List load-bearing prerequisites in derivation order.',question:'Which existing ATOM@VERSION prerequisites are load-bearing?',type:'list'},
 src_span:{code:'E001',section:'evidence',purpose:'Preserve verifiable source coordinates.',question:'Return only verified source coordinates supporting the proposed value.',type:'source-anchor'},
 raw:{code:'E002',section:'evidence',purpose:'Preserve source wording exactly.',question:'Extract the exact source text without normalization.',type:'source-anchor'},
 e_bridge:{code:'L001',section:'lineage',purpose:'Recommend an existing graph relationship without creating identity.',question:'Which existing atom does this bridge to, and why?',type:'identity explanation'}
};
const inferSection=k=>k==='fam'||k.includes('ver')?'identity':k.startsWith('e_')?'lineage':k.startsWith('pr')||k.startsWith('q')?'process':k.startsWith('p')?'proof':k.includes('src')||k==='raw'?'evidence':'claims';
function stableCode(key,index){let prefix=inferSection(key);prefix={identity:'ID',claims:'C',evidence:'E',proof:'PF',process:'PR',lineage:'L'}[prefix]||'F';let hash=0;for(const c of key)hash=(hash*31+c.charCodeAt(0))%900;return prefix+String(hash+100+index%9).padStart(3,'0');}
function fieldDefinition(key,index=0,label=''){const special=SPECIAL[key];return Object.freeze({key,label:label||key,code:special?.code||stableCode(key,index),section:special?.section||inferSection(key),purpose:special?.purpose||`Propose a source-grounded value for ${label||key}.`,question:special?.question||`What should ${label||key} contain based only on the preserved source?`,type:special?.type||'text',allowedValues:special?.allowedValues||[]});}
function registryFor(keys){return keys.map((x,i)=>fieldDefinition(typeof x==='string'?x:x.key,i,typeof x==='string'?'':x.label));}
return {CLAIM_MODES,SECTION_PROMPTS,SPECIAL,fieldDefinition,registryFor};
});
