import React from 'react';

const number=n=>Number(n).toLocaleString('en-US');
export default function OwnerSignupChart({series}){
  const verified=series?.status==='verified'&&Array.isArray(series.data)
    &&series.data.length>=2&&series.data.length<=20
    &&series.data.every(p=>typeof p.week==='string'&&Number.isInteger(p.count)&&p.count>=0);
  if(!verified)return <section className="occ-card occ-signup-chart">
    <div className="occ-heading"><div><h3>User registrations</h3><p>Weekly account creation</p></div><span className="occ-tag">Unavailable</span></div>
    <div className="occ-empty"><strong>Signup series unavailable</strong><p>Historical signups require a verified, server-restricted analytics function.</p></div>
  </section>;
  const points=series.data;
  const max=Math.max(1,...points.map(p=>p.count));
  const w=640,h=200,x0=32,x1=615,y0=155,high=117;
  const coordinates=points.map((p,i)=>({
    x:x0+(points.length===1?0:i/(points.length-1))*(x1-x0),
    y:y0-(p.count/max)*high,...p
  }));
  const path=coordinates.map((p,i)=>(i?'L':'M')+p.x.toFixed(2)+' '+p.y.toFixed(2)).join(' ');
  const total=points.reduce((a,p)=>a+p.count,0);
  const start=points[0]?.week,end=points[points.length-1]?.week;
  return <section className="occ-card occ-signup-chart" aria-label="Weekly registered user growth">
    <div className="occ-heading"><div><h3>New user registrations</h3><p>Last {points.length} weeks · based on Supabase Auth creation timestamps</p></div>
      <span className="occ-tag occ-good">Verified aggregate</span></div>
    <div className="occ-trend-summary"><strong>{number(total)}</strong><span>registrations in displayed weeks</span></div>
    <svg className="occ-trend-svg" viewBox={'0 0 '+w+' '+h} role="img" aria-label={'Weekly registrations from '+start+' through '+end+'. Total '+number(total)}>
      {[0,1,2,3].map(i=>{
        const y=y0-(i/3)*high;
        return <g key={i}><line className="occ-trend-grid" x1={x0} x2={x1} y1={y} y2={y}/><text className="occ-trend-tick" x={x0-8} y={y+4} textAnchor="end">{number(Math.round((i/3)*max))}</text></g>;
      })}
      <path className="occ-trend-line" d={path} fill="none" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round"/>
      {coordinates.map((p,i)=><circle key={p.week+i} cx={p.x} cy={p.y} r="4" className="occ-trend-point"><title>{p.week}: {number(p.count)} new accounts</title></circle>)}
      <text className="occ-trend-tick" x={x0} y={h-12}>{start}</text>
      <text className="occ-trend-tick" x={x1} y={h-12} textAnchor="end">{end}</text>
    </svg>
    <p className="occ-chart-note">This measures registrations, not active users, revenue, paid conversions, or account balances.</p>
  </section>;
}
