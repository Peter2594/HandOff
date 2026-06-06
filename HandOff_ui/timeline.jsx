// timeline.jsx — Screen 1: horizontal railway-map timeline. Exposed as window.TimelineScreen
const { useState, useRef, useCallback } = React;

// ---- entry hover popover ----
function EntryPopover({ e, down }) {
  const { TYPE_META, PEOPLE, fmtTime } = window.HANDOFF;
  const m = TYPE_META[e.type];
  const who = PEOPLE[e.author];
  return (
    <div className="pop-in" style={{
      position: 'absolute', ...(down ? { top: 'calc(100% + 10px)' } : { bottom: 'calc(100% + 10px)' }),
      left: '50%', transform: 'translateX(-50%)',
      width: 268, background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 10, padding: '11px 12px', boxShadow: '0 12px 34px rgba(0,0,0,.55)',
      zIndex: 60, pointerEvents: 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
        <span style={{ display:'inline-flex', color: m.color }}><Icon name={m.glyph} size={13} /></span>
        <span style={{ fontSize: 11, fontWeight: 600, color: m.color, textTransform: 'uppercase', letterSpacing: '.04em' }}>{m.label}</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--muted)' }}>{fmtTime(e.date)}</span>
      </div>
      {e.hash && <div className="mono" style={{ fontSize: 11.5, color: 'var(--teal)', marginBottom: 4 }}>{e.hash}</div>}
      {e.metric && e.metric !== 'pending' && <div className="mono" style={{ fontSize: 11.5, color: 'var(--amber)', marginBottom: 4 }}>{e.metric}</div>}
      <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.4, marginBottom: 7, textWrap: 'pretty' }}>{e.title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--muted-2)', lineHeight: 1.5, fontStyle: 'italic', borderLeft: `2px solid ${m.color}55`, paddingLeft: 8, textWrap: 'pretty' }}>“{e.note}”</div>
      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop: 9, fontSize: 11, color: 'var(--muted)' }}>
        <Avatar person={who} size={16} /> {who.name}
      </div>
    </div>
  );
}

