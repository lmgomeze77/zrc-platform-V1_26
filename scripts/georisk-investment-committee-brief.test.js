import test from "node:test";
import assert from "node:assert/strict";
import {buildInvestmentCommitteeBrief,COMMITTEE_BRIEF_VERSION} from "../src/data/georiskInvestmentCommitteeBrief.js";
import {DEFAULT_INVESTMENT_INPUTS} from "../src/data/georiskInvestmentEngine.js";
import {DEFAULT_ANNUAL_SETTINGS} from "../src/data/georiskWorkspaceSnapshot.js";
import {projectCashFlows} from "../src/data/georiskAnnualCashFlow.js";

const data={
 project:"Proyecto Marruecos",country:"Marruecos",
 inputs:{...DEFAULT_INVESTMENT_INPUTS,capital:100,annualCashFlow:60,years:2,terminalValue:0,baseDiscountRate:0,residualRiskPremium:0,stressCashFlowDrop:20},
 annualSettings:{...DEFAULT_ANNUAL_SETTINGS,maintenanceCapex:0,fxExposurePct:0,fxAdverseMovePct:0},
 annualOverrides:{"2":{operatingFCF:80,capex:10}},editedFields:["capital","annualCashFlow"],countryAdjustment:false,createdAt:"2026-10-31"
};
test("committee brief renders outputs from same annual engine and full annual schedule",()=>{
 const result=projectCashFlows({...data.inputs,...data.annualSettings},data.annualOverrides);
 const html=buildInvestmentCommitteeBrief(data);
 assert.match(html,/Investment Committee Brief/);
 assert.match(html,/Proyecto Marruecos/);
 assert.match(html,/Marruecos/);
 assert.match(html,/VAN base/);
 assert.match(html,/TIR base/);
 assert.match(html,/70,00/); // 80 operating - 10 CAPEX in year two
 assert.match(html,/2026-10-31/);
 assert.equal(result.baseNPV,30);
 assert.match(html,/30,00 M€/);
 assert.match(html,/Hipótesis introducida, sin verificar/);
 assert.match(html,/0 inputs financieros verificados/);
 assert.match(COMMITTEE_BRIEF_VERSION,/ICB/);
});
test("report safely escapes project, country and never executes arbitrary markup",()=>{
 const html=buildInvestmentCommitteeBrief({...data,project:'<img src=x onerror="alert(1)">',country:"<script>evil()</script>"});
 assert.ok(!html.includes('<img src=x'));
 assert.ok(!html.includes("<script>evil()"));
 assert.match(html,/&lt;img/);
 assert.match(html,/&lt;script&gt;/);
});
test("report does not assert annual model uses insurance and rejects invalid financial assumptions",()=>{
 const html=buildInvestmentCommitteeBrief(data);
 assert.match(html,/no se han aplicado automáticamente pérdidas políticas/i);
 assert.match(html,/no es una recomendación de inversión/i);
 assert.throws(()=>buildInvestmentCommitteeBrief({...data,inputs:{...data.inputs,capital:NaN}}),/inválido/);
});
