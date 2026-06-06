// handover.jsx — Screen 3: handover generation + structured report
const { useState: useStateH, useEffect: useEffectH, useRef: useRefH, useMemo: useMemoH } = React;

// ── Heuristic report builder (fallback when AI is unavailable) ─────────────
function buildReportFromData(branchData) {
  const { LANES, laneActivity, fmtDate } = window.HANDOFF;
  return LANES.map(lane => {
    const bd = branchData.find(b => b.branch.slug === lane.id);
    if (!bd) return { lane, act: laneActivity(lane.id), range: '—', decisions: [], refs: [], deadEnds: [], inProgress: [], openTasks: [], es: [] };
    const es = bd.nodes.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    const tasks = bd.tasks;
    const act = laneActivity(lane.id);
    const range = es.length ? `${fmtDate(es[0].created_at)} → ${fmtDate(es[es.length - 1].created_at)}` : '—';
    const deadEnds = es.filter(e => {
      const note = (e.metadata || {}).note || '';
      return e.type === 'note' && /dead end|reverted|broke|caused|disabled|conflict/i.test(note);
    });
    const inProgress = es.filter(e => {
      const note = (e.metadata || {}).note || '';
      return (e.type === 'idea' && /pending|progress|owed|not yet/i.test(note))
          || (e.type === 'note' && /still|not yet|in progress/i.test(note));
    });
    const excluded = new Set([...deadEnds, ...inProgress].map(e => e.id));
    const decisions = es.filter(e => !excluded.has(e.id) && (
      e.type === 'commit' ||
      (e.type === 'note' && /decision|→|adopted|raised|changed|switch/i.test((e.metadata || {}).note || ''))
    ));
    const refs = es.filter(e => e.type === 'link');
    const openTasks = tasks.filter(t => (t.metadata || {}).due && t.assignment_status !== 'done');
    // shape to match what HandoverReport expects
    const mapEntry = e => ({ ...e, note: (e.metadata || {}).note || e.content, hash: (e.metadata || {}).hash, title: (e.metadata || {}).title || e.content, refKind: (e.metadata || {}).refKind });
    const mapTask  = t => ({ id: t.id, label: t.content, state: new Date((t.metadata || {}).due + 'T00:00:00') < new Date() ? 'overdue' : 'active' });
    return { lane, act, range, es: es.map(mapEntry), decisions: decisions.map(mapEntry), refs: refs.map(mapEntry), deadEnds: deadEnds.map(mapEntry), inProgress: inProgress.map(mapEntry), openTasks: openTasks.map(mapTask) };
  });
}

// ── Markdown generator ─────────────────────────────────────────────────────
function buildMarkdown(report, person, fmtDate, NOW) {
  const lines = [];
  lines.push(`# Knowledge Handover — ${person.name}`);
  lines.push(`Generated: ${fmtDate(NOW, { month: 'long', day: 'numeric', year: 'numeric' })}${person.lastDay ? '  ·  Last day: ' + person.lastDay + ', ' + new Date(NOW).getFullYear() : ''}`);
  lines.push('');

  report.forEach(r => {
    lines.push(`---`);
    lines.push('');
    lines.push(`## ${r.lane.name}`);
    lines.push(`Timeline: ${r.range || '—'}  |  Status: ${r.act ? r.act.health : 'unknown'}`);
    lines.push('');

    if (!r.es || r.es.length === 0) {
      lines.push('*No entries recorded for this lane.*');
      lines.push('');
      return;
    }

    if (r.decisions && r.decisions.length) {
      lines.push('### Key decisions');
      r.decisions.forEach(d => {
        const note = typeof d === 'string' ? d : d.note;
        const hash = typeof d !== 'string' && d.hash ? ` (commit \`${d.hash}\`)` : '';
        lines.push(`- ${note}${hash}`);
      });
      lines.push('');
    }

    if (r.refs && r.refs.length) {
      lines.push('### References used');
      r.refs.forEach(ref => {
        const rk = typeof ref !== 'string' && ref.refKind ? `[${ref.refKind}] ` : '';
        const title = typeof ref === 'string' ? ref : ref.title;
        lines.push(`- ${rk}${title}`);
      });
      lines.push('');
    }

    if (r.deadEnds && r.deadEnds.length) {
      lines.push('### Dead ends');
      r.deadEnds.forEach(d => lines.push(`- ${typeof d === 'string' ? d : d.note}`));
      lines.push('');
    }

    if (r.inProgress && r.inProgress.length) {
      lines.push('### Still in progress');
      r.inProgress.forEach(d => lines.push(`- ${typeof d === 'string' ? d : d.note}`));
      lines.push('');
    }

    if (r.openTasks && r.openTasks.length) {
      lines.push('### Open tasks');
      r.openTasks.forEach(t => lines.push(`- [${t.state}] ${t.label || t.content}`));
      lines.push('');
    }
  });

  const gaps = report.filter(r => !r.es || r.es.length < 3);
  if (gaps.length) {
    lines.push('---');
    lines.push('');
    lines.push('## Coverage gaps');
    gaps.forEach(r => {
      const count = r.es ? r.es.length : 0;
      lines.push(`- **${r.lane.name}** — ${count === 0 ? 'no entries recorded.' : `only ${count} entr${count === 1 ? 'y' : 'ies'} recorded.`}`);
    });
  }

  return lines.join('\n');
}

