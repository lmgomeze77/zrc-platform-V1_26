import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {DEFAULT_INVESTMENT_INPUTS,calculateInvestmentDecision} from "../src/data/georiskInvestmentEngine.js";
import {createWorkspaceSnapshot,parseWorkspaceSnapshot,WORKSPACE_SNAPSHOT_VERSION} from "../src/data/georiskWorkspaceSnapshot.js";
const source={project:"Planta Marruecos",country:"Marruecos",comparison:"España",region:"eu",sector:"global",
 scenarioWeights:{tariff_escalation:0.34,mena_instability:0.38,eu_fragmentation:0.20,detente:0.08},
 inputs:{...DEFAULT_INVESTMENT_INPUTS,capital:12,annualCashFlow:3.1},
 editedFields:["capital","annualCashFlow"],countryAdjustment:false,sensitivity:1};

test("portable snapshot preserves financial outputs and provenance across round trip",()=>{
 const saved=createWorkspaceSnapshot(source);
 assert.equal(saved.schema,WORKSPACE_SNAPSHOT_VERSION);
 const imported=parseWorkspaceSnapshot(JSON.parse(JSON.stringify(saved)));
 assert.equal(imported.project,source.project);
 assert.equal(imported.country,source.country);
 assert.deepEqual(imported.editedFields,source.editedFields);
 assert.deepEqual(imported.inputs,source.inputs);
 assert.equal(calculateInvestmentDecision(imported.inputs).baseNPV,calculateInvestmentDecision(source.inputs).baseNPV);
});
test("unsupported version, tampered financial values or scenario weights fail closed",()=>{
 const valid=createWorkspaceSnapshot(source);
 assert.throws(()=>parseWorkspaceSnapshot({...valid,schema:"unknown"}),/compatible/);
 assert.throws(()=>parseWorkspaceSnapshot({...valid,financial:{...valid.financial,inputs:{...valid.financial.inputs,capital:"NaN"}}}),/financiero/);
 assert.throws(()=>parseWorkspaceSnapshot({...valid,scenarioWeights:{...valid.scenarioWeights,detente:0.8}}),/100 %/);
 assert.throws(()=>parseWorkspaceSnapshot({...valid,financial:{...valid.financial,countryAdjustment:"true"}}),/Ajuste/);
});
test("finance state is owned by the Dashboard rather than unmounting investment tab",()=>{
 const dashboard=readFileSync(new URL("../src/pages/intelligence/GeoRiskDashboard.jsx",import.meta.url),"utf8");
 const engine=readFileSync(new URL("../src/pages/intelligence/GeoRiskInvestmentEngine.jsx",import.meta.url),"utf8");
 assert.match(dashboard,/financialInputs=\{financialInputs\}/);
 assert.match(dashboard,/parseWorkspaceSnapshot\(JSON\.parse\(await file\.text\(\)\)\)/);
 assert.match(engine,/financialInputs===undefined\?localInputs:financialInputs/);
});
