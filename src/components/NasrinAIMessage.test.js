import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NasrinAIMessage from './NasrinAIMessage';

function renderChart(spec) {
  return renderToStaticMarkup(
    <NasrinAIMessage content={'```chart\n' + JSON.stringify(spec) + '\n```'} />
  );
}

describe('NasrinAI chart rendering', () => {
  test('renders a safe note instead of throwing on malformed chart rows', () => {
    const html = renderChart({
      chartType: 'bar',
      xKey: 'month',
      series: [{ dataKey: 'amount', label: 'Expenses' }],
      data: [{ month: 'Jan', amount: 100 }, null]
    });

    expect(html).toContain('Chart data is invalid. Use a table instead.');
    expect(html).not.toContain('<rect');
  });

  test('preserves the series currency prefix on axis ticks and data tooltips', () => {
    const html = renderChart({
      chartType: 'bar',
      xKey: 'month',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱', valueFormat: 'standard' }],
      data: [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: 2000 }]
    });

    expect(html).toContain('₱2,000');
    expect(html).toContain('₱1,000');
  });

  test('does not turn missing chart values into zero-height data points', () => {
    const html = renderChart({
      chartType: 'bar',
      xKey: 'month',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱' }],
      data: [{ month: 'Jan', amount: 1000 }, { month: 'Feb', amount: null }]
    });

    expect(html).toContain('Chart data is incomplete or invalid. Use a table instead.');
    expect(html).not.toContain('<rect');
  });

  test('rejects chart series that use different units or value formats', () => {
    const html = renderChart({
      chartType: 'line',
      xKey: 'month',
      series: [
        { dataKey: 'php', label: 'PHP', valuePrefix: '₱' },
        { dataKey: 'usd', label: 'USD', valuePrefix: '$' }
      ],
      data: [{ month: 'Jan', php: 100, usd: 2 }, { month: 'Feb', php: 200, usd: 4 }]
    });

    expect(html).toContain('Chart series use inconsistent units or value formats. Use separate charts instead.');
    expect(html).not.toContain('<polyline');
  });

  test('shows pie chart amounts with the supplied currency prefix', () => {
    const html = renderChart({
      chartType: 'pie',
      nameKey: 'category',
      valueKey: 'amount',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱' }],
      data: [{ category: 'Food', amount: 1000 }, { category: 'Bills', amount: 500 }]
    });

    expect(html).toContain('Food');
    expect(html).toContain('₱1,000');
    expect(html).toContain('₱500');
  });

  test('groups pie categories beyond the first seven into Other', () => {
    const data = Array.from({ length: 9 }, (_, index) => ({
      category: 'Category ' + (index + 1),
      amount: (index + 1) * 100
    }));
    const html = renderChart({
      chartType: 'pie',
      nameKey: 'category',
      valueKey: 'amount',
      series: [{ dataKey: 'amount', label: 'Expenses', valuePrefix: '₱' }],
      data
    });

    expect(html).toContain('Other');
    expect(html).toContain('₱1,700');
  });
});
