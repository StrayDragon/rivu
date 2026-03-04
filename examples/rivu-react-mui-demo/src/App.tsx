import { useEffect, useMemo, useState } from 'react';

import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import RefreshIcon from '@mui/icons-material/Refresh';
import {
  AppBar,
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  CssBaseline,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import { alpha, createTheme, ThemeProvider, useTheme } from '@mui/material/styles';
import {
  createKernel,
  selectMountedUiComponentsV1,
  selectUiDatasetV1,
  type RivuKernel,
} from 'rivu-kernel';
import {
  ComponentRenderer,
  DATA_TABLE_COMPONENT_TYPE,
  DataTable,
  ProtocolInspector,
  UnknownComponentCard,
  buildUiV1Capabilities,
  createHost,
  createRegistry,
  dataTableRegistrationV1,
  exportChartSvgsV1,
  exportHtmlV1,
  useKernelState,
  viewerRegistryV1,
  workflowRegistryV1,
} from 'rivu-react';

import { DEMO_MESSAGE_IDS, createBootstrapEnvelopes, createInitialSharedState } from './demo-fixtures.js';
import { createMockServer, type MockServer } from './mock-server.js';

type ViewId = 'chat' | 'components' | 'datasets' | 'export';

const DRAWER_W = 280;

function downloadText(filename: string, text: string, mime: string) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function openHtmlPreview(html: string) {
  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  w.document.open();
  w.document.write(html);
  w.document.close();
}

function RivuTokenBridge(props: { children: React.ReactNode }) {
  const theme = useTheme();
  const paper = theme.palette.background.paper;
  const bg = theme.palette.background.default;
  const divider = theme.palette.divider;
  const textPrimary = theme.palette.text.primary;
  const textSecondary = theme.palette.text.secondary;

  const baseRadius = theme.shape.borderRadius;
  const radius = typeof baseRadius === 'number' ? baseRadius : 10;
  const shadow = theme.shadows[2] ?? 'none';

  const vars: Record<string, string> = {
    '--rivu-bg': paper,
    '--rivu-bg-muted': alpha(paper, theme.palette.mode === 'dark' ? 0.6 : 0.85),
    '--rivu-bg-subtle': alpha(bg, theme.palette.mode === 'dark' ? 0.6 : 0.85),
    '--rivu-fg': textPrimary,
    '--rivu-fg-muted': textSecondary,
    '--rivu-muted': textSecondary,
    '--rivu-border': divider,
    '--rivu-border-muted': alpha(divider, theme.palette.mode === 'dark' ? 0.5 : 0.8),
    '--rivu-shadow': shadow,
    '--rivu-radius': `${radius + 6}px`,
    '--rivu-radius-sm': typeof baseRadius === 'number' ? `${baseRadius}px` : String(baseRadius),
    '--rivu-chart-1': theme.palette.primary.main,
    '--rivu-chart-2': theme.palette.success.main,
    '--rivu-chart-3': theme.palette.warning.main,
    '--rivu-chart-4': theme.palette.error.main,
    '--rivu-chart-5': theme.palette.secondary.main,
  };

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', color: 'text.primary' }}>
      <Box sx={{ ...vars } as any}>{props.children}</Box>
    </Box>
  );
}

function MessageCard(props: {
  kernel: RivuKernel;
  host: ReturnType<typeof createHost>;
  messageId: string;
  selected: boolean;
  onSelect: (messageId: string) => void;
}) {
  const message = useKernelState(props.kernel, (s) => s.messages[props.messageId] ?? null);
  const inlineMounted = useKernelState(props.kernel, (s) =>
    selectMountedUiComponentsV1({ state: s, messageId: props.messageId, slot: 'inline' }),
  );

  if (!message) return null;

  return (
    <Card
      variant="outlined"
      onClick={() => props.onSelect(props.messageId)}
      sx={{
        cursor: 'pointer',
        borderColor: props.selected ? 'primary.main' : undefined,
        boxShadow: props.selected ? 1 : 0,
      }}
    >
      <CardHeader
        title={
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip size="small" label={message.role} />
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              {props.messageId}
            </Typography>
          </Stack>
        }
        sx={{ pb: 0 }}
      />
      <CardContent sx={{ pt: 1 }}>
        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
          {message.content}
        </Typography>
        {inlineMounted.length ? (
          <Stack spacing={1.25} sx={{ mt: 1.5 }}>
            {inlineMounted.map((m) => (
              <ComponentRenderer key={m.componentId} kernel={props.kernel} host={props.host} componentId={m.componentId} />
            ))}
          </Stack>
        ) : null}
      </CardContent>
    </Card>
  );
}

