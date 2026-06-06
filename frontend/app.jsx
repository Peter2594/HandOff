// app.jsx — shell: persistent NavBar, role-based routing, user switcher
const { useState, useEffect } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "timelineStyle": "railway",
  "accent": "#7F77DD"
}/*EDITMODE-END*/;

// ── Profile settings modal ─────────────────────────────────────────────────
function ProfileModal({ userId, onClose, onSaved }) {
  const { PEOPLE } = window.HANDOFF;
  const person = PEOPLE[userId];
  const [departing, setDeparting] = useState(person ? person.departing : false);
  const [lastDay, setLastDay] = useState(person ? (person.lastDay || '') : '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  if (!person || person.isManager) return null;

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await API.updateUser(userId, { departing, last_day: lastDay || null });
      person.departing = departing;
      person.lastDay = lastDay;
      onSaved();
      onClose();
    } catch {
      setSaveError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 300, animation: 'fadeIn .15s ease both' }} />
      <div className="pop-in" style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 380, zIndex: 301, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: '0 30px 80px rgba(0,0,0,.6)', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px 6px' }}>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Profile settings</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{person.name}</div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', padding: '10px 12px', borderRadius: 8, border: `1px solid ${departing ? 'var(--red)' : 'var(--border)'}`, background: departing ? '#E24B4a0d' : 'var(--surface-2)' }}>
            <input type="checkbox" checked={departing} onChange={e => setDeparting(e.target.checked)}
              style={{ width: 16, height: 16, accentColor: 'var(--red)', cursor: 'pointer' }} />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500, color: departing ? '#f0c8c7' : 'var(--text)' }}>Mark as departing</div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>Enables handover export and shows departing badge</div>
            </div>
          </label>
          {departing && (
            <div style={{ marginTop: 12, animation: 'slideUp .15s ease both' }}>
              <label style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 6 }}>Last day (e.g. "Jun 13")</label>
              <input
                value={lastDay}
                onChange={e => setLastDay(e.target.value)}
                placeholder="Jun 13"
                style={{ width: '100%', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 11px', color: 'var(--text)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: 9, padding: '10px 18px 16px', flexWrap: 'wrap' }}>
          {saveError && <div style={{ width: '100%', fontSize: 12, color: 'var(--red)', marginBottom: 4 }}>{saveError}</div>}
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={saving} onClick={save}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </>
  );
}

// ── User switcher popover ──────────────────────────────────────────────────
function UserSwitcher({ currentUser, onSwitch, onRefresh }) {
  const { PEOPLE } = window.HANDOFF;
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const me = PEOPLE[currentUser];
  if (!me) return null;

  return (
    <div style={{ position: 'relative' }}>
      <button onClick={() => setOpen(s => !s)}
        style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '4px 9px', border: '1px solid var(--border)', borderRadius: 8, background: open ? 'var(--surface)' : 'transparent', cursor: 'pointer', color: 'var(--text)' }}>
        <Avatar person={me} size={20} ring />
        <span style={{ fontSize: 12.5, fontWeight: 500 }}>{me.name.split(' ')[0]}</span>
        <Icon name="chevDown" size={12} color="var(--muted)" />
      </button>

      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 200 }} />
          <div className="pop-in" style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)', width: 240, zIndex: 201,
            background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
            padding: 8, boxShadow: '0 14px 40px rgba(0,0,0,.5)',
          }}>
            <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--muted)', padding: '4px 8px 8px' }}>View as</div>
            {Object.values(PEOPLE).map(p => (
              <button key={p.id} onClick={() => { onSwitch(p.id); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', background: p.id === currentUser ? '#ffffff10' : 'none', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--text)', fontSize: 12.5 }}
                onMouseEnter={e => e.currentTarget.style.background = '#ffffff0d'}
                onMouseLeave={e => e.currentTarget.style.background = p.id === currentUser ? '#ffffff10' : 'none'}>
                <Avatar person={p} size={22} ring={p.id === currentUser} />
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <div style={{ fontWeight: p.id === currentUser ? 600 : 400 }}>{p.name}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>
                    {p.isManager ? 'Manager' : 'Employee'}{p.departing ? ' · departing' : ''}
                  </div>
                </div>
                {p.id === currentUser && <Icon name="check" size={14} color="var(--purple)" />}
              </button>
            ))}
            {!me.isManager && (
              <>
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 0' }} />
                <button onClick={() => { setOpen(false); setProfileOpen(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', border: 'none', borderRadius: 7, cursor: 'pointer', color: 'var(--muted-2)', fontSize: 12.5, background: 'none' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#ffffff0d'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}>
                  <Icon name="edit" size={14} color="var(--muted)" />
                  Profile settings
                </button>
              </>
            )}
          </div>
        </>
      )}

      {profileOpen && (
        <ProfileModal
          userId={currentUser}
          onClose={() => setProfileOpen(false)}
          onSaved={onRefresh}
        />
      )}
    </div>
  );
}