// ── Report block ───────────────────────────────────────────────────────────
function ReportBlock({ title, items, render }) {
  if (!items || !items.length) return null;
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, fontSize: 13.5, lineHeight: 1.6, color: '#d2d2da' }}>
            <span style={{ color: 'var(--muted)', flex: '0 0 auto', userSelect: 'none' }}>•</span>
            <span style={{ textWrap: 'pretty' }}>{render(it)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Handover report view ───────────────────────────────────────────────────
function HandoverReport({ report, person, onClose }) {
  const { fmtDate, NOW } = window.HANDOFF;
  const [active, setActive] = useStateH(report[0] ? report[0].lane.id : '');
  const [toast, setToast] = useStateH(null);
  const scrollRef = useRefH(null);
  const gaps = report.filter(r => !r.es || r.es.length < 3);
  const totalEntries = report.reduce((n, r) => n + (r.es ? r.es.length : 0), 0);

  const ping = msg => { setToast(msg); setTimeout(() => setToast(null), 1900); };

  const copyMarkdown = async () => {
    const md = buildMarkdown(report, person, fmtDate, NOW);
    try {
      await navigator.clipboard.writeText(md);
      ping('Markdown copied to clipboard');
    } catch {
      // fallback
      const ta = document.createElement('textarea');
      ta.value = md;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      ping('Markdown copied to clipboard');
    }
  };

  const downloadMarkdown = () => {
    const md = buildMarkdown(report, person, fmtDate, NOW);
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `handover-${person.name.toLowerCase().replace(/\s+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    ping('Downloaded as Markdown');
  };

  const jump = id => {
    setActive(id);
    const el = scrollRef.current.querySelector(`#sec-${id}`);
    if (el) scrollRef.current.scrollTo({ top: el.offsetTop - 24, behavior: 'smooth' });
  };

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative', animation: 'fadeIn .25s ease both' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 22px', height: 56, borderBottom: '1px solid var(--border)', flex: '0 0 auto' }}>
        <button className="btn btn-ghost" onClick={onClose} style={{ paddingLeft: 8 }}>
          <span style={{ transform: 'rotate(180deg)', display: 'inline-flex' }}><Icon name="arrowRight" size={16} color="var(--muted-2)" /></span> Timeline
        </button>
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />
        <Icon name="doc" size={18} color="var(--purple)" />
        <div>
          <div style={{ fontSize: 14.5, fontWeight: 600 }}>Handover Report — {person.name}</div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
            Generated {fmtDate(NOW, { month: 'long', day: 'numeric', year: 'numeric' })} · {totalEntries} entries across {report.length} lanes
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={copyMarkdown}><Icon name="copy" size={15} color="var(--muted-2)" /> Copy as Markdown</button>
        <button className="btn" onClick={downloadMarkdown}><Icon name="download" size={15} color="var(--muted-2)" /> Download .md</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* sidebar */}
        <div style={{ width: 230, flex: '0 0 auto', borderRight: '1px solid var(--border)', padding: '20px 14px', overflowY: 'auto' }}>
          <div style={{ fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--muted)', padding: '0 10px 10px' }}>Contents</div>
          {report.map(r => (
            <button key={r.lane.id} onClick={() => jump(r.lane.id)} style={{
              display: 'flex', alignItems: 'center', gap: 9, width: '100%', textAlign: 'left', border: 'none', borderRadius: 8,
              background: active === r.lane.id ? '#ffffff0d' : 'transparent',
              color: active === r.lane.id ? 'var(--text)' : 'var(--muted-2)',
              padding: '8px 10px', fontSize: 13, fontWeight: active === r.lane.id ? 500 : 400,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', flex: '0 0 auto', background: r.act && r.act.health === 'active' ? 'var(--green)' : r.act && r.act.health === 'stalled' ? 'var(--amber)' : 'var(--muted)' }} />
              <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.lane.name}</span>
              {(!r.es || r.es.length < 3) && <Icon name="warn" size={13} color="var(--amber)" />}
            </button>
          ))}
        </div>

        {/* document */}
        <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '34px 0 60px' }}>
          <div style={{ width: 660, maxWidth: '90%', margin: '0 auto' }}>
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-.01em', marginBottom: 6 }}>Knowledge Handover</div>
            <div style={{ fontSize: 14, color: 'var(--muted-2)', marginBottom: 30 }}>
              Prepared for {person.name}'s transition{person.lastDay ? ` · last day ${person.lastDay}, ${new Date(NOW).getFullYear()}` : ''}
            </div>

            {report.map(r => (
              <div key={r.lane.id} id={`sec-${r.lane.id}`} style={{ marginBottom: 34, scrollMarginTop: 24 }}>
                <div style={{ height: 1, background: 'var(--border)', marginBottom: 14 }} />
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 600 }}>{r.lane.name}</span>
                  <Pill color={r.act && r.act.health === 'active' ? 'var(--green)' : r.act && r.act.health === 'stalled' ? 'var(--amber)' : 'var(--muted)'}>{r.act ? r.act.health : 'unknown'}</Pill>
                </div>
                <div style={{ fontSize: 12.5, color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 18 }}>Timeline: {r.range || '—'}</div>

                {(!r.es || r.es.length === 0) ? (
                  <div style={{ fontSize: 13.5, color: 'var(--muted)', fontStyle: 'italic', padding: '2px 0 4px' }}>No entries recorded for this lane.</div>
                ) : (
                  <>
                    <ReportBlock title="Key decisions" items={r.decisions} render={e => (
                      <>{typeof e === 'string' ? e : e.note} {e.hash && <span className="mono" style={{ color: 'var(--teal)' }}>Commit {e.hash}.</span>}</>
                    )} />
                    <ReportBlock title="References used" items={r.refs} render={e =>
                      typeof e === 'string' ? e : (
                        <><Pill color="var(--purple)" style={{ marginRight: 7, verticalAlign: 'middle' }}>{e.refKind}</Pill>{e.title}</>
                      )
                    } />
                    <ReportBlock title="Dead ends" items={r.deadEnds} render={e => typeof e === 'string' ? e : e.note} />
                    <ReportBlock title="Still in progress" items={r.inProgress} render={e => typeof e === 'string' ? e : e.note} />
                    {r.openTasks && r.openTasks.length > 0 && (
                      <div style={{ marginBottom: 4 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted-2)', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 9 }}>Open tasks</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {r.openTasks.map((t, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5 }}>
                              <Icon name="warn" size={14} color={t.state === 'overdue' ? 'var(--red)' : 'var(--blue)'} />
                              <span style={{ color: t.state === 'overdue' ? '#f0c8c7' : '#d2d2da' }}>{t.label || t.content}</span>
                              <Pill color={t.state === 'overdue' ? 'var(--red)' : 'var(--blue)'}>{t.state}</Pill>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {gaps.length > 0 && (
              <div style={{ marginTop: 10, border: '1px solid #EF9F2755', background: '#EF9F270d', borderRadius: 12, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 13 }}>
                  <Icon name="warn" size={18} color="var(--amber)" />
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--amber)' }}>Coverage gaps detected</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 9, marginBottom: 14 }}>
                  {gaps.map(r => (
                    <div key={r.lane.id} style={{ fontSize: 13.5, color: '#d2d2da' }}>
                      <b style={{ fontWeight: 600 }}>{r.lane.name}</b> — {!r.es || r.es.length === 0 ? 'no entries recorded.' : `only ${r.es.length} ${r.es.length === 1 ? 'entry' : 'entries'} recorded.`}
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: 13, color: 'var(--muted-2)', lineHeight: 1.6, textWrap: 'pretty' }}>
                  Consider asking {person.name.split(' ')[0]} to add context before their last day.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className="pop-in" style={{
          position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 95,
          background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '11px 16px', display: 'flex', alignItems: 'center', gap: 9,
          boxShadow: '0 14px 40px rgba(0,0,0,.5)',
        }}>
          <Icon name="check" size={15} color="var(--green)" /> <span style={{ fontSize: 13 }}>{toast}</span>
        </div>
      )}
    </div>
  );
}

// ── Select employee modal ──────────────────────────────────────────────────
function SelectModal({ onConfirm, onClose }) {
  const { PEOPLE } = window.HANDOFF;
  const [sel, setSel] = useStateH('jensen');
  const people = Object.keys(PEOPLE).filter(id => !PEOPLE[id].isManager);

  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 90, animation: 'fadeIn .15s ease both' }} />
      <div className="pop-in" style={{
        position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        width: 440, zIndex: 91, background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, boxShadow: '0 30px 80px rgba(0,0,0,.6)', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px 6px' }}>
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>Generate handover report</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Select the departing team member. AI will compile their lanes into a structured report.</div>
        </div>
        <div style={{ padding: '14px 14px 6px', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {people.map(id => {
            const p = PEOPLE[id];
            return (
              <button key={id} onClick={() => setSel(id)} style={{
                display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left',
                padding: '11px 12px', borderRadius: 10,
                background: sel === id ? '#7F77DD14' : 'transparent',
                border: `1px solid ${sel === id ? 'var(--purple)' : 'var(--border-soft)'}`,
              }}>
                <Avatar person={p} size={32} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8 }}>
                    {p.name}{p.departing && <Pill color="var(--red)">departing</Pill>}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{p.role}</div>
                </div>
                <span style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${sel === id ? 'var(--purple)' : 'var(--border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {sel === id && <span style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--purple)' }} />}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 9, padding: '14px 18px 18px' }}>
          <div style={{ flex: 1 }} />
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => onConfirm(sel)}>
            <Icon name="sparkle" size={15} /> Generate
          </button>
        </div>
      </div>
    </>
  );
}

// ── Generation loading screen ──────────────────────────────────────────────
const HO_STEPS = [
  'Reading entries across all lanes…',
  'Linking commits to decisions…',
  'Identifying dead ends and reversals…',
  'Detecting coverage gaps…',
  'Compiling the handover document…',
];

function Generating({ person, onDone, onError }) {
  const [step, setStep] = useStateH(0);
  const doneRef = useRefH(false);

  useEffectH(() => {
    // Start the real AI call immediately
    API.handover(person.id)
      .then(data => { if (!doneRef.current) { doneRef.current = true; onDone(data); } })
      .catch(err => { if (!doneRef.current) { doneRef.current = true; onError(err); } });
  }, []);

  useEffectH(() => {
    if (step < HO_STEPS.length - 1) {
      const id = setTimeout(() => setStep(s => s + 1), 900);
      return () => clearTimeout(id);
    }
  }, [step]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 30, animation: 'fadeIn .2s ease both' }}>
      <div style={{ position: 'relative', width: 64, height: 64 }}>
        <div style={{ position: 'absolute', inset: 0, border: '3px solid var(--border)', borderTopColor: 'var(--purple)', borderRadius: '50%', animation: 'spin .9s linear infinite' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="sparkle" size={24} color="var(--purple)" />
        </div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 5 }}>Compiling handover for {person.name}</div>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>This usually takes 5–10 seconds.</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: 360 }}>
        {HO_STEPS.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 11, fontSize: 13.5, color: i < step ? 'var(--muted)' : i === step ? 'var(--text)' : '#3a3a45', transition: 'color .3s' }}>
            {i < step
              ? <Icon name="check" size={16} color="var(--green)" />
              : i === step
                ? <span style={{ width: 16, height: 16, display: 'inline-flex' }}><span style={{ width: 8, height: 8, margin: 'auto', borderRadius: '50%', background: 'var(--purple)', animation: 'pulse 1s ease infinite' }} /></span>
                : <span style={{ width: 16, height: 16, display: 'inline-block' }}><span style={{ display: 'block', width: 7, height: 7, margin: 'auto', borderRadius: '50%', border: '1.5px solid #3a3a45' }} /></span>}
            {s}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Handover screen ────────────────────────────────────────────────────────
