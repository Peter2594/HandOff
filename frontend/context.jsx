// context.jsx — Branch context management with AI-generated docs
const { useState, useEffect } = React;

// ── Simple markdown renderer (handles ##, ###, -, empty lines) ────────────
function MarkdownView({ text }) {
  if (!text) return (
    <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', padding: '32px 0' }}>
      No context generated yet. Click <strong style={{ color: 'var(--text)', fontStyle: 'normal' }}>Sync</strong> to generate from branch entries.
    </div>
  );

  const elements = [];
  let listBuf = [];

  const flushList = (key) => {
    if (!listBuf.length) return;
    elements.push(
      <ul key={`ul-${key}`} style={{ margin: '6px 0 10px 0', paddingLeft: 0, listStyle: 'none' }}>
        {listBuf.map((item, i) => (
          <li key={i} style={{ display: 'flex', gap: 8, padding: '2px 0' }}>
            <span style={{ color: 'var(--muted)', flex: '0 0 auto', marginTop: 2, lineHeight: 1.5 }}>•</span>
            <span style={{ fontSize: 13, color: '#d2d2da', lineHeight: 1.65 }}>{item}</span>
          </li>
        ))}
      </ul>
    );
    listBuf = [];
  };

  text.split('\n').forEach((line, i) => {
    if (line.startsWith('## ')) {
      flushList(i);
      elements.push(
        <h2 key={i} style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '24px 0 8px', paddingBottom: 7, borderBottom: '1px solid var(--border)' }}>
          {line.slice(3)}
        </h2>
      );
    } else if (line.startsWith('### ')) {
      flushList(i);
      elements.push(
        <h3 key={i} style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', margin: '14px 0 5px' }}>
          {line.slice(4)}
        </h3>
      );
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      listBuf.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList(i);
      elements.push(<div key={i} style={{ height: 6 }} />);
    } else {
      flushList(i);
      // Inline bold: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) =>
        p.startsWith('**') && p.endsWith('**')
          ? <strong key={j} style={{ color: 'var(--text)', fontWeight: 600 }}>{p.slice(2, -2)}</strong>
          : p
      );
      elements.push(
        <p key={i} style={{ fontSize: 13, color: '#c8c8d4', lineHeight: 1.7, margin: '2px 0' }}>{parts}</p>
      );
    }
  });
  flushList('end');

  return <div>{elements}</div>;
}

// ── Branch sidebar item ────────────────────────────────────────────────────
function BranchItem({ lane, selected, onClick }) {
  const { relTime } = window.HANDOFF;
  const stale = lane.nodes_since_context_sync || 0;
  const hasContext = Boolean(lane.ai_context);

  return (
    <div onClick={onClick} style={{
      padding: '10px 14px', cursor: 'pointer', borderRadius: 8,
      background: selected ? 'var(--surface-2)' : 'none',
      border: selected ? '1px solid var(--border)' : '1px solid transparent',
      marginBottom: 2, transition: 'background .1s',
    }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.background = '#ffffff08'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.background = 'none'; }}>
      <div style={{ fontSize: 12.5, fontWeight: selected ? 600 : 400, color: selected ? 'var(--text)' : 'var(--muted-2)', marginBottom: 4 }}>
        {lane.name}
      </div>
      {hasContext ? (
        stale > 0 ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flex: '0 0 auto' }} />
            <span style={{ fontSize: 10.5, color: 'var(--amber)' }}>{stale} update{stale !== 1 ? 's' : ''} pending</span>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', flex: '0 0 auto' }} />
            <span style={{ fontSize: 10.5, color: 'var(--green)' }}>Up to date</span>
          </div>
        )
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--muted)', flex: '0 0 auto' }} />
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>No context yet</span>
        </div>
      )}
      {lane.ai_context_updated_at && (
        <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 3 }}>
          Synced {relTime(lane.ai_context_updated_at)}
        </div>
      )}
    </div>
  );
}

