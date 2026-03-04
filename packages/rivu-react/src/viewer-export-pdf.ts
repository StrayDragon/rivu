import { exportHtmlV1, type RivuExportSnapshotV1 } from './viewer-export.js';
import type { RivuHost } from './registry.js';

type PlaywrightLike = {
  chromium: {
    launch: (opts?: any) => Promise<{
      newPage: () => Promise<{
        setContent: (html: string, opts?: any) => Promise<void>;
        pdf: (opts?: any) => Promise<Uint8Array>;
        close?: () => Promise<void>;
      }>;
      close: () => Promise<void>;
    }>;
  };
};

async function loadPlaywright(): Promise<PlaywrightLike> {
  try {
    // Optional dependency: avoid static-bundler resolution by importing via Function().
    const dynamicImport = new Function('m', 'return import(m)') as (m: string) => Promise<unknown>;
    const mod = await dynamicImport('playwright');
    return mod as PlaywrightLike;
  } catch (err) {
    throw new Error('Playwright is not installed. Install `playwright` (and browsers) or generate PDF in your own runtime.', {
      cause: err,
    });
  }
}

export type ExportPdfV1Options = {
  snapshot: RivuExportSnapshotV1;
  host?: RivuHost;
  title?: string;
  playwright?: PlaywrightLike;
  launchOptions?: unknown;
  pdfOptions?: unknown;
};

export async function exportPdfV1(options: ExportPdfV1Options): Promise<Uint8Array> {
  const html = exportHtmlV1({
    snapshot: options.snapshot,
    ...(options.host ? { host: options.host } : {}),
    ...(options.title ? { title: options.title } : {}),
  });
  const playwright = options.playwright ?? (await loadPlaywright());

  const browser = await playwright.chromium.launch(options.launchOptions);
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  const pdf = await page.pdf({ printBackground: true, ...(options.pdfOptions as any) });
  await browser.close();
  return pdf;
}
