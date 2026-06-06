// task-list.jsx — employee's assigned task list
const { useState: useStateTL, useMemo: useMemoTL } = React;

function TaskListScreen({ currentUser, onRefresh }) {
  const { TASKS, LANES, PEOPLE, TASK_META, fmtDate, relTime } = window.HANDOFF;
  const [sortBy, setSortBy] = useStateTL('due');
  const [filterStatus, setFilterStatus] = useStateTL('all');
  const [saving, setSaving] = useStateTL(null);

  const me = PEOPLE[currentUser];

  // Tasks assigned to current user (excluding completed by default)
  const myTasks = useMemoTL(() => {
    return TASKS.filter(t => t.assigned_to === currentUser);
  }, [currentUser, TASKS]);

  // Tasks this user created and assigned to someone else
  const delegated = useMemoTL(() => {
    return TASKS.filter(t => t.by === currentUser && t.assigned_to && t.assigned_to !== currentUser);
  }, [currentUser, TASKS]);

  const filtered = useMemoTL(() => {
    if (filterStatus === 'all') return myTasks;
    return myTasks.filter(t => t.state === filterStatus);
  }, [myTasks, filterStatus]);

  const sorted = useMemoTL(() => {
    return [...filtered].sort((a, b) => {
      if (sortBy === 'status') {
        const ord = { overdue: 0, active: 1, completed: 2 };
        if (ord[a.state] !== ord[b.state]) return ord[a.state] - ord[b.state];
      }
      if (!a.due && !b.due) return new Date(a.date) - new Date(b.date);
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

  const overdueCount = myTasks.filter(t => t.state === 'overdue').length;
  const activeCount  = myTasks.filter(t => t.state === 'active').length;
  const doneCount    = myTasks.filter(t => t.state === 'completed').length;

  const selStyle = { appearance: 'none', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 7, padding: '6px 28px 6px 11px', color: 'var(--text)', fontSize: 12.5, outline: 'none', cursor: 'pointer' };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      {/* Header */}
      <div style={{ padding: '20px 28px 16px', borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 14 }}>
          <div style={{ fontSize: 20, fontWeight: 700 }}>My Tasks</div>
          {me && me.departing && <Pill color="var(--red)">departing · last day {me.lastDay}</Pill>}
        </div>

        {/* Stat pills */}
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { label: 'Overdue', count: overdueCount, color: 'var(--red)', key: 'overdue' },
            { label: 'Active',  count: activeCount,  color: 'var(--blue)', key: 'active' },
            { label: 'Done',    count: doneCount,    color: 'var(--green)', key: 'completed' },
          ].map(s => (
            <button key={s.key} onClick={() => setFilterStatus(filterStatus === s.key ? 'all' : s.key)}
              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, border: `1px solid ${filterStatus === s.key ? s.color : 'var(--border)'}`, background: filterStatus === s.key ? s.color + '18' : 'var(--surface)', cursor: 'pointer', color: 'var(--text)' }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: s.color, fontVariantNumeric: 'tabular-nums' }}>{s.count}</span>
              <span style={{ fontSize: 12, color: 'var(--muted-2)' }}>{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 28px', borderBottom: '1px solid var(--border-soft)', flex: '0 0 auto' }}>
        <span style={{ fontSize: 12, color: 'var(--muted)', flex: 1 }}>{sorted.length} task{sorted.length !== 1 ? 's' : ''}</span>
        <div style={{ position: 'relative' }}>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
            <option value="due">Sort by due date</option>
            <option value="status">Sort by status</option>
          </select>
          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}><Icon name="chevDown" size={12} color="var(--muted)" /></span>
        </div>
      </div>

      {/* Task list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 28px 32px' }}>
        {sorted.length === 0 ? (
          <div style={{ fontSize: 14, color: 'var(--muted)', fontStyle: 'italic', padding: '32px 0', textAlign: 'center' }}>
            {filterStatus === 'all' ? 'No tasks assigned to you.' : `No ${filterStatus} tasks.`}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {sorted.map(task => {
              const tm = TASK_META[task.state];
              const lane = LANES.find(l => l.id === task.lane);
              const assigner = PEOPLE[task.by];
              const isSaving = saving === task.id;

              return (
                <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'var(--surface)', border: `1px solid ${task.state === 'overdue' ? '#E24B4A33' : 'var(--border)'}`, borderRadius: 10, transition: 'border-color .14s' }}>
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: tm.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                    <Icon name={task.state === 'overdue' ? 'warn' : task.state === 'completed' ? 'check' : 'clock'} size={14} color={tm.color} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 500, color: task.state === 'completed' ? 'var(--muted-2)' : 'var(--text)', textDecoration: task.state === 'completed' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {task.label}
                    </div>
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {lane && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', flex: '0 0 auto' }} />{lane.name}</>}
                      {assigner && <><span>·</span><span>by {assigner.name}</span></>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                    {task.due ? (
                      <>
                        <div style={{ fontSize: 12.5, fontWeight: 500, color: task.state === 'overdue' ? 'var(--red)' : 'var(--muted-2)' }}>{fmtDate(task.due + 'T00:00:00')}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>due</div>
                      </>
                    ) : (
                      <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>no due date</span>
                    )}
                  </div>
                  <Pill color={tm.color}>{tm.label}</Pill>
                  {task.state !== 'completed' && (
                    <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 10px', flex: '0 0 auto' }}
                      disabled={isSaving} onClick={() => markDone(task)}>
                      {isSaving ? '…' : <><Icon name="check" size={13} color="var(--green)" /> Mark done</>}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Delegated by me */}
        {delegated.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', marginBottom: 10 }}>
              Delegated by me ({delegated.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {delegated.map(task => {
                const tm = TASK_META[task.state];
                const lane = LANES.find(l => l.id === task.lane);
                const assignee = PEOPLE[task.assigned_to];
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, opacity: task.state === 'completed' ? 0.6 : 1 }}>
                    <span style={{ width: 28, height: 28, borderRadius: '50%', background: tm.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', flex: '0 0 auto' }}>
                      <Icon name={task.state === 'overdue' ? 'warn' : task.state === 'completed' ? 'check' : 'clock'} size={14} color={tm.color} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 500, color: task.state === 'completed' ? 'var(--muted-2)' : 'var(--text)', textDecoration: task.state === 'completed' ? 'line-through' : 'none', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {task.label}
                      </div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 8 }}>
                        {lane && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', flex: '0 0 auto' }} />{lane.name}</>}
                        {assignee && (
                          <>
                            <span>·</span>
                            <Avatar person={assignee} size={14} />
                            <span>{assignee.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flex: '0 0 auto' }}>
                      {task.due ? (
                        <>
                          <div style={{ fontSize: 12.5, fontWeight: 500, color: task.state === 'overdue' ? 'var(--red)' : 'var(--muted-2)' }}>{fmtDate(task.due + 'T00:00:00')}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>due</div>
                        </>
                      ) : (
                        <span style={{ fontSize: 11.5, color: 'var(--muted)' }}>no due date</span>
                      )}
                    </div>
                    <Pill color={tm.color}>{tm.label}</Pill>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

window.TaskListScreen = TaskListScreen;
