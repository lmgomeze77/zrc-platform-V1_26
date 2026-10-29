// Investment Workspace evidence register. No financial model input is treated as observed without verification.
export const INVESTMENT_EVIDENCE_VERSION="ZRC-investment-evidence-v1";
export const INVESTMENT_FIELD_LABELS=Object.freeze({
  capital:"Capital invertido",annualCashFlow:"Flujo anual libre",terminalValue:"Valor terminal",
  years:"Horizonte",baseDiscountRate:"Tasa de descuento base",residualRiskPremium:"Prima de riesgo residual",
  insuredShare:"Cobertura elegible",insurancePremiumRate:"Prima de seguro",
  insuranceDeductible:"Franquicia",annualPoliticalLoss:"Pérdida política anual",
  fxHedgeCost:"Coste de cobertura FX",financingGuaranteeCost:"Coste de garantías",
  stressLoss:"Pérdida extraordinaria",stressCashFlowDrop:"Caída del flujo bajo estrés"
});
export function buildInvestmentEvidence(inputs={},editedFields=[]){
  const edited=new Set(Array.isArray(editedFields)?editedFields:[]);
  return Object.keys(INVESTMENT_FIELD_LABELS).map(key=>{
    const status=edited.has(key)?"user_assumption":"example";
    return {key,label:INVESTMENT_FIELD_LABELS[key],value:inputs[key]??null,
      status,statusLabel:status==="example"?"Ejemplo no verificado":"Hipótesis introducida, sin verificar",
      source:status==="example"?"Valores demostrativos ZRC":"Introducción manual del usuario"};
  });
}
