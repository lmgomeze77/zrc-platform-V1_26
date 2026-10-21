import test from 'node:test';
import assert from 'node:assert/strict';
import {ASSET_SENSITIVITY_BY_REGION,SENSITIVITY_STATUS,SENSITIVITY_VERSION,estimatePriceImpact,decomposeAssetSensitivity,validateSensitivityContract} from '../src/data/georiskSensitivityAudit.js';
test('legacy coefficients remain complete and bounded',()=>{assert.equal(validateSensitivityContract(),true);assert.ok(SENSITIVITY_VERSION);assert.equal(SENSITIVITY_STATUS,'analyst_heuristic_not_calibrated')});
test('asset scoring preserves historic calculation but cannot be called a percent return',()=>{
 const x={interest_rates:.2,sovereign_yield:.4,capital_flows:-.1};
 const result=decomposeAssetSensitivity('Deuda soberana core',x,'eu');
 assert.equal(result.status,'illustrative');
 assert.equal(result.unit,'arbitrary_sensitivity_points');
 assert.equal(Number(result.score.toFixed(2)),-6.4);
 assert.equal(result.score,estimatePriceImpact('Deuda soberana core',x,'eu'));
 assert.equal(Number(result.terms.reduce((sum,t)=>sum+t.contribution,0).toFixed(8)),Number(result.score.toFixed(8)));
});
test('FX exporter has opposite sign in Asian quotation convention',()=>{
 const x={fx:1,capital_flows:0};
 assert.equal(estimatePriceImpact('Equity exportador',x,'eu'),-35);
 assert.equal(estimatePriceImpact('Equity exportador',x,'asia'),35);
});
test('unmapped assets or missing input show unavailable, not a made-up zero',()=>{
 assert.equal(decomposeAssetSensitivity('unlisted',{},'eu').status,'unavailable');
 assert.equal(decomposeAssetSensitivity('Deuda soberana core',{interest_rates:1},'eu').score,null);
});
test('reference coefficient counts are identical across regions',()=>{
 for(const r of ['eu','usa','asia'])assert.equal(Object.keys(ASSET_SENSITIVITY_BY_REGION[r]).length,6);
});