function SidebarMounts(props: { kernel: RivuKernel; host: ReturnType<typeof createHost>; messageId: string }) {
  const sidebarMounted = useKernelState(props.kernel, (s) =>
    selectMountedUiComponentsV1({ state: s, messageId: props.messageId, slot: 'sidebar' }),
  );

  if (!sidebarMounted.length) {
    return (
      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        No sidebar mounts for this message.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.25}>
      {sidebarMounted.map((m) => (
        <ComponentRenderer key={m.componentId} kernel={props.kernel} host={props.host} componentId={m.componentId} />
      ))}
    </Stack>
  );
}

function ComponentsView(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  const ids = [
    'cmp_report_section',
    'cmp_metric_revenue',
    'cmp_table',
    'cmp_chart',
    'cmp_error_demo',
    'cmp_unknown_demo',
    'cmp_approval',
    'cmp_form',
    'cmp_chart_workflow',
    'cmp_lifecycle_metric',
  ] as const;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
        This view renders a curated set of components directly by <code>componentId</code>, inside a Material UI shell. Rivu cards pick up theme
        tokens via <code>--rivu-*</code> CSS variables bridged from the MUI theme.
      </Typography>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: 2,
          alignItems: 'start',
        }}
      >
        {ids.map((componentId) => (
          <Card key={componentId} variant="outlined">
            <CardHeader
              title={<Typography variant="subtitle2">{componentId}</Typography>}
              subheader={<Typography variant="caption">Rendered by `ComponentRenderer`</Typography>}
              sx={{ pb: 0 }}
            />
            <CardContent sx={{ pt: 1.5 }}>
              <ComponentRenderer kernel={props.kernel} host={props.host} componentId={componentId} />
            </CardContent>
          </Card>
        ))}
      </Box>
    </Stack>
  );
}

