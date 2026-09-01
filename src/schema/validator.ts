import Ajv2020 from "ajv/dist/2020";
import { ErrorObject } from "ajv";
import addFormats from "ajv-formats";
import schema from "../../schemas/canonization-record.schema.json";
import { CanonizationRecord } from "./types";
const ajv = new Ajv2020({ allErrors: true, strict: false }); addFormats(ajv); const validateRecord = ajv.compile(schema);
export interface ValidationResult { valid: boolean; errors: ErrorObject[]; }
export function validateCanonizationRecord(value: unknown): ValidationResult { const valid=validateRecord(value); return { valid:Boolean(valid), errors:[...(validateRecord.errors ?? [])] }; }
export function assertCanonizationRecord(value: unknown): asserts value is CanonizationRecord { const result=validateCanonizationRecord(value); if(!result.valid) throw new Error(`Invalid canonization record: ${result.errors.map((e)=>`${e.instancePath} ${e.message}`).join("; ")}`); }
