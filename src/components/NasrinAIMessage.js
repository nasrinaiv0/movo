import React from 'react';

function InlineText({ text }) {
  const parts = String(text || '').split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|\[[^\]]+\]\([^)]+\))/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`')) return <code key={index} className="movo-ai-inline-code">{part.slice(1, -1)}</code>;
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('~~') && part.endsWith('~~')) return <del key={index}>{part.slice(2, -2)}</del>;
    const link = part.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noopener noreferrer">{link[1]}</a>;
    return part;
  });
}

function isFiniteChartNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value);
  if (typeof value !== 'string' || !value.trim()) return false;
  return Number.isFinite(Number(value));
}

function formatChartValue(value, series = {}) {
  const number = Number(value);
  const options = series.valueFormat === 'compact'
    ? { notation: 'compact', maximumFractionDigits: 1 }
    : { maximumFractionDigits: 1 };
  const formatted = new Intl.NumberFormat(undefined, options).format(number);
  const prefix = typeof series.valuePrefix === 'string' ? series.valuePrefix.slice(0, 8) : '';
  return prefix + formatted;
}

function MiniChart({ spec }) {
  if (!spec || !Array.isArray(spec.data) || !spec.data.length) return null;
  const type = ['bar', 'line', 'pie'].includes(spec.chartType) ? spec.chartType : 'bar';
  const xKey = typeof spec.xKey === 'string' ? spec.xKey : Object.keys(spec.data[0])[0];
  const series = Array.isArray(spec.series) ? spec.series.filter(s => s && typeof s.dataKey === 'string').slice(0, 3) : [];
  if (type === 'pie') {
    const nameKey = spec.nameKey || xKey;
    const valueKey = spec.valueKey || series[0]?.dataKey;
    const valueSeries = series.find(s => s.dataKey === valueKey) || series[0] || {};
    if (!valueKey || !spec.data.every(row => isFiniteChartNumber(row[valueKey]) && Number(row[valueKey]) >= 0)) {
      return <p className="movo-ai-chart-note">Chart data is incomplete or invalid. Use a table instead.</p>;
    }
    const sourceRows = spec.data;
    const shownRows = sourceRows.length > 8
      ? [...sourceRows.slice(0, 7), { [nameKey]: 'Other', [valueKey]: sourceRows.slice(7).reduce((sum, row) => sum + Number(row[valueKey]), 0) }]
      : sourceRows;
    const total = shownRows.reduce((sum, row) => sum + Number(row[valueKey]), 0);
    if (!total) return <p className="movo-ai-chart-note">Chart data has no positive values to display.</p>;
    let offset = 0;
    const colors = ['#5b8def', '#25b99a', '#f5a742', '#b38cf5', '#ef7185', '#65b6ce'];
    const slices = shownRows.map((row, i) => {
      const value = Number(row[valueKey]);
      const fraction = value / total;
      const start = offset;
      offset += fraction;
      return { label: String(row[nameKey] ?? 'Other'), value, fraction, start, color: colors[i % colors.length] };
    });
    let angle = -Math.PI / 2;
    const paths = slices.map((slice, i) => {
      const next = angle + slice.fraction * Math.PI * 2;
      const point = a => [100 + 76 * Math.cos(a), 100 + 76 * Math.sin(a)];
      const p1 = point(angle), p2 = point(next);
      const path = slice.fraction >= 0.999 ? 'M 100 24 A 76 76 0 1 1 99.99 24' : `M 100 100 L ${p1[0]} ${p1[1]} A 76 76 0 ${slice.fraction > .5 ? 1 : 0} 1 ${p2[0]} ${p2[1]} Z`;
      angle = next;
      return <path key={i} d={path} fill={slice.color} stroke="var(--surface, #fff)" strokeWidth="2"><title>{slice.label}: {formatChartValue(slice.value, valueSeries)}</title></path>;
    });
    return <section className="movo-ai-chart-card" aria-label={spec.meta?.title || 'Financial chart'}>
      <div className="movo-ai-chart-heading"><h3>{spec.meta?.title || 'Financial breakdown'}</h3>{spec.meta?.description && <p>{spec.meta.description}</p>}</div>
      <div className="movo-ai-pie-layout"><svg viewBox="0 0 200 200" role="img" aria-label={spec.meta?.title || 'Pie chart'}>{paths}</svg><ul className="movo-ai-chart-legend">{slices.map(s => <li key={s.label}><span style={{ background: s.color }} /> <span>{s.label}</span><strong>{formatChartValue(s.value, valueSeries)} · {Math.round(s.fraction * 100)}%</strong></li>)}</ul></div>
      {spec.meta?.footer && <p className="movo-ai-chart-footer">{spec.meta.footer}</p>}
    </section>;
  }
  const numericSeries = series.length ? series : Object.keys(spec.data[0]).filter(k => k !== xKey && isFiniteChartNumber(spec.data[0][k])).slice(0, 1).map(k => ({ dataKey: k, label: k }));
  if (!numericSeries.length) return <p className="movo-ai-chart-note">This chart needs numeric series data.</p>;
  const rows = spec.data.slice(0, 12);
  if (rows.some(row => numericSeries.some(s => !isFiniteChartNumber(row[s.dataKey])))) {
    return <p className="movo-ai-chart-note">Chart data is incomplete or invalid. Use a table instead.</p>;
  }
  const prefixes = new Set(numericSeries.map(s => typeof s.valuePrefix === 'string' ? s.valuePrefix : ''));
  const formats = new Set(numericSeries.map(s => s.valueFormat === 'compact' ? 'compact' : 'standard'));
  if (prefixes.size > 1 || formats.size > 1) {
    return <p className="movo-ai-chart-note">Chart series use inconsistent units or value formats. Use separate charts instead.</p>;
  }
  const axisFormat = numericSeries[0];
  const values = rows.flatMap(row => numericSeries.map(s => Number(row[s.dataKey])));
  const max = Math.max(...values, 0);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const chartW = 600, chartH = 220, left = 44, right = 16, top = 16, bottom = 42;
  const plotW = chartW - left - right, plotH = chartH - top - bottom;
  const y = value => top + plotH - ((Number(value) - min) / span) * plotH;
  const colors = ['#5b8def', '#25b99a', '#f5a742'];
  return <section className="movo-ai-chart-card" aria-label={spec.meta?.title || 'Financial chart'}>
    <div className="movo-ai-chart-heading"><h3>{spec.meta?.title || 'Financial overview'}</h3>{spec.meta?.description && <p>{spec.meta.description}</p>}</div>
    <div className="movo-ai-chart-scroll"><svg className="movo-ai-chart-svg" viewBox={`0 0 ${chartW} ${chartH}`} role="img" aria-label={spec.meta?.title || 'Data chart'}>
      {[0, .25, .5, .75, 1].map((f, i) => <g key={i}><line x1={left} x2={chartW-right} y1={top+plotH*f} y2={top+plotH*f} stroke="currentColor" opacity=".12" /><text x={left-8} y={top+plotH*f+4} textAnchor="end" fontSize="10" fill="currentColor" opacity=".65">{formatChartValue(max-(max-min)*f, axisFormat)}</text></g>)}
      {type === 'bar' ? rows.map((row, i) => {
        const groupW = plotW / rows.length, barW = Math.min(28, groupW * .72 / numericSeries.length);
        return <g key={i}>{numericSeries.map((s, j) => {
          const v = Number(row[s.dataKey]) || 0, baseline = y(0), yy = y(v);
          return <rect key={s.dataKey} x={left + i*groupW + groupW/2 - (barW*numericSeries.length)/2 + j*barW} y={Math.min(yy,baseline)} width={Math.max(2,barW-3)} height={Math.max(1,Math.abs(baseline-yy))} rx="3" fill={colors[j%colors.length]}><title>{String(row[xKey])}: {s.label || s.dataKey} {formatChartValue(v, s)}</title></rect>;
        })}<text x={left+i*groupW+groupW/2} y={chartH-18} textAnchor="middle" fontSize="10" fill="currentColor">{String(row[xKey] ?? '').slice(0,12)}</text></g>;
      }) : numericSeries.map((s, si) => {
        const pts = rows.map((row, i) => [left+(rows.length===1?plotW/2:i*plotW/(rows.length-1)), y(Number(row[s.dataKey])||0)]);
        return <g key={s.dataKey}><polyline points={pts.map(p=>p.join(',')).join(' ')} fill="none" stroke={colors[si%colors.length]} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{pts.map((p,i)=><circle key={i} cx={p[0]} cy={p[1]} r="4" fill={colors[si%colors.length]}><title>{String(rows[i][xKey])}: {formatChartValue(Number(rows[i][s.dataKey]), s)}</title></circle>)}</g>;
      })}
      {type === 'line' && rows.map((row,i)=><text key={i} x={left+(rows.length===1?plotW/2:i*plotW/(rows.length-1))} y={chartH-18} textAnchor="middle" fontSize="10" fill="currentColor">{String(row[xKey] ?? '').slice(0,12)}</text>)}
    </svg></div>
    <div className="movo-ai-chart-legend">{numericSeries.map((s,i)=><span key={s.dataKey}><i style={{background:colors[i%colors.length]}} />{s.label || s.dataKey}</span>)}</div>
    {spec.meta?.footer && <p className="movo-ai-chart-footer">{spec.meta.footer}</p>}
  </section>;
}

function renderInline(line, key) {
  return <React.Fragment key={key}><InlineText text={line} /></React.Fragment>;
}

export default function NasrinAIMessage({ content }) {
  const source = String(content || '').replace(/\r\n?/g, '\n');
  const lines = source.split('\n');
  const blocks = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const fence = line.match(/^\s*```([\w-]*)\s*$/);
    if (fence) {
      const lang = fence[1].toLowerCase();
      const code = [];
      i++;
      while (i < lines.length && !/^\s*```\s*$/.test(lines[i])) code.push(lines[i++]);
      i++;
      if (lang === 'chart' || lang === 'json' && /^\s*\{[\s\S]*"chartType"/.test(code.join('\n'))) {
        try { blocks.push(<MiniChart key={blocks.length} spec={JSON.parse(code.join('\n'))} />); }
        catch { blocks.push(<pre key={blocks.length} className="movo-ai-code"><code>{code.join('\n')}</code></pre>); }
      } else blocks.push(<pre key={blocks.length} className="movo-ai-code"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    if (/^\s*\|.*\|\s*$/.test(line) && i+1 < lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i+1])) {
      const headers = line.split('|').slice(1,-1).map(s=>s.trim());
      i += 2; const rows = [];
      while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(lines[i].split('|').slice(1,-1).map(s=>s.trim())); i++; }
      blocks.push(<div className="movo-ai-table-wrap" key={blocks.length}><table className="movo-ai-table"><thead><tr>{headers.map((h,j)=><th key={j}>{renderInline(h,j)}</th>)}</tr></thead><tbody>{rows.map((row,j)=><tr key={j}>{headers.map((_,k)=><td key={k}>{renderInline(row[k]||'—',k)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    }
    const heading = line.match(/^\s*(#{1,3})\s+(.+)$/);
    if (heading) { const Tag = heading[1].length === 1 ? 'h2' : heading[1].length === 2 ? 'h3' : 'h4'; blocks.push(<Tag className="movo-ai-rich-heading" key={blocks.length}>{renderInline(heading[2],0)}</Tag>); i++; continue; }
    if (/^\s*([-*•])\s+/.test(line)) {
      const items=[]; while(i<lines.length && /^\s*([-*•])\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*([-*•])\s+/,'')); blocks.push(<ul className="movo-ai-rich-list" key={blocks.length}>{items.map((item,j)=><li key={j}>{renderInline(item,j)}</li>)}</ul>); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items=[]; while(i<lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) items.push(lines[i++].replace(/^\s*\d+[.)]\s+/,'')); blocks.push(<ol className="movo-ai-rich-list" key={blocks.length}>{items.map((item,j)=><li key={j}>{renderInline(item,j)}</li>)}</ol>); continue;
    }
    if (/^\s*>\s?/.test(line)) { blocks.push(<blockquote className="movo-ai-quote" key={blocks.length}>{renderInline(line.replace(/^\s*>\s?/,''),0)}</blockquote>); i++; continue; }
    const paragraph=[line.trim()]; i++;
    while(i<lines.length && lines[i].trim() && !/^\s*(```|#{1,3}\s+|[-*•]\s+|\d+[.)]\s+|>\s?)/.test(lines[i]) && !(/^\s*\|.*\|\s*$/.test(lines[i]) && i+1<lines.length && /^\s*\|?\s*:?-{3,}/.test(lines[i+1]))) paragraph.push(lines[i++].trim());
    blocks.push(<p className="movo-ai-rich-paragraph" key={blocks.length}>{paragraph.map((part,j)=><React.Fragment key={j}>{j>0 && ' '}{renderInline(part,j)}</React.Fragment>)}</p>);
  }
  return <div className="movo-ai-rich-content">{blocks}</div>;
}