function DatasetsView(props: { kernel: RivuKernel; host: ReturnType<typeof createHost>; server: MockServer }) {
  const datasetId = 'ds_revenue_by_channel';
  const dataset = useKernelState(props.kernel, (s) => selectUiDatasetV1(s, datasetId));
  const [error, setError] = useState<string | null>(null);

  const mutate = (fn: (current: NonNullable<typeof dataset>) => Array<Array<string | number | null>>) => {
    setError(null);
    if (!dataset) {
      setError(`Dataset missing: ${datasetId}`);
      return;
    }
    try {
      props.server.setDatasetRows(datasetId, fn(dataset));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
        Datasets live in <code>sharedState.ui.datasets</code>. Components can reference them via <code>props.dataRef</code> to keep snapshots compact.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="contained"
          onClick={() =>
            mutate((current) => {
              const valueIndex = current.columns.indexOf('value');
              if (valueIndex < 0) throw new Error('dataset missing column: value');
              return current.rows.map((row) => {
                const next = [...row] as Array<string | number | null>;
                const v = next[valueIndex];
                if (typeof v === 'number' && Number.isFinite(v)) {
                  const factor = 0.8 + Math.random() * 0.6;
                  next[valueIndex] = Math.round(v * factor);
                }
                return next;
              });
            })
          }
        >
          Randomize values
        </Button>
        <Button
          variant="outlined"
          onClick={() =>
            mutate((current) => {
              const nextRows = [...current.rows];
              nextRows.push(nextRows.length % 2 === 0 ? ['Social', 11_600] : ['Partners', 14_250]);
              return nextRows as Array<Array<string | number | null>>;
            })
          }
        >
          Add a row
        </Button>
        <Button
          variant="text"
          onClick={() => {
            setError(null);
            const initial = createInitialSharedState() as any;
            const base = initial?.ui?.datasets?.[datasetId];
            if (!base?.rows) {
              setError('Could not load initial dataset baseline.');
              return;
            }
            props.server.setDatasetRows(datasetId, structuredClone(base.rows));
          }}
        >
          Reset dataset
        </Button>
      </Stack>

      {error ? (
        <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      <Card variant="outlined">
        <CardHeader title={<Typography variant="subtitle2">Dataset JSON</Typography>} subheader={<Typography variant="caption">{datasetId}</Typography>} />
        <CardContent sx={{ pt: 0 }}>
          <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 2, bgcolor: alpha('#000', 0.06), overflow: 'auto', fontSize: 12 }}>
            {JSON.stringify(dataset, null, 2)}
          </Box>
        </CardContent>
      </Card>

      <Divider />

      <Typography variant="subtitle2">Components using `dataRef`</Typography>
      <Stack spacing={1.5}>
        <ComponentRenderer kernel={props.kernel} host={props.host} componentId="cmp_table" />
      </Stack>
    </Stack>
  );
}

function ExportView(props: { kernel: RivuKernel; host: ReturnType<typeof createHost> }) {
  const [html, setHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const snapshot = () => {
    const state = props.kernel.getState();
    return structuredClone({
      schema: 'rivu.export.v1',
      exportedAtMs: Date.now(),
      lastSeq: state.lastSeq,
      sharedState: state.sharedState,
      messages: state.messageOrder.map((id) => state.messages[id]).filter(Boolean),
      toolCalls: state.toolCallOrder.map((id) => state.toolCalls[id]).filter(Boolean),
    });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
        Export is snapshot-based: generate a JSON snapshot (<code>rivu.export.v1</code>), then derive offline HTML and chart SVGs deterministically.
      </Typography>

      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button
          variant="contained"
          onClick={() => {
            setError(null);
            try {
              const out = exportHtmlV1({ snapshot: snapshot() as any, host: props.host, title: 'Rivu Export (MUI Demo)' });
              setHtml(out);
            } catch (err) {
              setError(err instanceof Error ? err.message : String(err));
            }
          }}
        >
          Generate HTML
        </Button>
        <Button variant="outlined" disabled={!html} onClick={() => (html ? openHtmlPreview(html) : null)}>
          Open HTML
        </Button>
        <Button variant="text" onClick={() => downloadText('rivu-export.json', JSON.stringify(snapshot(), null, 2), 'application/json')}>
          Download JSON
        </Button>
        <Button
          variant="text"
          onClick={() => {
            const svgs = exportChartSvgsV1({ snapshot: snapshot() as any, host: props.host });
            const first = Object.entries(svgs)[0];
            if (!first) return;
            const [componentId, svg] = first;
            downloadText(`${componentId}.svg`, svg, 'image/svg+xml');
          }}
        >
          Download first chart SVG
        </Button>
      </Stack>

      {error ? (
        <Card variant="outlined" sx={{ borderColor: 'error.main' }}>
          <CardContent>
            <Typography variant="body2" color="error">
              {error}
            </Typography>
          </CardContent>
        </Card>
      ) : null}

      {html ? (
        <Card variant="outlined">
          <CardHeader title={<Typography variant="subtitle2">HTML (first 2 KB)</Typography>} />
          <CardContent sx={{ pt: 0 }}>
            <Box component="pre" sx={{ m: 0, p: 1.5, borderRadius: 2, bgcolor: alpha('#000', 0.06), overflow: 'auto', fontSize: 12 }}>
              {html.slice(0, 2048)}
              {html.length > 2048 ? '\n…' : ''}
            </Box>
          </CardContent>
        </Card>
      ) : null}
    </Stack>
  );
}

export function App() {
  const [mode, setMode] = useState<'light' | 'dark'>('light');
  const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

  const registry = useMemo(
    () =>
      createRegistry({
        ...viewerRegistryV1,
        ...workflowRegistryV1,
        [DATA_TABLE_COMPONENT_TYPE]: {
          ...dataTableRegistrationV1,
          render: ({ kernel, componentId, componentType, schemaVersion, props }) => {
            const slots = {
              EmptyState: () => (
                <Typography variant="body2" sx={{ opacity: 0.8 }}>
                  No data (host-side empty state)
                </Typography>
              ),
              Cell: ({ value, column }: { value: string | number | null; column: { key: string } }) => {
                if (value === null) return '';
                if (column.key === 'value' && typeof value === 'number') {
                  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
                }
                if (typeof value === 'number') return value.toLocaleString();
                return value;
              },
            };

            if (props.dataRef) {
              const datasetId = props.dataRef.datasetId;
              const dataset = selectUiDatasetV1(kernel.getState(), datasetId);
              if (!dataset) {
                return (
                  <UnknownComponentCard
                    title="Dataset not found"
                    componentId={componentId}
                    componentType={componentType}
                    schemaVersion={schemaVersion}
                    details={{ datasetId }}
                  />
                );
              }

              const indexes = new Map(dataset.columns.map((name, i) => [name, i] as const));
              const missingColumns = props.columns
                .filter((col: { key: string }) => !indexes.has(col.key))
                .map((col: { key: string }) => col.key);
              if (missingColumns.length > 0) {
                return (
                  <UnknownComponentCard
                    title="Dataset column mismatch"
                    componentId={componentId}
                    componentType={componentType}
                    schemaVersion={schemaVersion}
                    details={{ datasetId, missingColumns, datasetColumns: dataset.columns }}
                  />
                );
              }

              const resolvedRows = dataset.rows.map((row) => {
                const out: Record<string, string | number | null> = {};
                for (const col of props.columns) {
                  out[col.key] = (row[indexes.get(col.key)!] as any) ?? null;
                }
                return out;
              });

              return <DataTable {...props} rows={resolvedRows} slots={slots as any} />;
            }

            return <DataTable {...props} slots={slots as any} />;
          },
        },
      }),
    [],
  );
  const host = useMemo(() => createHost({ registry }), [registry]);

  const [resetKey, setResetKey] = useState(0);
  const [view, setView] = useState<ViewId>('chat');
  const [selectedMessageId, setSelectedMessageId] = useState<string>(DEMO_MESSAGE_IDS.assistant1);
  const [showInspector, setShowInspector] = useState(true);

  const { kernel, server, bootstrap } = useMemo(() => {
    const sharedState = createInitialSharedState();
    const bootstrapEnvelopes = createBootstrapEnvelopes(sharedState);

    let server: MockServer | null = null;
    const kernel = createKernel({
      actionTransport: async (action) => {
        if (!server) throw new Error('server not ready');
        await server.actionTransport(action);
      },
    });

    server = createMockServer({ kernel, initialSharedState: sharedState, bootstrapEnvelopes });

    return {
      kernel,
      server,
      bootstrap: async () => {
        await server!.capabilitiesTransport({
          type: 'CUSTOM',
          name: 'ui.v1.capabilities',
          value: { ...buildUiV1Capabilities(host), client: { framework: 'react', runtime: 'rivu-react-mui-demo' } },
        } as any);
        server!.bootstrap();
      },
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey, host]);

  useEffect(() => {
    void bootstrap();
    setSelectedMessageId(DEMO_MESSAGE_IDS.assistant1);
  }, [bootstrap]);

  const messageIds = useKernelState(kernel, (s) => s.messageOrder);

  const titleByView: Record<ViewId, string> = {
    chat: 'Chat embeds',
    components: 'Components',
    datasets: 'Datasets',
    export: 'Export',
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RivuTokenBridge>
        <AppBar position="fixed" color="default" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar sx={{ gap: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              Rivu + Material UI
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              {titleByView[view]}
            </Typography>
            <Box sx={{ flex: 1 }} />
            <FormControlLabel
              control={
                <Tooltip title={mode === 'light' ? 'Switch to dark' : 'Switch to light'}>
                  <IconButton onClick={() => setMode((m) => (m === 'light' ? 'dark' : 'light'))} size="small">
                    {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              }
              label={<Typography variant="caption">Mode</Typography>}
              labelPlacement="start"
              sx={{ m: 0, gap: 0.5 }}
            />
            <Button variant="outlined" size="small" onClick={() => setShowInspector((v) => !v)}>
              {showInspector ? 'Hide' : 'Show'} Inspector
            </Button>
            <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={() => setResetKey((k) => k + 1)}>
              Reset
            </Button>
          </Toolbar>
        </AppBar>

        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_W,
            flexShrink: 0,
            [`& .MuiDrawer-paper`]: { width: DRAWER_W, boxSizing: 'border-box', borderRightColor: 'divider' },
          }}
        >
          <Toolbar />
          <Box sx={{ px: 1.25, py: 1 }}>
            <Typography variant="overline" sx={{ opacity: 0.7 }}>
              Views
            </Typography>
          </Box>
          <List dense sx={{ px: 1 }}>
            {(['chat', 'components', 'datasets', 'export'] as ViewId[]).map((id) => (
              <ListItemButton key={id} selected={view === id} onClick={() => setView(id)} sx={{ borderRadius: 2 }}>
                <ListItemText primary={titleByView[id]} />
              </ListItemButton>
            ))}
          </List>
          <Divider sx={{ my: 1.5 }} />
          <Box sx={{ px: 2, pb: 2 }}>
            <Typography variant="caption" sx={{ opacity: 0.7, lineHeight: 1.5 }}>
              The host UI is MUI. Rivu cards are rendered from <code>sharedState.ui</code> and themed via <code>--rivu-*</code> variables derived from the
              MUI theme.
            </Typography>
          </Box>
        </Drawer>

        <Box
          component="main"
          sx={{
            ml: `${DRAWER_W}px`,
            pt: 10,
            px: 2,
            pb: 2,
          }}
        >
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: showInspector ? 'minmax(0, 1fr) 420px' : 'minmax(0, 1fr)',
              gap: 2,
              alignItems: 'start',
            }}
          >
            <Card variant="outlined">
              <CardHeader title={<Typography variant="subtitle1">{titleByView[view]}</Typography>} />
              <CardContent sx={{ pt: 0 }}>
                {view === 'chat' ? (
                  <Stack spacing={1.5}>
                    <Typography variant="body2" sx={{ opacity: 0.8, lineHeight: 1.6 }}>
                      Click a message to change the sidebar mounts. Inline mounts render inside each message card.
                    </Typography>
                    <Stack spacing={1.5}>
                      {messageIds.map((id) => (
                        <MessageCard
                          key={id}
                          kernel={kernel}
                          host={host}
                          messageId={id}
                          selected={id === selectedMessageId}
                          onSelect={setSelectedMessageId}
                        />
                      ))}
                    </Stack>
                  </Stack>
                ) : null}
                {view === 'components' ? <ComponentsView kernel={kernel} host={host} /> : null}
                {view === 'datasets' ? <DatasetsView kernel={kernel} host={host} server={server} /> : null}
                {view === 'export' ? <ExportView kernel={kernel} host={host} /> : null}
              </CardContent>
            </Card>

            {showInspector ? (
              <Stack spacing={2}>
                {view === 'chat' ? (
                  <Card variant="outlined">
                    <CardHeader title={<Typography variant="subtitle1">Sidebar mounts</Typography>} subheader={<Typography variant="caption">{selectedMessageId}</Typography>} />
                    <CardContent sx={{ pt: 0 }}>
                      <SidebarMounts kernel={kernel} host={host} messageId={selectedMessageId} />
                    </CardContent>
                  </Card>
                ) : null}

                <Card variant="outlined">
                  <CardHeader title={<Typography variant="subtitle1">ProtocolInspector</Typography>} subheader={<Typography variant="caption">kernel + outbox + ui summary</Typography>} />
                  <CardContent sx={{ pt: 0 }}>
                    <ProtocolInspector kernel={kernel} />
                  </CardContent>
                </Card>
              </Stack>
            ) : null}
          </Box>
        </Box>
      </RivuTokenBridge>
    </ThemeProvider>
  );
}
