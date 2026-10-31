export const IC_API='https://zenith-risecapital.lmgomeze77.workers.dev';
export const IC_SESSION_KEY='zrc-ic-session-v1';
export function icSessionHeaders(){const token=localStorage.getItem(IC_SESSION_KEY);return token?{Authorization:`Bearer ${token}`}:{ };}
export function clearIcSession(){localStorage.removeItem(IC_SESSION_KEY);localStorage.removeItem('zrc-inner-circle-access');}
