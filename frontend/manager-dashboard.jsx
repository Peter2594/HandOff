// manager-dashboard.jsx — manager's view: assignment table + team activity feed
const { useState: useMD, useEffect: useEffectMD, useMemo: useMemoMD } = React;

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({ label, value, color, suffix }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 10, minWidth: 130 }}>
      <span style={{ fontSize: 26, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>{value}</span>
      <div>
        <div style={{ fontSize: 12, color: 'var(--muted-2)', lineHeight: 1.3 }}>{label}</div>
        {suffix && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{suffix}</div>}
      </div>
    </div>
  );
}

// ── Activity node card ─────────────────────────────────────────────────────
function ActivityCard({ node }) {
  const { TYPE_META, relTime } = window.HANDOFF;
  const typeMap = { idea: 'experiment', link: 'reference' };
  const frontType = typeMap[node.type] || node.type;
  const m = TYPE_META[frontType] || TYPE_META.note;
  const title = (node.metadata || {}).title || node.content;

  return (
    <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--surface)', border: '1px solid var(--border-soft)', borderRadius: 8 }}>
      {/* User avatar */}
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: (node.user_color || '#7F77DD') + '22', color: node.user_color || '#7F77DD', border: `1px solid ${node.user_color || '#7F77DD'}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 600, flex: '0 0 auto' }}>
        {node.user_initials || '?'}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted-2)' }}>{node.user_name}</span>
          <span style={{ fontSize: 10.5, color: 'var(--muted)' }}>in</span>
          <span style={{ fontSize: 11.5, color: 'var(--text)', fontWeight: 500 }}>{node.branch_name}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ color: m.color, display: 'inline-flex', flex: '0 0 auto' }}><Icon name={m.glyph} size={12} /></span>
          <span style={{ fontSize: 12.5, color: '#d2d2da', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</span>
        </div>
      </div>

      <span style={{ fontSize: 11, color: 'var(--muted)', whiteSpace: 'nowrap', flex: '0 0 auto' }}>{relTime(node.created_at)}</span>
    </div>
  );
}

// ── Assignment task row ────────────────────────────────────────────────────
function AssignmentRow({ task, onMarkDone, onRefresh }) {
  const { LANES, PEOPLE, TASK_META, fmtDate } = window.HANDOFF;
  const [saving, setSaving] = useMD(false);
  const [reassignOpen, setReassignOpen] = useMD(false);
  const tm = TASK_META[task.state];
  const lane = LANES.find(l => l.id === task.lane);
  const assignee = PEOPLE[task.assigned_to];
  const employees = Object.values(PEOPLE).filter(p => !p.isManager);

  const reassign = async (userId) => {
    setSaving(true);
    await API.updateNode(task.nodeId, { assigned_to: userId, assignment_status: 'pending' });
    setSaving(false);
    setReassignOpen(false);
    onRefresh();
  };

  return (
    <tr style={{ borderBottom: '1px solid var(--border-soft)' }}>
      {/* Branch */}
      <td style={{ padding: '11px 14px', fontSize: 12.5, color: 'var(--muted-2)', whiteSpace: 'nowrap' }}>
        {lane && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', display: 'inline-block', marginRight: 6, verticalAlign: 'middle' }} />{lane.name}</>}
      </td>

      {/* Content */}
      <td style={{ padding: '11px 14px', fontSize: 13.5, color: task.state === 'completed' ? 'var(--muted)' : 'var(--text)', textDecoration: task.state === 'completed' ? 'line-through' : 'none', maxWidth: 240 }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.label}</div>
      </td>

      {/* Assigned to */}
      <td style={{ padding: '11px 14px', position: 'relative' }}>
        {assignee ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <Avatar person={assignee} size={20} />
            <span style={{ fontSize: 12.5 }}>{assignee.name.split(' ')[0]}</span>
          </div>
        ) : (
          <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>unassigned</span>
        )}
      </td>

      {/* Due date */}
      <td style={{ padding: '11px 14px', fontSize: 12.5, color: task.state === 'overdue' ? 'var(--red)' : 'var(--muted-2)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
        {task.due ? fmtDate(task.due + 'T00:00:00') : <span style={{ color: 'var(--muted)' }}>—</span>}
      </td>

      {/* Status */}
      <td style={{ padding: '11px 14px' }}>
        <Pill color={tm.color}>{tm.label}</Pill>
      </td>

      {/* Actions */}
      <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
        <div style={{ display: 'flex', gap: 6, position: 'relative' }}>
          {task.state !== 'completed' && (
            <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '4px 9px' }} disabled={saving} onClick={onMarkDone}>
              <Icon name="check" size={12} color="var(--green)" /> Done
            </button>
          )}
          <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost" style={{ fontSize: 11.5, padding: '4px 9px' }} onClick={() => setReassignOpen(s => !s)}>
              Reassign <Icon name="chevDown" size={11} color="var(--muted)" />
            </button>
            {reassignOpen && (
              <>
                <div onClick={() => setReassignOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 80 }} />
                <div className="pop-in" style={{ position: 'absolute', right: 0, top: 'calc(100% + 4px)', width: 180, zIndex: 81, background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, padding: 6, boxShadow: '0 12px 32px rgba(0,0,0,.5)' }}>
                  {employees.map(p => (
                    <button key={p.id} onClick={() => reassign(p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 8px', background: p.id === task.assigned_to ? '#ffffff10' : 'none', border: 'none', borderRadius: 6, cursor: 'pointer', color: 'var(--text)', fontSize: 12.5 }}
                      onMouseEnter={e => e.currentTarget.style.background = '#ffffff0d'}
                      onMouseLeave={e => e.currentTarget.style.background = p.id === task.assigned_to ? '#ffffff10' : 'none'}>
                      <Avatar person={p} size={18} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{p.name.split(' ')[0]}</span>
                      {p.id === task.assigned_to && <Icon name="check" size={12} color="var(--purple)" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

// ── Manager dashboard ──────────────────────────────────────────────────────
function ManagerDashboard({ currentUser, onRefresh }) {
  const { TASKS, PEOPLE, TASK_META } = window.HANDOFF;
  const [activity, setActivity] = useMD([]);
  const [actLoading, setActLoading] = useMD(true);
  const [empFilter, setEmpFilter] = useMD('all');
  const [sortBy, setSortBy] = useMD('status');
  const [saving, setSaving] = useMD(null);

  useEffectMD(() => {
    fetch('/api/activity?limit=20')
      .then(r => r.json())
      .then(d => { setActivity(d); setActLoading(false); })
      .catch(() => setActLoading(false));
  }, []);

  // All tasks where this manager assigned them
  const myTasks = useMemoMD(() => TASKS.filter(t => t.by === currentUser), [currentUser, TASKS]);

  const filtered = useMemoMD(() => empFilter === 'all' ? myTasks : myTasks.filter(t => t.assigned_to === empFilter), [myTasks, empFilter]);

  const sorted = useMemoMD(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'status') {
        const ord = { overdue: 0, active: 1, completed: 2 };
        if (ord[a.state] !== ord[b.state]) return ord[a.state] - ord[b.state];
      }
      if (!a.due && !b.due) return 0;
      if (!a.due) return 1;
      if (!b.due) return -1;
      return new Date(a.due) - new Date(b.due);
    });
  }, [filtered, sortBy]);

  const markDone = async (task) => {
    setSaving(task.id);
    await API.updateNode(task.nodeId, { assignment_status: 'done' });
    setSaving(null);
    onRefresh();
  };

  const overdueCount  = myTasks.filter(t => t.state === 'overdue').length;
  const activeCount   = myTasks.filter(t => t.state === 'active').length;
  const assigneeIds   = [...new Set(myTasks.map(t => t.assigned_to).filter(Boolean))];

  const selStyle = { appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 28px 6px 11px', color: 'var(--text)', fontSize: 12.5, outline: 'none', cursor: 'pointer' };
  const thStyle = { padding: '8px 14px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', textAlign: 'left', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
        <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 14 }}>Manager Dashboard</div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <StatCard label="Overdue tasks"    value={overdueCount} color="var(--red)" />
          <StatCard label="Active tasks"     value={activeCount}  color="var(--blue)" />
          <StatCard label="Assigned to"      value={assigneeIds.length} color="var(--purple)" suffix="team members" />
        </div>
      </div>

      {/* Two-column body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* ── Left: Assignment table ── */}
        <div style={{ flex: 1, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Table controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '13px 20px', borderBottom: '1px solid var(--border-soft)', flex: '0 0 auto' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600, flex: 1 }}>Assignments</span>

            <div style={{ position: 'relative' }}>
              <select value={empFilter} onChange={e => setEmpFilter(e.target.value)} style={selStyle}>
                <option value="all">All team members</option>
                {assigneeIds.map(id => PEOPLE[id] && (
                  <option key={id} value={id}>{PEOPLE[id].name}</option>
                ))}
              </select>
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="chevDown" size={12} color="var(--muted)" /></span>
            </div>

            <div style={{ position: 'relative' }}>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
                <option value="status">Sort by status</option>
                <option value="due">Sort by due date</option>
              </select>
              <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="chevDown" size={12} color="var(--muted)" /></span>
            </div>
          </div>

          {/* Table */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {sorted.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic', padding: '32px 20px' }}>No tasks assigned yet.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={thStyle}>Branch</th>
                    <th style={thStyle}>Task</th>
                    <th style={thStyle}>Assigned to</th>
                    <th style={thStyle}>Due</th>
                    <th style={thStyle}>Status</th>
                    <th style={{ ...thStyle, borderLeft: '1px solid var(--border-soft)' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map(task => (
                    <AssignmentRow key={task.id} task={task}
                      onMarkDone={() => markDone(task)}
                      onRefresh={onRefresh} />
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ── Right: Activity feed ── */}
        <div style={{ width: 340, flex: '0 0 auto', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '13px 18px', borderBottom: '1px solid var(--border-soft)', flex: '0 0 auto' }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>Team activity</span>
            <span style={{ fontSize: 11.5, color: 'var(--muted)', marginLeft: 8 }}>recent 20</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 7 }}>
            {actLoading ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', padding: '16px 4px' }}>Loading…</div>
            ) : activity.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', padding: '16px 4px' }}>No activity yet.</div>
            ) : (
              activity.map((node, i) => <ActivityCard key={i} node={node} />)
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

window.ManagerDashboard = ManagerDashboard;
