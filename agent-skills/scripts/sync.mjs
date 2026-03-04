import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function repoRootFromHere(metaUrl) {
  const here = path.dirname(fileURLToPath(metaUrl));
  return path.resolve(here, '..', '..');
}

async function readText(filePath) {
  return await fs.readFile(filePath, 'utf8');
}

function parseExportedConstants(source, regex) {
  const out = [];
  for (const match of source.matchAll(regex)) {
    out.push(match);
  }
  return out;
}

async function generateComponentCatalog({ repoRoot, generatedDir }) {
  const viewerPath = path.join(repoRoot, 'packages/rivu-react/src/ui-kit/viewer.tsx');
  const workflowPath = path.join(repoRoot, 'packages/rivu-react/src/ui-kit/workflow.tsx');
  const chartPath = path.join(repoRoot, 'packages/rivu-react/src/ui-kit/chart.tsx');

  const [viewerSrc, workflowSrc, chartSrc] = await Promise.all([
    readText(viewerPath),
    readText(workflowPath),
    readText(chartPath),
  ]);

  const typeRe = /export const ([A-Z0-9_]+)_COMPONENT_TYPE = '([^']+)'/g;
  const schemaRe = /export const ([A-Z0-9_]+)_SCHEMA_VERSION = (\d+)/g;

  const collect = (src, kind, sourceRel) => {
    const types = parseExportedConstants(src, typeRe).map((m) => ({
      constName: String(m[1]),
      componentType: String(m[2]),
      kind,
      sourceRel,
    }));
    const schemas = new Map(
      parseExportedConstants(src, schemaRe).map((m) => [String(m[1]), Number(m[2])] ),
    );
    return types.map((t) => ({
      ...t,
      schemaVersion: schemas.get(t.constName) ?? null,
    }));
  };

  const viewer = collect(viewerSrc, 'viewer', 'packages/rivu-react/src/ui-kit/viewer.tsx');
  const workflow = collect(workflowSrc, 'workflow', 'packages/rivu-react/src/ui-kit/workflow.tsx');
  const chart = collect(chartSrc, 'viewer', 'packages/rivu-react/src/ui-kit/chart.tsx');

  const all = [...viewer, ...workflow, ...chart]
    .filter((x) => x.componentType && x.componentType !== 'DataTable') // DataTable is in viewer.tsx; keep it there.
    .concat(viewer.filter((x) => x.componentType === 'DataTable'));

  const byKind = {
    viewer: all.filter((x) => x.kind === 'viewer'),
    workflow: all.filter((x) => x.kind === 'workflow'),
  };

  const renderList = (items) =>
    items
      .sort((a, b) => a.componentType.localeCompare(b.componentType))
      .map((x) => `- \`${x.componentType}\` (schemaVersion: \`${x.schemaVersion ?? 'unknown'}\`) — source: \`${x.sourceRel}\``)
      .join('\n');

  const md = `# Component Catalog (generated)

This file is generated from Rivu source exports (React UI kit). Do not edit by hand.

## Viewer (stateless / replayable)

${renderList(byKind.viewer)}

## Workflow (stateful / round-trip)

${renderList(byKind.workflow)}

## Notes

- Prefer \`Chart\` for new integrations (compact data: \`columns + rows\`).
- Workflow components require server-authoritative updates (\`ui.v1.event\` → \`STATE_DELTA\`).
`;

  const outPath = path.join(generatedDir, 'component-catalog.generated.md');
  await fs.writeFile(outPath, md, 'utf8');
}

async function generateDocsIndex({ repoRoot, generatedDir }) {
  const docsDir = path.join(repoRoot, 'docs');
  const files = (await fs.readdir(docsDir)).filter((f) => f.endsWith('.md')).sort();

  const rows = [];
  for (const file of files) {
    const p = path.join(docsDir, file);
    const text = await readText(p);
    const firstHeading = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';
    const rel = `docs/${file}`;
    rows.push({ rel, title: firstHeading || file.replace(/\.md$/, '') });
  }

  const md = `# Docs Index (generated)

${rows.map((r) => `- \`${r.rel}\` — ${r.title}`).join('\n')}
`;

  const outPath = path.join(generatedDir, 'docs-index.generated.md');
  await fs.writeFile(outPath, md, 'utf8');
}

async function generateExamplesIndex({ repoRoot, generatedDir }) {
  const examplesDir = path.join(repoRoot, 'examples');
  const entries = await fs.readdir(examplesDir, { withFileTypes: true });
  const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();

  const lines = [];
  for (const name of dirs) {
    const readmePath = path.join(examplesDir, name, 'README.md');
    let title = '';
    try {
      const text = await readText(readmePath);
      title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? '';
    } catch {
      // no README
    }
    lines.push(`- \`examples/${name}\`${title ? ` — ${title}` : ''}`);
  }

  const md = `# Examples Index (generated)

${lines.join('\n')}
`;

  const outPath = path.join(generatedDir, 'examples-index.generated.md');
  await fs.writeFile(outPath, md, 'utf8');
}

async function renderSkillFromTemplate({ templatesDir, generatedDir, outputDir, templateName, outputRelPath }) {
  const templatePath = path.join(templatesDir, templateName);
  const template = await readText(templatePath);

  const blocks = {
    GENERATED_COMPONENT_CATALOG: await readText(path.join(generatedDir, 'component-catalog.generated.md')),
    GENERATED_DOCS_INDEX: await readText(path.join(generatedDir, 'docs-index.generated.md')),
    GENERATED_EXAMPLES_INDEX: await readText(path.join(generatedDir, 'examples-index.generated.md')),
  };

  let rendered = template;
  for (const [key, value] of Object.entries(blocks)) {
    rendered = rendered.replaceAll(`{{${key}}}`, value.trimEnd());
  }

  const outPath = path.join(outputDir, outputRelPath);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, rendered, 'utf8');
}

async function syncAll() {
  const repoRoot = repoRootFromHere(import.meta.url);
  const baseDir = path.join(repoRoot, 'agent-skills');
  const generatedDir = path.join(baseDir, 'generated');
  const templatesDir = path.join(baseDir, 'templates');
  const skillsDir = path.join(baseDir, 'skills');

  await fs.mkdir(generatedDir, { recursive: true });
  await fs.mkdir(skillsDir, { recursive: true });

  await Promise.all([
    generateComponentCatalog({ repoRoot, generatedDir }),
    generateDocsIndex({ repoRoot, generatedDir }),
    generateExamplesIndex({ repoRoot, generatedDir }),
  ]);

  const templates = [
    { template: 'rivu-integration.SKILL.md', out: 'rivu-integration/SKILL.md' },
    { template: 'rivu-docs-examples.SKILL.md', out: 'rivu-docs-examples/SKILL.md' },
    { template: 'rivu-a2ui-bridge.SKILL.md', out: 'rivu-a2ui-bridge/SKILL.md' },
    { template: 'rivu-skill-generator.SKILL.md', out: 'rivu-skill-generator/SKILL.md' },
  ];

  for (const t of templates) {
    await renderSkillFromTemplate({
      templatesDir,
      generatedDir,
      outputDir: skillsDir,
      templateName: t.template,
      outputRelPath: t.out,
    });
  }
}

await syncAll();
