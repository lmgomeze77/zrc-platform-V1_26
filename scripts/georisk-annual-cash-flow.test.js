import test from "node:test";
import assert from "node:assert/strict";
import {projectCashFlows,calculateIrr} from "../src/data/georiskAnnualCashFlow.js";
import {DEFAULT_INVESTMENT_INPUTS} from "../src/data/georiskInvestmentEngine.js";
import {createWorkspaceSnapshot,parseWorkspaceSnapshot} from "../src/data/georiskWorkspaceSnapshot.js";

const base={...DEFAULT_INVESTMENT_INPUTS,capital:100,years:2,annualCashFlow:60,terminalValue:0,baseDiscountRate:0,residualRiskPremium:0,stressCashFlowDrop:0,growthRate:0,maintenanceCapex:0,fxExposurePct:0,fxAdverseMovePct:0};
test("year-by-year FCF/terminal and NPV are arithmetically reproducible",()=>{
 const x=projectCashFlows(base);
 assert.equal(x.rows.length,2);
 assert.equal(x.rows[0].netFCF,60);
 assert.equal(x.baseNPV,20);
 assert.ok(Math.abs(x.irr-13.0662386291808)<.0001);
});
test("growth, CAPEX overrides and terminal value apply to the right year",()=>{
 const x=projectCashFlows({...base,growthRate:10,maintenanceCapex:5,terminalValue:10},{2:{operatingFCF:80,capex:12}});
 assert.equal(x.rows[0].netFCF,55);
 assert.equal(x.rows[1].netFCF,78);
 assert.equal(x.baseNPV,33);
});
test("adverse FX and cashflow stress reduce positive operating flows, not revenue twice",()=>{
 const x=projectCashFlows({...base,stressCashFlowDrop:20,fxExposurePct:50,fxAdverseMovePct:10});
 assert.ok(Math.abs(x.rows[0].stressNetFCF-45.6)<1e-10);
 assert.ok(x.stressNPV<x.baseNPV);
});
test("IRR shows N/D when no sign change or multiple roots",()=>{
 assert.equal(calculateIrr([-100,-10,-20]),null);
 assert.equal(calculateIrr([-100,230,-132]),null);
});
test("annual assumptions and overrides survive portable workspace import",()=>{
 const state={project:"Test",country:"Marruecos",region:"eu",sector:"global",inputs:DEFAULT_INVESTMENT_INPUTS,
  scenarioWeights:{tariff_escalation:.34,mena_instability:.38,eu_fragmentation:.2,detente:.08},
  annualSettings:{growthRate:5,maintenanceCapex:1,fxExposurePct:30,fxAdverseMovePct:10},
  annualOverrides:{"1":{operatingFCF:3.8,capex:1.4}}};
 const snap=createWorkspaceSnapshot(state);
 const read=parseWorkspaceSnapshot(JSON.parse(JSON.stringify(snap)));
 assert.deepEqual(read.annualSettings,state.annualSettings);
 assert.deepEqual(read.annualOverrides,state.annualOverrides);
 assert.equal(projectCashFlows({...state.inputs,...read.annualSettings},read.annualOverrides).baseNPV,projectCashFlows({...state.inputs,...state.annualSettings},state.annualOverrides).baseNPV);
});
test("old v1 workspaces remain importable and invalid inputs fail",()=>{
 const state={region:"eu",sector:"global",inputs:DEFAULT_INVESTMENT_INPUTS,scenarioWeights:{tariff_escalation:.34,mena_instability:.38,eu_fragmentation:.2,detente:.08}};
 const old=createWorkspaceSnapshot(state);delete old.annualSettings;delete old.annualOverrides;
 const read=parseWorkspaceSnapshot(old);
 assert.equal(read.annualSettings.growthRate,0);
 const bad=createWorkspaceSnapshot(state);bad.annualOverrides={"1":{capex:-1}};
 assert.throws(()=>parseWorkspaceSnapshot(bad),/Flujo anual/);
 assert.throws(()=>projectCashFlows({...base,maintenanceCapex:-1}),/rango/);
});