// ---- side drawer (expanded detail) ----
function EntryDrawer({ e, onClose }) {
  const { TYPE_META, PEOPLE, LANES, fmtTime, relTime, ENTRIES } = window.HANDOFF;
  const m = TYPE_META[e.type];
  const who = PEOPLE[e.author];
  const lane = LANES.find(l => l.id === e.lane);
  const related = ENTRIES.filter(x => x.lane === e.lane && x.id !== e.id)
    .sort((a,b)=> new Date(b.date)-new Date(a.date)).slice(0,4);
  return (
    <>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.45)', zIndex: 80, animation:'fadeIn .15s ease both' }} />
      <div style={{
        position:'absolute', top:0, right:0, bottom:0, width: 408, zIndex: 81,
        background:'var(--surface)', borderLeft:'1px solid var(--border)',
        boxShadow:'-18px 0 50px rgba(0,0,0,.5)', animation:'slideInRight .22s cubic-bezier(.2,.8,.2,1) both',
        display:'flex', flexDirection:'column',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'16px 18px', borderBottom:'1px solid var(--border-soft)' }}>
          <span style={{ width:30, height:30, borderRadius:8, background:m.color+'1f', color:m.color, display:'flex', alignItems:'center', justifyContent:'center' }}><Icon name={m.glyph} size={16} /></span>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12.5, fontWeight:600, color:m.color }}>{m.label}</div>
            <div style={{ fontSize:11, color:'var(--muted)' }}>{lane.name}</div>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><Icon name="close" size={16} color="var(--muted-2)" /></button>
        </div>

        <div style={{ padding:'18px', overflowY:'auto', flex:1 }}>
          <div style={{ fontSize:18, fontWeight:600, lineHeight:1.35, marginBottom:12, textWrap:'pretty' }}>{e.title}</div>

          {e.hash && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 11px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, marginBottom:14 }}>
              <Icon name="github" size={15} color="var(--muted-2)" />
              <span className="mono" style={{ fontSize:13, color:'var(--teal)' }}>{e.hash}</span>
              <span style={{ marginLeft:'auto', fontSize:11, color:'var(--muted)' }}>linked from GitHub</span>
            </div>
          )}
          {e.metric && (
            <div style={{ display:'inline-flex', marginBottom:14 }}>
              <Pill color="var(--amber)" style={{ fontSize:12.5, padding:'4px 11px' }}>{e.metric === 'pending' ? 'result pending' : e.metric}</Pill>
            </div>
          )}
          {e.refKind && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'9px 11px', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, marginBottom:14 }}>
              <Pill color="var(--purple)">{e.refKind}</Pill>
              <span style={{ fontSize:12, color:'var(--purple)', textDecoration:'underline', textUnderlineOffset:2 }}>open reference</span>
            </div>
          )}

          <div style={{ fontSize:13.5, lineHeight:1.65, color:'#d6d6dd', marginBottom:18, textWrap:'pretty' }}>{e.body}</div>

          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--muted)', marginBottom:7 }}>Annotation</div>
          <div style={{ fontSize:13, lineHeight:1.55, fontStyle:'italic', color:'var(--muted-2)', borderLeft:`2px solid ${m.color}66`, paddingLeft:11, marginBottom:20, textWrap:'pretty' }}>“{e.note}”</div>

          <div style={{ display:'flex', alignItems:'center', gap:9, paddingTop:14, borderTop:'1px solid var(--border-soft)' }}>
            <Avatar person={who} size={28} />
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12.5, fontWeight:500 }}>{who.name}</div>
              <div style={{ fontSize:11, color:'var(--muted)' }}>{who.role}</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11.5, color:'var(--muted)' }}>
              <Icon name="clock" size={13} /> {fmtTime(e.date)} · {relTime(e.date)}
            </div>
          </div>

          {related.length > 0 && (
            <div style={{ marginTop:22 }}>
              <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--muted)', marginBottom:9 }}>More in this lane</div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {related.map(r => {
                  const rm = TYPE_META[r.type];
                  return (
                    <div key={r.id} style={{ display:'flex', alignItems:'center', gap:9, padding:'8px 10px', background:'var(--bg)', border:'1px solid var(--border-soft)', borderRadius:8 }}>
                      <span style={{ width:7, height:7, borderRadius:'50%', background:rm.color, flex:'0 0 auto' }} />
                      <span style={{ fontSize:12, color:'#c7c7d0', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{r.title}</span>
                      <span style={{ marginLeft:'auto', fontSize:10.5, color:'var(--muted)', whiteSpace:'nowrap' }}>{relTime(r.date)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---- quick-add popover (manager drops a task) ----
function QuickAdd({ pos, lane, onClose }) {
  const { fmtDate } = window.HANDOFF;
  return (
    <>
      <div onClick={onClose} style={{ position:'fixed', inset:0, zIndex:70 }} />
      <div className="pop-in" style={{
        position:'absolute', left: pos.px, top: pos.py, transform:'translate(-50%, 8px)',
        width: 244, zIndex:71, background:'var(--surface-2)', border:'1px solid var(--border)',
        borderRadius:10, padding:'13px', boxShadow:'0 14px 40px rgba(0,0,0,.55)',
      }}>
        <div style={{ fontSize:11, color:'var(--muted)', marginBottom:9 }}>
          New task · <b style={{ color:'var(--text)', fontWeight:600 }}>{lane.name}</b> · {fmtDate(pos.date)}
        </div>
        <input autoFocus placeholder="Task label…" style={{
          width:'100%', padding:'8px 10px', background:'var(--bg)', border:'1px solid var(--border)',
          borderRadius:7, color:'var(--text)', fontSize:13, outline:'none', marginBottom:9,
        }} />
        <div style={{ display:'flex', gap:7, marginBottom:11 }}>
          {[['Active','var(--blue)'],['Done','var(--green)'],['Overdue','var(--red)']].map(([l,c]) => (
            <button key={l} className="btn" style={{ flex:1, padding:'5px 0', justifyContent:'center', fontSize:11.5, borderColor:c+'55', color:c }}>{l}</button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" style={{ flex:1, justifyContent:'center' }} onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" style={{ flex:1, justifyContent:'center' }} onClick={onClose}>Add task <span className="kbd" style={{ background:'#ffffff22', color:'#fff', borderColor:'transparent' }}>↵</span></button>
        </div>
      </div>
    </>
  );
}

// ---- a single lane row ----
function Lane({ lane, style, filters, onSelect, onQuickAdd }) {
  const { ENTRIES, TASKS, TYPE_META, TASK_META, laneActivity, frac, PEOPLE } = window.HANDOFF;
  const [hover, setHover] = useState(null);
  const trackRef = useRef(null);
  const act = laneActivity(lane.id);
  const laneEntries = ENTRIES.filter(e => e.lane === lane.id);
  const entries = laneEntries.filter(e => !filters.has(e.type));
  const tasks = TASKS.filter(t => t.lane === lane.id);

  // references branch above the trunk; everything else sits on it
  const trunkEntries = entries.filter(e => e.type !== 'reference');
  const refEntries = entries.filter(e => e.type === 'reference');

  // trunk extent: first → last activity. The head (right end) is the newest node, not the edge.
  const fracs = [...laneEntries, ...tasks].map(i => frac(i.date));
  const startF = fracs.length ? Math.min(...fracs) : 0;
  const endF   = fracs.length ? Math.max(...fracs) : 0;
  const headId = laneEntries.length ? laneEntries.reduce((a,b)=> new Date(a.date) > new Date(b.date) ? a : b).id : null;

  const lineStyle = {
    active:  { opacity: 1,   dash: 'none', color: '#454552' },
    stalled: { opacity: .6,  dash: 'none', color: '#3f3f4a' },
    dead:    { opacity: .42, dash: '5 6',  color: '#54545f' },
  }[act.health];
  const purple = TYPE_META.reference.color;

  // branch geometry (px)
  const refCY = style.refCY, refDot = style.refDot;
  const branchTop = refCY + refDot / 2;          // where node bottom is
  const branchH = style.lineY - branchTop;       // curve height down to trunk
  const BOW = style.dense ? 36 : 46;

  const handleTrackClick = (ev) => {
    if (ev.target.closest('[data-node]')) return;
    const r = trackRef.current.getBoundingClientRect();
    const f = (ev.clientX - r.left) / r.width;
    const t = new Date(window.HANDOFF.WIN_START.getTime() + f * (window.HANDOFF.WIN_END - window.HANDOFF.WIN_START));
    onQuickAdd({ px: ev.nativeEvent.offsetX + style.labelW, py: ev.currentTarget.offsetTop + style.lineY, date: t.toISOString() });
  };

  return (
    <div style={{ display:'flex', height: style.laneH, position:'relative',
      background: style.band ? (style.idx % 2 ? '#ffffff04' : 'transparent') : 'transparent',
      borderBottom: style.band ? '1px solid var(--border-soft)' : 'none' }}>
      {/* label */}
      <div style={{ width: style.labelW, flex:'0 0 auto', display:'flex', flexDirection:'column', justifyContent:'center',
        paddingRight:16, position:'sticky', left:0, zIndex:5, background:'linear-gradient(90deg, var(--bg) 78%, transparent)' }}>
        <div style={{ fontSize: style.dense?12.5:14, fontWeight:500, color: act.health==='dead'?'var(--muted)':'#d6d6dd', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lane.name}</div>
        <div style={{ fontSize:10.5, color:'var(--muted)', marginTop:2, display:'flex', alignItems:'center', gap:5 }}>
          <span style={{ width:5, height:5, borderRadius:'50%', background: act.health==='active'?'var(--green)':act.health==='stalled'?'var(--amber)':'var(--muted)' }} />
          {act.entries === 0 ? 'no activity' : act.health==='active'? 'active' : act.health==='stalled'?`${act.lastDays}d quiet`:`dead · ${act.lastDays}d`}
        </div>
      </div>

      {/* track */}
      <div ref={trackRef} onClick={handleTrackClick} style={{ position:'relative', flex:1, cursor:'crosshair' }}>
        {/* the trunk — spans first→newest node only */}
        {endF > startF && (
          <div style={{ position:'absolute', left:`${startF*100}%`, width:`${(endF-startF)*100}%`, top: style.lineY, height: style.lineW, opacity: lineStyle.opacity }}>
            {lineStyle.dash === 'none'
              ? <div style={{ width:'100%', height:'100%', background:`linear-gradient(90deg, ${lineStyle.color}88, ${lineStyle.color})`, borderRadius:2 }} />
              : <svg width="100%" height={style.lineW+2} preserveAspectRatio="none" style={{ display:'block' }}><line x1="0" y1={style.lineW/2} x2="100%" y2={style.lineW/2} stroke={lineStyle.color} strokeWidth={style.lineW} strokeDasharray={lineStyle.dash} /></svg>}
          </div>
        )}

        {/* reference branches (above the trunk, tree-import feel) */}
        {refEntries.map(e => {
          const isHover = hover === e.id;
          const f = frac(e.date);
          return (
            <React.Fragment key={e.id}>
              {/* tributary curve + junction */}
              <svg width={BOW} height={branchH} preserveAspectRatio="none"
                style={{ position:'absolute', left:`${f*100}%`, top: branchTop, transform:'translateX(-50%)', overflow:'visible', pointerEvents:'none', zIndex: 4 }}>
                <path d={`M ${BOW/2} 0 C ${BOW/2} ${branchH*0.5} ${BOW/2 - (BOW/2-2)} ${branchH} ${BOW/2} ${branchH}`}
                  fill="none" stroke={purple} strokeWidth="1.4" strokeOpacity={isHover?0.9:0.5} />
                <circle cx={BOW/2} cy={branchH} r="2.4" fill={purple} fillOpacity={isHover?1:0.6} />
              </svg>
              {/* the external node (hollow ring) */}
              <div data-node
                onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(h => h===e.id?null:h)}
                onClick={(ev)=>{ ev.stopPropagation(); onSelect(e); }}
                style={{ position:'absolute', left:`${f*100}%`, top: refCY, transform:'translate(-50%,-50%)', zIndex: isHover?60:11 }}>
                <span style={{
                  display:'flex', alignItems:'center', justifyContent:'center',
                  width: isHover? refDot+5 : refDot, height: isHover? refDot+5 : refDot, borderRadius:'50%',
                  background:'var(--bg)', border:`1.5px solid ${purple}`, cursor:'pointer',
                  boxShadow: isHover? `0 0 0 4px ${purple}2e` : 'none', transition:'width .12s, height .12s, box-shadow .12s',
                }}>
                  <span style={{ width: refDot*0.34, height: refDot*0.34, borderRadius:'50%', background:purple }} />
                </span>
                {isHover && <EntryPopover e={e} down />}
              </div>
            </React.Fragment>
          );
        })}

        {/* tasks (below line) */}
        {tasks.map(t => {
          const tm = TASK_META[t.state];
          return (
            <div key={t.id} data-node style={{ position:'absolute', left:`${frac(t.date)*100}%`, top: style.lineY + style.lineW, transform:'translateX(-50%)' }}>
              <div style={{ width:1, height: style.connH, background:'#3a3a45', margin:'0 auto' }} />
              <div title={`${tm.label} · due ${t.due}`} style={{
                width: style.taskW, minHeight: style.taskH, padding:'6px 9px', borderRadius:8, display:'flex', alignItems:'center', gap:6,
                fontSize: style.dense?10.5:11.5, lineHeight:1.25, fontWeight:500, cursor:'pointer',
                background: t.state==='active'? tm.color : 'transparent',
                color: t.state==='active'? '#fff' : t.state==='completed'? 'var(--muted-2)' : '#f0c8c7',
                border: t.state==='active'? 'none' : `1.5px solid ${tm.color}`,
                textDecoration: t.state==='completed'? 'line-through' : 'none',
              }}>
                {t.state==='overdue' && <Icon name="warn" size={12} color={tm.color} />}
                {t.state==='completed' && <Icon name="check" size={12} color={tm.color} />}
                <span style={{ overflow: style.dense?'hidden':'visible', textOverflow:'ellipsis', whiteSpace: style.dense?'nowrap':'normal' }}>{t.label}</span>
              </div>
            </div>
          );
        })}

        {/* trunk entry nodes (commit / experiment / note) */}
        {trunkEntries.map(e => {
          const m = TYPE_META[e.type];
          const isHover = hover === e.id;
          const isHead = e.id === headId;
          return (
            <div key={e.id} data-node
              onMouseEnter={() => setHover(e.id)} onMouseLeave={() => setHover(h => h===e.id?null:h)}
              onClick={(ev)=>{ ev.stopPropagation(); onSelect(e); }}
              style={{ position:'absolute', left:`${frac(e.date)*100}%`, top: style.lineY + style.lineW/2, transform:'translate(-50%,-50%)', zIndex: isHover?60:(isHead?12:10) }}>
              <span style={{
                display:'block', width: isHover? style.dot+5 : (isHead? style.dot+2 : style.dot), height: isHover? style.dot+5 : (isHead? style.dot+2 : style.dot),
                borderRadius:'50%', background:m.color, cursor:'pointer',
                boxShadow: isHover ? `0 0 0 4px ${m.color}33`
                  : isHead ? `0 0 0 2.5px var(--bg), 0 0 0 5px ${m.color}${act.health==='active'?'44':'22'}`
                  : `0 0 0 2.5px var(--bg)`,
                transition:'width .12s, height .12s, box-shadow .12s',
              }} />
              {isHead && act.health==='active' && <span style={{ position:'absolute', inset:0, margin:'auto', width: style.dot+2, height: style.dot+2, borderRadius:'50%', border:`1.5px solid ${m.color}`, animation:'headPulse 1.8s ease-out infinite', pointerEvents:'none' }} />}
              {isHover && <EntryPopover e={e} />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---- top bar ----
function TopBar({ onOpenLog, onGenerateHandover, range, setRange, filters, setFilters }) {
  const { PEOPLE, TYPE_META } = window.HANDOFF;
  const [showFilter, setShowFilter] = useState(false);
  const team = ['jensen','maya','diego','priya'];
  const toggle = (t) => setFilters(prev => { const n = new Set(prev); n.has(t)?n.delete(t):n.add(t); return n; });
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16, padding:'0 22px', height:56, borderBottom:'1px solid var(--border)', flex:'0 0 auto', position:'relative' }}>
      <div style={{ display:'flex', alignItems:'center', gap:9 }}>
        <div style={{ width:22, height:22, borderRadius:6, background:'var(--purple)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:700, color:'#fff' }}>H</div>
        <span style={{ fontSize:14.5, fontWeight:600 }}>Receipts OCR</span>
        <Icon name="chevDown" size={14} color="var(--muted)" />
      </div>

      <div style={{ display:'flex', alignItems:'center', marginLeft:4 }}>
        {team.map((id,i) => (
          <div key={id} onClick={()=> id==='jensen' && onOpenLog('jensen')} title={id==='jensen'?'Open my log':PEOPLE[id].name}
            style={{ marginLeft: i?-7:0, cursor: id==='jensen'?'pointer':'default', position:'relative', zIndex: team.length-i }}>
            <Avatar person={PEOPLE[id]} size={28} ring={id==='jensen'} />
          </div>
        ))}
      </div>

      <div style={{ flex:1 }} />

      {/* legend */}
      <div style={{ display:'flex', alignItems:'center', gap:13, marginRight:4 }}>
        {Object.entries(TYPE_META).map(([k,m]) => (
          <div key={k} style={{ display:'flex', alignItems:'center', gap:5, opacity: filters.has(k)?.35:1 }}>
            <span style={{ width:8, height:8, borderRadius:'50%', background: k==='reference'?'var(--bg)':m.color, border: k==='reference'?`1.5px solid ${m.color}`:'none', boxSizing:'border-box' }} />
            <span style={{ fontSize:11, color:'var(--muted-2)' }}>{m.label}</span>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', background:'var(--surface)', border:'1px solid var(--border)', borderRadius:8, padding:2 }}>
        {['7D','30D','90D','All'].map(r => (
          <button key={r} onClick={()=>setRange(r)} style={{
            border:'none', background: range===r?'var(--surface-2)':'transparent', color: range===r?'var(--text)':'var(--muted)',
            padding:'5px 11px', borderRadius:6, fontSize:12, fontWeight:500 }}>{r}</button>
        ))}
      </div>

      <div style={{ position:'relative' }}>
        <button className="btn btn-icon" onClick={()=>setShowFilter(s=>!s)} style={{ borderColor: filters.size?'var(--purple)':'var(--border)' }}>
          <Icon name="filter" size={16} color={filters.size?'var(--purple)':'var(--muted-2)'} />
        </button>
        {showFilter && (
          <>
            <div onClick={()=>setShowFilter(false)} style={{ position:'fixed', inset:0, zIndex:70 }} />
            <div className="pop-in" style={{ position:'absolute', right:0, top:'calc(100% + 8px)', width:180, zIndex:71, background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:10, padding:8, boxShadow:'0 14px 40px rgba(0,0,0,.5)' }}>
              <div style={{ fontSize:10.5, textTransform:'uppercase', letterSpacing:'.05em', color:'var(--muted)', padding:'4px 8px 8px' }}>Show entry types</div>
              {Object.entries(TYPE_META).map(([k,m]) => (
                <button key={k} onClick={()=>toggle(k)} style={{ display:'flex', alignItems:'center', gap:9, width:'100%', padding:'7px 8px', background:'none', border:'none', borderRadius:7, color:'var(--text)', fontSize:12.5 }}
                  onMouseEnter={e=>e.currentTarget.style.background='#ffffff0d'} onMouseLeave={e=>e.currentTarget.style.background='none'}>
                  <span style={{ width:9, height:9, borderRadius:'50%', background:m.color }} />
                  <span style={{ flex:1, textAlign:'left' }}>{m.label}</span>
                  {!filters.has(k) && <Icon name="check" size={14} color="var(--muted-2)" />}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button className="btn btn-primary" onClick={onGenerateHandover}>
        <Icon name="sparkle" size={15} /> Generate Handover
      </button>
    </div>
  );
}

// ---- scrubber ----
function Scrubber() {
  const { WIN_START, WIN_END, fmtDate } = window.HANDOFF;
  const ticks = [];
  for (let i = 0; i <= 6; i++) {
    const t = new Date(WIN_START.getTime() + (i/6)*(WIN_END-WIN_START));
    ticks.push(t);
  }
  return (
    <div style={{ flex:'0 0 auto', borderTop:'1px solid var(--border)', padding:'10px 22px 12px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:7, paddingLeft:176 }}>
        {ticks.map((t,i) => <span key={i} style={{ fontSize:10.5, color:'var(--muted)', fontFamily:'var(--mono)' }}>{fmtDate(t)}</span>)}
      </div>
      <div style={{ position:'relative', height:30, background:'var(--surface)', border:'1px solid var(--border)', borderRadius:7, overflow:'hidden' }}>
        {/* faux density sparkline */}
        <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'flex-end', padding:'0 2px', gap:1 }}>
          {Array.from({length:60}).map((_,i) => {
            const h = [4,6,5,8,7,10,6,5,9,12,8,7,5,4,6,9,11,7,6,5,8,10,7,6,4,5,7,9,6,5,8,11,9,7,6,5,4,6,8,10,12,9,7,6,5,7,9,11,8,6,5,4,6,8,10,13,11,9,7,5][i] || 4;
            return <div key={i} style={{ flex:1, height: h, background:'#34343f', borderRadius:1 }} />;
          })}
        </div>
        {/* visible window handle */}
        <div style={{ position:'absolute', left:'2%', right:'2%', top:0, bottom:0, border:'1.5px solid var(--purple)', borderRadius:6, background:'#7F77DD12' }}>
          <div style={{ position:'absolute', left:-1, top:'50%', transform:'translateY(-50%)', width:4, height:16, background:'var(--purple)', borderRadius:2 }} />
          <div style={{ position:'absolute', right:-1, top:'50%', transform:'translateY(-50%)', width:4, height:16, background:'var(--purple)', borderRadius:2 }} />
        </div>
      </div>
    </div>
  );
}

function TimelineScreen({ onOpenLog, onGenerateHandover, styleVariant = 'railway' }) {
  const { LANES } = window.HANDOFF;
  const [selected, setSelected] = useState(null);
  const [quickAdd, setQuickAdd] = useState(null);
  const [range, setRange] = useState('30D');
  const [filters, setFilters] = useState(new Set());

  const STYLES = {
    railway: { laneH: 128, lineY: 66, lineW: 2,   dot: 9,  refCY: 18, refDot: 13, taskW: 124, taskH: 38, connH: 14, labelW: 176, band:false, dense:false },
    dense:   { laneH: 84,  lineY: 44, lineW: 1.5, dot: 7,  refCY: 11, refDot: 10, taskW: 104, taskH: 28, connH: 8,  labelW: 176, band:false, dense:true },
    bands:   { laneH: 140, lineY: 72, lineW: 3,   dot: 11, refCY: 20, refDot: 15, taskW: 130, taskH: 40, connH: 16, labelW: 176, band:true,  dense:false },
  };
  const style = STYLES[styleVariant] || STYLES.railway;

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', position:'relative' }}>
      <TopBar onOpenLog={onOpenLog} onGenerateHandover={onGenerateHandover}
        range={range} setRange={setRange} filters={filters} setFilters={setFilters} />

      <div style={{ flex:1, overflow:'auto', padding:'20px 22px 8px' }}>
        <div style={{ minWidth: 900 }}>
          {LANES.map((lane,i) => (
            <Lane key={lane.id} lane={lane} style={{ ...style, idx:i }} filters={filters}
              onSelect={setSelected} onQuickAdd={(p)=>setQuickAdd({ ...p, lane })} />
          ))}
        </div>
      </div>

      <Scrubber />

      {quickAdd && <QuickAdd pos={quickAdd} lane={quickAdd.lane} onClose={()=>setQuickAdd(null)} />}
      {selected && <EntryDrawer e={selected} onClose={()=>setSelected(null)} />}
    </div>
  );
}

window.TimelineScreen = TimelineScreen;