// ── Context screen ─────────────────────────────────────────────────────────
function ContextScreen({ currentUser }) {
  const { LANES } = window.HANDOFF;
  const [selectedId, setSelectedId] = useState(LANES[0]?.id || null);
  const [syncing, setSyncing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [saving, setSaving] = useState(false);
  const [localVersion, setLocalVersion] = useState(0);

  const lane = LANES.find(l => l.id === selectedId) || LANES[0];

  // Patch a single lane in window.HANDOFF.LANES in-place, then force local re-render.
  // Avoids a full-app refresh (which resets currentUser to the default).
  const patchLane = (laneId, fields) => {
    const idx = window.HANDOFF.LANES.findIndex(l => l.id === laneId);
    if (idx !== -1) Object.assign(window.HANDOFF.LANES[idx], fields);
    setLocalVersion(v => v + 1);
  };

  const startEdit = () => {
    setEditText(lane.ai_context || '');
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditText('');
  };

  const saveEdit = async () => {
    if (!lane || saving) return;
    setSaving(true);
    const updated = await API.updateBranch(lane.dbId, { ai_context: editText });
    setSaving(false);
    setEditing(false);
    patchLane(lane.id, {
      ai_context: editText,
      ai_context_updated_at: updated.ai_context_updated_at || new Date().toISOString(),
      nodes_since_context_sync: 0,
    });
  };

  const sync = async () => {
    if (!lane || syncing) return;
    setSyncing(true);
    const updated = await API.syncContext(lane.dbId);
    setSyncing(false);
    patchLane(lane.id, {
      ai_context: updated.ai_context || '',
      ai_context_updated_at: updated.ai_context_updated_at || new Date().toISOString(),
      nodes_since_context_sync: 0,
    });
  };

  if (!lane) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 13 }}>
      No branches found.
    </div>
  );

  return (
    <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>

      {/* ── Sidebar ── */}
      <div style={{ width: 220, flex: '0 0 auto', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
        <div style={{ padding: '16px 14px 10px', borderBottom: '1px solid var(--border-soft)', flex: '0 0 auto' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>Context Docs</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.4 }}>AI-generated per-branch context, used as input for all AI features.</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
          {LANES.map(l => (
            <BranchItem key={l.id} lane={l} selected={l.id === selectedId} onClick={() => { setSelectedId(l.id); setEditing(false); }} />
          ))}
        </div>
      </div>

      {/* ── Main area ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 24px', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>{lane.name}</div>
            {lane.ai_context_updated_at && !editing && (
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Last synced {new Date(lane.ai_context_updated_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                {(lane.nodes_since_context_sync || 0) > 0 && (
                  <span style={{ marginLeft: 8, color: 'var(--amber)' }}>
                    · {lane.nodes_since_context_sync} new update{lane.nodes_since_context_sync !== 1 ? 's' : ''} since last sync
                  </span>
                )}
              </div>
            )}
          </div>

          {editing ? (
            <>
              <button className="btn btn-ghost" onClick={cancelEdit}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <>
              {lane.ai_context && (
                <button className="btn btn-ghost" onClick={startEdit}>
                  <Icon name="edit" size={14} /> Edit
                </button>
              )}
              <button className="btn btn-primary" onClick={sync} disabled={syncing} style={{ minWidth: 90 }}>
                {syncing ? (
                  <>
                    <span style={{ width: 13, height: 13, border: '2px solid #ffffff44', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin .7s linear infinite', display: 'inline-block', marginRight: 6 }} />
                    Syncing…
                  </>
                ) : (
                  <><Icon name="sparkle" size={14} /> {lane.ai_context ? 'Re-sync' : 'Sync'}</>
                )}
              </button>
            </>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px' }}>
          {editing ? (
            <textarea
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
              style={{
                width: '100%', height: '100%', minHeight: 400,
                padding: '14px 16px', resize: 'vertical',
                background: 'var(--bg)', border: '1px solid var(--border)',
                borderRadius: 8, color: 'var(--text)', fontSize: 13,
                lineHeight: 1.7, outline: 'none', fontFamily: 'var(--mono)',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <div style={{ maxWidth: 760 }}>
              <MarkdownView text={lane.ai_context} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

window.ContextScreen = ContextScreen;
