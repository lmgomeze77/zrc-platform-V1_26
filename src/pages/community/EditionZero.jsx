// ─────────────────────────────────────────────────────────────
//  ZRC CONFIDENTIAL — EDITION ZERO
//  Bulletin viewer component for the Inner Circle section
// ─────────────────────────────────────────────────────────────

const css = `
@import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Cormorant+SC:wght@300;400;500&display=swap');

.ez-wrap { background:#E8E4DC; min-height:100vh; padding:48px 24px; display:flex; justify-content:center; }
.ez-doc { background:#FAF7F1; color:#1A1A1A; font-family:'EB Garamond',Georgia,serif; max-width:680px; width:100%; border-top:3px solid #0A1628; border-bottom:1px solid #D0C8B4; box-shadow:0 2px 40px rgba(0,0,0,.12),0 0 0 1px rgba(0,0,0,.06); }
.ez-mast { background:#0A1628; padding:44px 56px 36px; position:relative; overflow:hidden; }
.ez-mast::before { content:''; position:absolute; top:-60px; right:-60px; width:300px; height:300px; background:radial-gradient(ellipse at center,rgba(184,152,42,.07) 0%,transparent 70%); pointer-events:none; }
.ez-mast-eyebrow { font-family:'Cormorant SC',serif; font-size:9px; font-weight:300; letter-spacing:.5em; color:rgba(184,152,42,.65); margin-bottom:20px; display:flex; align-items:center; gap:14px; }
.ez-mast-eyebrow::before { content:''; display:inline-block; width:28px; height:1px; background:rgba(184,152,42,.4); }
.ez-mast-title { font-family:'EB Garamond',serif; font-size:52px; font-weight:400; font-style:italic; color:#FAF7F1; line-height:1; letter-spacing:-.02em; margin-bottom:6px; }
.ez-mast-sub { font-family:'Cormorant SC',serif; font-size:11px; font-weight:300; letter-spacing:.28em; color:rgba(184,152,42,.75); margin-bottom:28px; }
.ez-mast-meta { display:flex; justify-content:space-between; align-items:flex-end; padding-top:24px; border-top:1px solid rgba(184,152,42,.2); }
.ez-mast-meta-l { font-family:'EB Garamond',serif; font-size:13px; font-style:italic; color:rgba(250,247,241,.5); line-height:1.65; }
.ez-mast-meta-r { font-family:'Cormorant SC',serif; font-size:9px; letter-spacing:.3em; color:rgba(184,152,42,.5); text-align:right; }
.ez-notice { background:#F2EDE2; border-left:3px solid #C9A84C; padding:22px 28px; }
.ez-notice-head { font-family:'Cormorant SC',serif; font-size:9.5px; font-weight:400; letter-spacing:.3em; color:#0A1628; margin-bottom:10px; }
.ez-notice p { font-size:15px; font-style:italic; color:#555; line-height:1.7; }
.ez-notice p+p { margin-top:8px; }
.ez-body { padding:0 56px; }
.ez-section { padding:48px 0 0; }
.ez-section+.ez-section { border-top:1px solid #D0C8B4; }
.ez-kicker { font-family:'Cormorant SC',serif; font-size:9px; font-weight:300; letter-spacing:.45em; color:#B8982A; margin-bottom:10px; display:flex; align-items:center; gap:12px; }
.ez-kicker::before { content:''; display:inline-block; width:22px; height:1px; background:#B8982A; opacity:.7; }
.ez-title { font-family:'EB Garamond',serif; font-size:30px; font-weight:500; font-style:italic; color:#0A1628; line-height:1.15; letter-spacing:-.01em; margin-bottom:24px; }
.ez-text { font-size:18px; line-height:1.82; color:#1A1A1A; }
.ez-text p { margin-bottom:20px; }
.ez-text p:last-child { margin-bottom:0; }
.ez-reading-item { display:grid; grid-template-columns:auto 1fr; gap:0 18px; padding:18px 0; border-bottom:1px solid #E4DDD0; }
.ez-reading-item:last-child { border-bottom:none; }
.ez-r-num { font-family:'Cormorant SC',serif; font-size:11px; letter-spacing:.15em; color:#B8982A; padding-top:3px; min-width:24px; }
.ez-r-source { font-size:18px; font-weight:600; font-style:italic; color:#0A1628; line-height:1.3; margin-bottom:6px; }
.ez-r-note { font-size:16px; line-height:1.72; color:#555; }
.ez-signoff { padding:36px 0 48px; border-top:1px solid #D0C8B4; }
.ez-signoff-note { font-size:16px; font-style:italic; color:#555; line-height:1.75; margin-bottom:28px; }
.ez-signoff-name { font-family:'EB Garamond',serif; font-size:22px; font-weight:500; color:#0A1628; margin-bottom:4px; }
.ez-signoff-title { font-family:'Cormorant SC',serif; font-size:10px; font-weight:300; letter-spacing:.3em; color:#888; }
.ez-footer { background:#0E1C34; padding:24px 56px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; }
.ez-footer-brand { font-family:'Cormorant SC',serif; font-size:9px; font-weight:300; letter-spacing:.35em; color:rgba(250,247,241,.35); }
.ez-footer-legal { font-family:'Cormorant SC',serif; font-size:9px; letter-spacing:.2em; color:rgba(250,247,241,.22); text-align:right; }
@media(max-width:640px) {
  .ez-wrap{padding:0} .ez-mast{padding:32px 24px 28px}
  .ez-body{padding:0 24px} .ez-footer{padding:20px 24px;flex-direction:column;align-items:flex-start}
}
`;

