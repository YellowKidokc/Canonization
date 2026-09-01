(function () {
  "use strict";
  const STATUS = "CANDIDATE_DRAFT  NOT ADMITTED";
  const allowedStates = ["Candidate", "Frozen", "Reviewed", "Voted", "Rejected", "Superseded"];
  const key = "canonization.local-draft.v1";
  let governed = null;
  let draft = null;
  const byId = (id) => document.getElementById(id);
  const clone = (value) => JSON.parse(JSON.stringify(value));
  const download = (name, text) => { const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([text],{type:"application/json"})); a.download=name; a.click(); URL.revokeObjectURL(a.href); };
  function validate(value) {
    const errors=[];
    if (!value || typeof value !== "object") errors.push("Record must be an object.");
    if (value?.schemaVersion !== "1.0.0") errors.push("schemaVersion must be 1.0.0.");
    if (value?.statusLabel !== STATUS) errors.push(`statusLabel must remain ${STATUS}.`);
    if (!value?.recordId || !value?.source?.contentHash) errors.push("recordId and source.contentHash are required.");
    if (!value?.protectedBlindDiscovery?.immutable) errors.push("Protected blind discovery must be immutable.");
    if (!allowedStates.includes(value?.workflowState)) errors.push("This workbench cannot create Admitted state.");
    if (value?.admissionEventReference !== null) errors.push("Candidate/review exports cannot carry an admission event.");
    return errors;
  }
  function render() {
    byId("record").value=JSON.stringify(draft,null,2);
    byId("state").value=draft?.workflowState ?? "Candidate";
    byId("summary").value=String(draft?.summary ?? "");
    byId("status").textContent=`${draft?.workflowState ?? "No record"} · ${STATUS}`;
    byId("fields").textContent=draft ? JSON.stringify(draft,null,2) : "Import a governed JSON record.";
  }
  function applyPermittedFields() {
    if (!draft) return;
    draft.workflowState=byId("state").value; draft.summary=byId("summary").value;
    draft.statusLabel=STATUS; draft.admissionEventReference=null;
    draft.updated={at:new Date().toISOString(),by:"html-workbench"};
    draft.protectedBlindDiscovery=clone(governed.protectedBlindDiscovery);
  }
  function save() { applyPermittedFields(); const errors=validate(draft); if(errors.length) return alert(errors.join("\n")); localStorage.setItem(key,JSON.stringify({savedAt:new Date().toISOString(),baseHash:governed.source.contentHash,record:draft})); render(); }
  byId("save").onclick=save;
  byId("export").onclick=()=>{ save(); if(draft) download(`${draft.recordId}.reviewed.json`,JSON.stringify(draft,null,2)); };
  byId("reset").onclick=()=>{ if(!governed)return; draft=clone(governed); localStorage.removeItem(key); render(); };
  byId("import").onchange=async(event)=>{ const file=event.target.files[0]; if(!file)return; const value=JSON.parse(await file.text()); const errors=validate(value); if(errors.length)return alert(errors.join("\n")); governed=clone(value); const cached=JSON.parse(localStorage.getItem(key)||"null"); draft=cached?.record?.recordId===value.recordId?cached.record:clone(value); render(); };
  const cached=JSON.parse(localStorage.getItem(key)||"null"); if(cached?.record){ governed=clone(cached.record); draft=cached.record; render(); }
}());
