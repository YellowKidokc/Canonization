import { App, normalizePath, TFile, TFolder } from "obsidian";
import { createCandidateRecord } from "../engine/record-service";
import { projectMarkdown } from "../projections/markdown/project";
import { assertCanonizationRecord } from "../schema/validator";
import { CanonizationRecord } from "../schema/types";

const ROOT = "Canonization";
async function sha256(value: string): Promise<string> { const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return `sha256:${Array.from(new Uint8Array(bytes)).map((x)=>x.toString(16).padStart(2,"0")).join("")}`; }
async function ensureFolder(app: App, path: string): Promise<void> { const parts=normalizePath(path).split("/"); let current=""; for(const part of parts){ current=current?`${current}/${part}`:part; if(!app.vault.getAbstractFileByPath(current)) await app.vault.createFolder(current); } }
export class CanonizationClient {
  constructor(private readonly app: App) {}
  async canonizeFile(file: TFile, stages: string[] = ["discovery","classification","reconciliation"]): Promise<CanonizationRecord> {
    const content=await this.app.vault.cachedRead(file); const hash=await sha256(content); const now=new Date().toISOString();
    const record=createCandidateRecord({sourceId:file.path,sourceHash:hash,coordinates:{vaultPath:file.path,mtime:file.stat.mtime},actor:"semantic-ai",blindResult:{stage:"discovery",stages,sourceContentHash:hash,objects:[],open:["AI stage results pending or imported separately"]},now});
    record.source.title=file.basename; record.source.uri=`obsidian://open?file=${encodeURIComponent(file.path)}`; record.provenance.push({event:"candidate-created",at:now,client:"semantic-ai",sourceModified:false,admissionPerformed:false});
    await this.writeRecord(record); return record;
  }
  async canonizeFolder(folder: TFolder, stages?: string[]): Promise<CanonizationRecord[]> { const prefix=folder.path?`${folder.path}/`:""; const files=this.app.vault.getMarkdownFiles().filter((file)=>file.path.startsWith(prefix)); const records:CanonizationRecord[]=[]; for(const file of files) records.push(await this.canonizeFile(file,stages)); return records; }
  async writeRecord(record: CanonizationRecord): Promise<void> { assertCanonizationRecord(record); if(record.workflowState==="Admitted") throw new Error("Semantic AI cannot write admitted records"); await ensureFolder(this.app,`${ROOT}/records`); await ensureFolder(this.app,`${ROOT}/candidates`); const jsonPath=normalizePath(`${ROOT}/records/${record.recordId}.json`); const markdownPath=normalizePath(`${ROOT}/candidates/${record.recordId}.md`); const json=JSON.stringify(record,null,2)+"\n"; const markdown=projectMarkdown(record,jsonPath,"../../web/workbench.html"); await this.upsert(jsonPath,json); await this.upsert(markdownPath,markdown); }
  async importReviewed(file: TFile): Promise<CanonizationRecord> { const parsed:unknown=JSON.parse(await this.app.vault.read(file)); assertCanonizationRecord(parsed); if(parsed.workflowState==="Admitted" || parsed.admissionEventReference) throw new Error("Import refused: reviewed JSON cannot perform admission"); await this.writeRecord(parsed); return parsed; }
  async refreshFromJson(file: TFile): Promise<void> { const record=await this.importReviewed(file); await this.writeRecord(record); }
  private async upsert(path:string,content:string):Promise<void>{ const existing=this.app.vault.getAbstractFileByPath(path); if(existing instanceof TFile) await this.app.vault.process(existing,()=>content); else await this.app.vault.create(path,content); }
}
