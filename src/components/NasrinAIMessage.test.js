import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import NasrinAIMessage from './NasrinAIMessage';

function renderMessage(content) {
  return renderToStaticMarkup(<NasrinAIMessage content={content} />);
}

describe('MOVO NasrinAI unrelated-document output guard', () => {
  test('removes the unrelated portfolio disclaimer shown in the finance chat screenshot', () => {
    const html = renderMessage([
      'Recorded expenses total 51,888 PHP. I am not a licensed financial adviser.',
      '',
      '*(Regarding the "Nasrin\'s portfolio" document provided, it outlines how NasrinAI compares to other development options but does not contain information about your personal financial activities.)*',
      '',
      'Regarding your finances, I am using the data provided in your account to summarize your spending.'
    ].join('\n'));

    expect(html).not.toContain("Nasrin's portfolio");
    expect(html).not.toContain('development options');
    expect(html).not.toContain('does not contain information about your personal financial activities');
    expect(html).toContain('Recorded expenses total 51,888 PHP.');
    expect(html).toContain('I am not a licensed financial adviser.');
    expect(html).toContain('summarize your spending');
  });

  test('removes the explanatory development-services paragraph without hiding adjacent finance guidance', () => {
    const html = renderMessage([
      'I am your financial copilot inside MOVO.',
      '',
      'The document provided in your prompt, "Nasrin\'s portfolio," describes how NasrinAI operates as a development service compared to other options (like agencies or freelancers); it is not related to your personal financial records.',
      '',
      'Your current-month expenses are 12,450 PHP.'
    ].join('\n'));

    expect(html).not.toContain('development service');
    expect(html).not.toContain('agencies or freelancers');
    expect(html).toContain('I am your financial copilot inside MOVO.');
    expect(html).toContain('Your current-month expenses are 12,450 PHP.');
  });

  test('preserves the previously handled generic document disclaimer', () => {
    const html = renderMessage([
      'Monthly spending is 4,200 PHP.',
      '',
      'Note: The document "portfolio.pdf" does not contain information about your personal finances and was not used to generate this summary.',
      '',
      'Income is 20,000 PHP.'
    ].join('\n'));

    expect(html).not.toContain('portfolio.pdf');
    expect(html).toContain('Monthly spending is 4,200 PHP.');
    expect(html).toContain('Income is 20,000 PHP.');
  });

  test('does not strip a fenced code example containing similar words', () => {
    const html = renderMessage([
      'Example text:',
      '',
      '```text',
      'The document provided in your prompt describes a development service; it is not related to your personal financial records.',
      '```'
    ].join('\n'));

    expect(html).toContain('document provided in your prompt');
    expect(html).toContain('development service');
  });

  test('does not remove ordinary finance guidance merely because it mentions a portfolio', () => {
    const html = renderMessage('Your portfolio budget can include development expenses alongside your other monthly costs.');

    expect(html).toContain('Your portfolio budget can include development expenses');
  });
});