export default function EditionZero() {
  return (
    <>
      <style>{css}</style>
      <div className="ez-wrap">
        <div className="ez-doc">

          <div className="ez-mast">
            <div className="ez-mast-eyebrow">ZRC Confidential</div>
            <div className="ez-mast-title">Edition Zero</div>
            <div className="ez-mast-sub">A Reference Model &nbsp;&middot;&nbsp; April 2026</div>
            <div className="ez-mast-meta">
              <div className="ez-mast-meta-l">For the ZRC Inner Ring<br />by Luis Miguel G&oacute;mez, Founder &amp; CIO</div>
              <div className="ez-mast-meta-r">Reference Draft<br />Not for Distribution</div>
            </div>
          </div>

          <div className="ez-notice">
            <div className="ez-notice-head">Reference Model &mdash; Read Me First</div>
            <p>This is Edition Zero &mdash; a reference model for the intern, not a document for circulation. It demonstrates the intended structure, register, and length of a real ZRC Confidential edition. Names and figures below are illustrative or drawn from public record; nothing here is actual client or mandate information.</p>
            <p>Structure: four sections, ~1,200 words total. Opinionated. Not a news digest. Each section is labelled with a small gold kicker.</p>
          </div>

          <div className="ez-body">

            <div className="ez-section">
              <div className="ez-kicker">Section One &nbsp;&middot;&nbsp; Thesis in Development</div>
              <div className="ez-title">The Quiet Southern-European Succession Wave</div>
              <div className="ez-text">
                <p>There is a demographic observation that has not yet become a market thesis. Across Spain, Italy, and Portugal, a generation of founder-owners who built significant mid-market businesses between 1975 and 1995 is now between 65 and 85. The Spanish AEF estimates more than 1.1 million family-controlled businesses in Spain alone, of which a material minority &mdash; perhaps 10% to 15% &mdash; will face a real succession decision inside the next seven years. Not a generational handover. A decision: sell to whom, when, at what multiple, and under what conditions for the employees and the family name.</p>
                <p>The public narrative around this wave has been dominated by mega-cap Anglo-Saxon private equity: generic &ldquo;succession play&rdquo; pitch decks circulated by funds with no sectoral specificity and no cultural fluency. The gap is at the tier immediately below &mdash; businesses with EBITDA between &euro;3M and &euro;25M, too small for the large funds&rsquo; deployment math and too complex for the local generalist boutiques that dominate the Spanish advisory landscape.</p>
                <p>ZRC&rsquo;s working hypothesis: this is the single most under-indexed segment in Iberian mid-market advisory for the next thirty-six months. The constraint is not capital. The constraint is trust. Founders who spent forty years building something do not hand it over to a transactional advisor. They hand it over to someone who speaks their language, takes the family dimension seriously, and does not confuse a negotiation with a contest. Our positioning maps exactly onto that gap.</p>
                <p>What we are doing about it: two experimental mandates in Q2, both sourced through existing relationships, both in agribusiness. If the conversion pattern works, we will formalize the succession advisory workstream as a published capability in Q3.</p>
              </div>
            </div>

            <div className="ez-section">
              <div className="ez-kicker">Section Two &nbsp;&middot;&nbsp; Transaction Note</div>
              <div className="ez-title">Anatomy of an Abandoned Negotiation</div>
              <div className="ez-text">
                <p>An anonymized observation from a transaction that did not close in Q1. A Mediterranean-coast residential repositioning opportunity, &euro;11M range, sellers known to us for three years. The buyer was institutional, Northern European, represented by a highly competent London-based advisor. The deal died two days before signing.</p>
                <p>The buyer&rsquo;s advisor, under internal pressure to close, introduced a final-round request on the representations and warranties package that materially exceeded what had been signaled during due diligence. Technically defensible. Commercially not: the sellers were a family who had treated the entire process as a relationship, and the advisor&rsquo;s move read &mdash; correctly, in our view &mdash; as a sign that the counterparty did not understand the nature of the transaction they were in.</p>
                <p>The sellers walked. Not angrily, which is how small negotiating mistakes are corrected. Quietly, which is how irreversible ones are signaled.</p>
                <p>The structural point: the premium that flows from cultural fit is real and quantifiable. We estimate it at between 200 and 400 basis points of exit multiple on comparable assets. The Anglo-Saxon advisory playbook prices this premium at zero. That is the arbitrage.</p>
              </div>
            </div>

            <div className="ez-section">
              <div className="ez-kicker">Section Three &nbsp;&middot;&nbsp; Geopolitical Read</div>
              <div className="ez-title">The Hormuz Escalation Is Repricing European Refining</div>
              <div className="ez-text">
                <p>The Morning Intelligence has been tracking the Strait of Hormuz escalation sequence since the US Navy&rsquo;s Touska intercept in mid-April. The allocator-relevant observation is not the headline risk &mdash; spot Brent movements are already priced in &mdash; but the second-order effect on European refining capacity, which is not.</p>
                <p>European refining margins have tightened structurally since 2022: carbon pricing, capacity closures in Germany and the UK, and the accelerated retirement of older Mediterranean assets. What the current Hormuz sequence adds is a volatility premium on the crude slate European refiners depend on &mdash; specifically the medium-sour grades substituting Russian Urals in the post-sanctions supply mix.</p>
                <p>For capital allocators with exposure to European industrial credit, midstream infrastructure, or specialty chemicals downstream of refining: benchmark-relative positioning inside the refining complex matters far more than absolute sector-level exposure. A generic &ldquo;European refining&rdquo; position is now the wrong unit of analysis.</p>
                <p>We will develop this into a longer-form ZRC Research Note in Q3 if the escalation pattern holds through the summer.</p>
              </div>
            </div>

            <div className="ez-section">
              <div className="ez-kicker">Section Four &nbsp;&middot;&nbsp; What We Are Reading</div>
              <div className="ez-title">Four Sources Worth Your Time This Month</div>
              <div style={{marginTop:4}}>
                <div className="ez-reading-item">
                  <div className="ez-r-num">I</div>
                  <div>
                    <div className="ez-r-source">Bruegel &mdash; &ldquo;The Uneven Geography of Europe&rsquo;s Industrial Transition&rdquo; (March 2026)</div>
                    <div className="ez-r-note">The most honest accounting we have seen of which EU regions are quietly losing industrial base regardless of headline Green Deal figures. Useful as a frame for Southern-European asset selection.</div>
                  </div>
                </div>
                <div className="ez-reading-item">
                  <div className="ez-r-num">II</div>
                  <div>
                    <div className="ez-r-source">Financial Times &mdash; Series on Italian Succession Transactions (Feb&ndash;Apr 2026)</div>
                    <div className="ez-r-note">Read the fourth article carefully &mdash; the interview with a Brescia family-office principal on why they did not sell to the highest bidder. The reasoning is the market structure.</div>
                  </div>
                </div>
                <div className="ez-reading-item">
                  <div className="ez-r-num">III</div>
                  <div>
                    <div className="ez-r-source">Banco de Espa&ntilde;a &mdash; Financial Stability Report (April 2026)</div>
                    <div className="ez-r-note">The section on residential real-estate concentration in coastal Andalusia is more pointed than last year&rsquo;s equivalent. Worth reading against our Costa del Sol working thesis.</div>
                  </div>
                </div>
                <div className="ez-reading-item">
                  <div className="ez-r-num">IV</div>
                  <div>
                    <div className="ez-r-source">Barbara Tuchman &mdash; <em>The March of Folly</em></div>
                    <div className="ez-r-note">Re-reading it this month. The chapter on Philip II&rsquo;s policy errors is uncomfortably current for anyone tracking large-power strategic drift in 2026.</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="ez-signoff">
              <p className="ez-signoff-note">As always: this note is for you personally. Not for forwarding, not for partial excerpting. If something in here is useful for a conversation you are having, call and we can discuss how to frame it properly.</p>
              <div className="ez-signoff-name">&mdash; Luis Miguel G&oacute;mez</div>
              <div className="ez-signoff-title">Founder &amp; CIO &nbsp;&middot;&nbsp; Zenith Rise Capital</div>
            </div>

          </div>

          <div className="ez-footer">
            <div className="ez-footer-brand">Zenith Rise Capital &nbsp;&middot;&nbsp; The Inner Circle</div>
            <div className="ez-footer-legal">Calesius Global SL &nbsp;&middot;&nbsp; Internal &mdash; Not for distribution outside ZRC</div>
          </div>

        </div>
      </div>
    </>
  );
}