function HandoverScreen({ onClose }) {
  const { PEOPLE, LANES, laneActivity, fmtDate } = window.HANDOFF;
  const [phase, setPhase] = useStateH('select');  // select | generating | report
  const [personId, setPersonId] = useStateH('jensen');
  const [report, setReport] = useStateH(null);

  const person = PEOPLE[personId] || PEOPLE[Object.keys(PEOPLE)[0]];

  const handleGenerated = (apiData) => {
    let finalReport;
    if (apiData.source === 'ai' && apiData.sections) {
      // Map AI sections to report format
      finalReport = LANES.map(lane => {
        const sec = apiData.sections.find(s => s.branch_slug === lane.id);
        const act = laneActivity(lane.id);
        if (!sec) return { lane, act, range: '—', es: [], decisions: [], refs: [], deadEnds: [], inProgress: [], openTasks: [] };
        return {
          lane, act,
          range: '—',
          es: [...(sec.decisions || []), ...(sec.refs || []), ...(sec.dead_ends || []), ...(sec.in_progress || [])],
          decisions: (sec.decisions || []).map(d => ({ note: d.note, hash: d.hash })),
          refs: (sec.refs || []).map(r => ({ refKind: r.refKind, title: r.title })),
          deadEnds: (sec.dead_ends || []).map(d => ({ note: d.note })),
          inProgress: (sec.in_progress || []).map(d => ({ note: d.note })),
          openTasks: (sec.open_tasks || []).map(t => ({ id: t.id, label: t.label, state: t.state })),
        };
      });
    } else if (apiData.source === 'heuristic' && apiData.branch_data) {
      finalReport = buildReportFromData(apiData.branch_data);
    } else {
      finalReport = [];
    }
    setReport(finalReport);
    setPhase('report');
  };

  const handleError = () => {
    // Fall back to empty report
    setReport(LANES.map(lane => ({ lane, act: laneActivity(lane.id), range: '—', es: [], decisions: [], refs: [], deadEnds: [], inProgress: [], openTasks: [] })));
    setPhase('report');
  };

  if (phase === 'select')
    return (
      <div style={{ height: '100%', position: 'relative', background: 'var(--bg)' }}>
        <SelectModal
          onConfirm={id => { setPersonId(id); setPhase('generating'); }}
          onClose={onClose} />
      </div>
    );

  if (phase === 'generating')
    return <Generating person={person} onDone={handleGenerated} onError={handleError} />;

  return <HandoverReport report={report || []} person={person} onClose={onClose} />;
}

window.HandoverScreen = HandoverScreen;