// ── Overdue badge on My Tasks tab ──────────────────────────────────────────
function OverdueBadge({ currentUser }) {
  const count = (window.HANDOFF.TASKS || []).filter(t => t.assigned_to === currentUser && t.state === 'overdue').length;
  if (!count) return null;
  return (
    <span style={{ marginLeft: 5, width: 16, height: 16, borderRadius: '50%', background: 'var(--red)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{count}</span>
  );
}

// ── Persistent nav bar ─────────────────────────────────────────────────────
function NavBar({ currentUser, onSwitchUser, screen, onGoTo, onRefresh, selectedBranchId, onSelectBranch }) {
  const { PEOPLE, PROJECT, LANES } = window.HANDOFF;
  const me = PEOPLE[currentUser];
  const isManager = me && me.isManager;

  const tabs = isManager
    ? [
        { id: 'timeline', label: 'Timeline'  },
        { id: 'manager',  label: 'Dashboard' },
        { id: 'context',  label: 'Context'   },
      ]
    : [
        { id: 'timeline', label: 'Timeline'  },
        { id: 'log',      label: 'My Log'    },
        { id: 'tasks',    label: 'My Tasks'  },
        { id: 'context',  label: 'Context'   },
      ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', height: 44, borderBottom: '1px solid var(--border)', padding: '0 22px', flex: '0 0 auto', gap: 10, background: 'var(--bg)', position: 'relative', zIndex: 100 }}>
      {/* Logo + project */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 20, height: 20, borderRadius: 5, background: 'var(--purple)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff' }}>H</div>
        <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>Handoff</span>
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--border)', margin: '0 2px' }} />

      {/* Role-based tabs */}
      <div style={{ display: 'flex', gap: 2 }}>
        {tabs.map(tab => {
          const active = screen === tab.id;
          return (
            <button key={tab.id} onClick={() => onGoTo(tab.id)} style={{
              display: 'inline-flex', alignItems: 'center', padding: '5px 12px', border: 'none',
              borderRadius: 7, fontSize: 12.5, fontWeight: active ? 600 : 400, cursor: 'pointer',
              background: active ? 'var(--surface-2)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--muted)',
            }}>
              {tab.label}
              {tab.id === 'tasks' && <OverdueBadge currentUser={currentUser} />}
            </button>
          );
        })}
      </div>

      {/* Branch filter — timeline only */}
      {screen === 'timeline' && LANES && LANES.length > 1 && (
        <div style={{ position: 'relative' }}>
          <select
            value={selectedBranchId || ''}
            onChange={e => onSelectBranch(e.target.value || null)}
            style={{ padding: '4px 26px 4px 9px', background: 'var(--surface)', border: `1px solid ${selectedBranchId ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 7, color: selectedBranchId ? 'var(--text)' : 'var(--muted)', fontSize: 12.5, outline: 'none', appearance: 'none', cursor: 'pointer' }}>
            <option value="">All branches</option>
            {LANES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
          <span style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <Icon name="chevDown" size={11} color="var(--muted)" />
          </span>
        </div>
      )}

      <div style={{ flex: 1 }} />

      {/* Role pill */}
      <Pill color={isManager ? 'var(--blue)' : me && me.departing ? 'var(--red)' : 'var(--teal)'} style={{ fontSize: 10.5 }}>
        {isManager ? 'Manager' : me && me.departing ? 'Departing' : 'Employee'}
      </Pill>

      <UserSwitcher currentUser={currentUser} onSwitchUser={onSwitchUser} onSwitch={onSwitchUser} onRefresh={onRefresh} />
    </div>
  );
}

// ── App ────────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useState('timeline');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [currentUser, setCurrentUser] = useState('jensen');
  const [selectedBranchId, setSelectedBranchId] = useState(null);

  useEffect(() => { document.documentElement.style.setProperty('--purple', t.accent); }, [t.accent]);

  useEffect(() => {
    setLoading(true);
    loadHandoffData()
      .then(() => {
        // Re-apply current user after reload (data reload resets CURRENT_USER)
        window.HANDOFF.CURRENT_USER = currentUser;
        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [dataVersion]);

  const refresh = () => setDataVersion(v => v + 1);

  const switchUser = (userId) => {
    setCurrentUser(userId);
    window.HANDOFF.CURRENT_USER = userId;
    const person = window.HANDOFF?.PEOPLE?.[userId];
    const isManager = person?.isManager;
    // redirect to appropriate default screen
    if (isManager && (screen === 'log' || screen === 'tasks')) setScreen('manager');
    if (!isManager && screen === 'manager') setScreen('timeline');
  };

  const goTo = (screenId) => setScreen(screenId);

  if (loading) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
      <div style={{ width: 36, height: 36, border: '3px solid var(--border)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin .8s linear infinite' }} />
      <span style={{ fontSize: 13, color: 'var(--muted)' }}>Loading Handoff…</span>
    </div>
  );

  if (error) return (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
      <Icon name="warn" size={24} color="var(--red)" />
      <span style={{ fontSize: 13, color: 'var(--muted-2)', maxWidth: 360, textAlign: 'center' }}>Could not connect to backend: {error}</span>
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Make sure <span className="mono">python app.py</span> is running on port 5001.</span>
      <button className="btn btn-primary" onClick={refresh}>Retry</button>
    </div>
  );

  const me = window.HANDOFF.PEOPLE[currentUser];
  const isManager = me?.isManager;
  const canHandover = isManager || me?.departing;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <NavBar currentUser={currentUser} onSwitchUser={switchUser} screen={screen} onGoTo={goTo} onRefresh={refresh} selectedBranchId={selectedBranchId} onSelectBranch={setSelectedBranchId} />

      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {screen === 'timeline' && (
          <TimelineScreen
            styleVariant={t.timelineStyle}
            currentUser={currentUser}
            selectedBranchId={selectedBranchId}
            onGenerateHandover={canHandover ? () => setScreen('handover') : null}
            onRefresh={refresh} />
        )}
        {screen === 'log' && !isManager && (
          <PersonalLogScreen currentUser={currentUser} onRefresh={refresh} />
        )}
        {screen === 'tasks' && !isManager && (
          <TaskListScreen currentUser={currentUser} onRefresh={refresh} />
        )}
        {screen === 'manager' && isManager && (
          <ManagerDashboard currentUser={currentUser} onRefresh={refresh} />
        )}
        {screen === 'context' && (
          <ContextScreen currentUser={currentUser} />
        )}
        {screen === 'handover' && (
          <HandoverScreen currentUser={currentUser} onClose={() => goTo(isManager ? 'manager' : 'timeline')} />
        )}
      </div>

      <TweaksPanel>
        <TweakSection label="Timeline style" />
        <TweakRadio label="Layout" value={t.timelineStyle}
          options={['railway', 'dense', 'bands']}
          onChange={v => setTweak('timelineStyle', v)} />
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, padding: '2px 2px 4px' }}>
          {t.timelineStyle === 'railway' && 'Railway map — thin tracks, circular entry nodes, tasks hanging below.'}
          {t.timelineStyle === 'dense'   && 'Dense — compact lanes and smaller nodes to fit more on screen.'}
          {t.timelineStyle === 'bands'   && 'Bands — alternating lane shading and heavier tracks for scannability.'}
        </div>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={['#7F77DD', '#378ADD', '#1D9E75', '#EF9F27']}
          onChange={v => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
