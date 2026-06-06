// personal-log.jsx — Screen 2: employee's vertical feed. window.PersonalLogScreen
const { useState: useStatePL } = React;

function detectType(text) {
  const t = text.trim().toLowerCase();
  if (!t) return null;
  if (/github\.com\/.+\/commit\/|^[0-9a-f]{7,40}$/.test(t)) return { type:'commit', hint:'GitHub commit detected' };
  if (/arxiv\.org|\.pdf($|\?)|doi\.org/.test(t)) return { type:'reference', refKind:'Paper', hint:'Paper / arXiv link detected' };
  if (/github\.com|gitlab\.com/.test(t)) return { type:'reference', refKind:'Repo', hint:'Repository link detected' };
  if (/^https?:\/\//.test(t)) return { type:'reference', refKind:'Article', hint:'Link detected' };
  if (/=|\d+%|acc|loss|f1|epoch/.test(t)) return { type:'experiment', hint:'Looks like a result' };
  return { type:'note', hint:'Plain note' };
}

// ---- quick-add composer ----
function QuickAddBar() {
  const { TYPE_META, LANES } = window.HANDOFF;
  const [text, setText] = useStatePL('');
  const [lane, setLane] = useStatePL('ocr');
  const [annot, setAnnot] = useStatePL('');
  const det = detectType(text);
  const m = det ? TYPE_META[det.type] : null;

  return (
    <div className="card" style={{ padding: det? '14px 16px 16px':'4px 6px', marginBottom:18, transition:'padding .15s' }}>
      <div style={{ display:'flex', alignItems:'center', gap:10, padding: det?'0 0 12px':'6px 8px' }}>
        <span style={{ color: m? m.color : 'var(--muted)', display:'inline-flex' }}>
          <Icon name={m? m.glyph : 'plus'} size={18} />
        </span>
        <input value={text} onChange={e=>setText(e.target.value)}
          placeholder="Paste a link, commit, result, or note…" style={{
            flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:14, padding:'8px 0' }} />
        {!det && <button className="btn btn-ghost btn-icon"><Icon name="paperclip" size={17} color="var(--muted-2)" /></button>}
        {det && <Pill color={m.color}>{det.refKind || m.label}</Pill>}
      </div>

      {det && (
        <div style={{ animation:'slideUp .16s ease both' }}>
          <div style={{ fontSize:11.5, color:m.color, display:'flex', alignItems:'center', gap:6, marginBottom:11 }}>
            <Icon name="sparkle" size={13} /> {det.hint} — pre-selected. Add a one-line note and pick a lane.
          </div>
          <input value={annot} onChange={e=>setAnnot(e.target.value)} autoFocus
            placeholder="One-line annotation (what should a teammate know?)" style={{
              width:'100%', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8,
              padding:'9px 11px', color:'var(--text)', fontSize:13, outline:'none', marginBottom:11 }} />
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:'var(--muted)' }}>Lane</span>
            <div style={{ position:'relative' }}>
              <select value={lane} onChange={e=>setLane(e.target.value)} style={{
                appearance:'none', background:'var(--surface-2)', border:'1px solid var(--border)', borderRadius:8,
                padding:'7px 30px 7px 11px', color:'var(--text)', fontSize:12.5, outline:'none' }}>
                {LANES.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
              </select>
              <span style={{ position:'absolute', right:9, top:'50%', transform:'translateY(-50%)', pointerEvents:'none' }}><Icon name="chevDown" size={14} color="var(--muted)" /></span>
            </div>
            <div style={{ flex:1 }} />
            <button className="btn btn-ghost" onClick={()=>{ setText(''); setAnnot(''); }}>Cancel</button>
            <button className="btn btn-primary" onClick={()=>{ setText(''); setAnnot(''); }}>Add entry <span className="kbd" style={{ background:'#ffffff22', color:'#fff', borderColor:'transparent' }}>↵</span></button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---- github commit prompt banner ----
function CommitBanner({ onDismiss }) {
  const [mode, setMode] = useStatePL('prompt'); // prompt | annotate | done
  if (mode === 'done') return null;
  return (
    <div style={{ marginBottom:18, border:'1px solid #1D9E7566', background:'#1D9E751a', borderRadius:12, padding:'13px 15px', animation:'slideUp .2s ease both' }}>
      <div style={{ display:'flex', alignItems:'center', gap:11 }}>
        <Icon name="github" size={18} color="var(--teal)" />
        <span className="mono" style={{ fontSize:13, color:'var(--teal)' }}>e4b9f01</span>
        <span style={{ fontSize:13, color:'#d6d6dd', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>Add recognizer beam-search decoder</span>
        <span style={{ marginLeft:'auto', fontSize:11.5, color:'var(--muted)', whiteSpace:'nowrap' }}>pushed 12m ago</span>
        {mode === 'prompt' && (
          <div style={{ display:'flex', gap:8, flex:'0 0 auto' }}>
            <button className="btn" style={{ padding:'5px 11px', fontSize:12 }} onClick={()=>setMode('annotate')}>Add a note</button>
            <button className="btn btn-ghost" style={{ padding:'5px 9px', fontSize:12, color:'var(--muted)' }} onClick={onDismiss}>Skip</button>
          </div>
        )}
      </div>
      {mode === 'annotate' && (
        <div style={{ display:'flex', gap:9, marginTop:11, animation:'slideUp .15s ease both' }}>
          <input autoFocus placeholder="What does this commit change?" style={{
            flex:1, background:'var(--bg)', border:'1px solid var(--border)', borderRadius:8, padding:'8px 11px', color:'var(--text)', fontSize:13, outline:'none' }} />
          <button className="btn btn-primary" style={{ padding:'7px 13px' }} onClick={()=>setMode('done')}>Save</button>
        </div>
      )}
    </div>
  );
}

// ---- entry card ----
function LogCard({ e }) {
  const { TYPE_META, LANES, relTime } = window.HANDOFF;
  const [hover, setHover] = useStatePL(false);
  const m = TYPE_META[e.type];
  const lane = LANES.find(l => l.id === e.lane);
  return (
    <div onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{ display:'flex', alignItems:'stretch', background:'var(--surface)', border:'1px solid var(--border)',
        borderRadius:10, overflow:'hidden', cursor:'pointer', transition:'border-color .14s, background .14s',
        borderColor: hover? '#3a3a45':'var(--border)' }}>
      <div style={{ width:3, flex:'0 0 auto', background:m.color }} />
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 15px', flex:1, minWidth:0 }}>
        <span style={{ width:30, height:30, flex:'0 0 auto', borderRadius:8, background:m.color+'1c', color:m.color, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <Icon name={m.glyph} size={15} />
        </span>
        <div style={{ minWidth:0, flex:1 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            {e.hash && <span className="mono" style={{ fontSize:12, color:m.color, flex:'0 0 auto' }}>{e.hash}</span>}
            {e.metric && e.metric!=='pending' && <span className="mono" style={{ fontSize:11.5, color:'var(--amber)', flex:'0 0 auto', whiteSpace:'nowrap' }}>{e.metric}</span>}
            <span style={{ fontSize:13.5, color:'#e2e2e8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{e.title}</span>
          </div>
          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:3, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontStyle:'italic' }}>“{e.note}”</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:11, flex:'0 0 auto' }}>
          {hover && <button className="btn btn-ghost btn-icon" style={{ padding:5 }}><Icon name="edit" size={15} color="var(--muted-2)" /></button>}
          <Pill color="var(--muted)" style={{ fontSize:11 }}>{lane.name}</Pill>
          <span style={{ fontSize:11.5, color:'var(--muted)', width:54, textAlign:'right' }}>{relTime(e.date)}</span>
        </div>
      </div>
    </div>
  );
}

// ---- weekly digest modal ----
const GEN_STEPS = ['Collecting 14 entries from the past 7 days…','Clustering by lane and decision…','Drafting structured summary…','Polishing prose…'];
function DigestModal({ onClose }) {
  const { WEEKLY_DIGEST } = window.HANDOFF;
  const [phase, setPhase] = useStatePL('generating'); // generating | review | published
  const [step, setStep] = useStatePL(0);

  React.useEffect(() => {
    if (phase !== 'generating') return;
    if (step < GEN_STEPS.length - 1) {
      const id = setTimeout(()=>setStep(step+1), 720);
      return () => clearTimeout(id);
    }
    const id = setTimeout(()=>setPhase('review'), 800);
    return () => clearTimeout(id);
  }, [phase, step]);

  return (
    <>
      <div onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,.55)', zIndex:90, animation:'fadeIn .15s ease both' }} />
      <div className="pop-in" style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:560, maxHeight:'82%',
        background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, zIndex:91, boxShadow:'0 30px 80px rgba(0,0,0,.6)', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        <div style={{ display:'flex', alignItems:'center', gap:9, padding:'15px 18px', borderBottom:'1px solid var(--border-soft)' }}>
          <Icon name="sparkle" size={16} color="var(--purple)" />
          <span style={{ fontSize:14, fontWeight:600 }}>Weekly digest</span>
          {phase==='review' && <Pill color="var(--purple)" style={{ marginLeft:4 }}>draft · editable</Pill>}
          {phase==='published' && <Pill color="var(--green)" style={{ marginLeft:4 }}><Icon name="check" size={11} /> published</Pill>}
          <button className="btn btn-ghost btn-icon" style={{ marginLeft:'auto' }} onClick={onClose}><Icon name="close" size={16} color="var(--muted-2)" /></button>
        </div>

        {phase==='generating' && (
          <div style={{ padding:'40px 28px 44px' }}>
            <div style={{ display:'flex', justifyContent:'center', marginBottom:24 }}>
              <div style={{ width:40, height:40, border:'3px solid var(--border)', borderTopColor:'var(--purple)', borderRadius:'50%', animation:'spin .8s linear infinite' }} />
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:10, maxWidth:340, margin:'0 auto' }}>
              {GEN_STEPS.map((s,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color: i<step?'var(--muted)':i===step?'var(--text)':'#44444f', transition:'color .3s' }}>
                  {i<step ? <Icon name="check" size={15} color="var(--green)" />
                    : i===step ? <span style={{ width:15, height:15, display:'inline-flex' }}><span style={{ width:7, height:7, margin:'auto', borderRadius:'50%', background:'var(--purple)', animation:'pulse 1s ease infinite' }} /></span>
                    : <span style={{ width:15, height:15, display:'inline-block' }}><span style={{ display:'block', width:6, height:6, margin:'auto', borderRadius:'50%', border:'1.5px solid #44444f' }} /></span>}
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}

        {phase!=='generating' && (
          <div style={{ overflowY:'auto', padding:'20px 22px' }}>
            <div style={{ fontSize:16, fontWeight:600, marginBottom:16 }}>{WEEKLY_DIGEST.week}</div>
            {WEEKLY_DIGEST.sections.map((s,i) => (
              <div key={i} style={{ marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:600, color:'var(--purple)', marginBottom:7 }}>{s.h}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                  {s.items.map((it,j) => (
                    <div key={j} style={{ display:'flex', gap:9, fontSize:13, lineHeight:1.55, color:'#d2d2da' }}>
                      <span style={{ color:'var(--muted)', flex:'0 0 auto' }}>•</span>
                      <span style={{ textWrap:'pretty' }}>{it}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {phase==='review' && (
          <div style={{ display:'flex', gap:9, padding:'13px 18px', borderTop:'1px solid var(--border-soft)' }}>
            <span style={{ fontSize:11.5, color:'var(--muted)', alignSelf:'center' }}>Review & edit before publishing — your manager sees this read-only.</span>
            <div style={{ flex:1 }} />
            <button className="btn"><Icon name="edit" size={14} color="var(--muted-2)" /> Edit</button>
            <button className="btn btn-primary" onClick={()=>setPhase('published')}>Publish digest</button>
          </div>
        )}
        {phase==='published' && (
          <div style={{ display:'flex', alignItems:'center', gap:9, padding:'14px 18px', borderTop:'1px solid var(--border-soft)' }}>
            <Icon name="check" size={16} color="var(--green)" />
            <span style={{ fontSize:13, color:'#d2d2da' }}>Published to your weekly report. No separate writing needed.</span>
            <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={onClose}>Done</button>
          </div>
        )}
      </div>
    </>
  );
}

function PersonalLogScreen({ onBack }) {
  const { ENTRIES, PEOPLE } = window.HANDOFF;
  const me = PEOPLE.jensen;
  const [showBanner, setShowBanner] = useStatePL(true);
  const [digest, setDigest] = useStatePL(false);
  const mine = ENTRIES.filter(e => e.author === 'jensen').sort((a,b)=> new Date(b.date)-new Date(a.date));

  return (
    <div style={{ height:'100%', display:'flex', flexDirection:'column', position:'relative' }}>
      {/* header */}
      <div style={{ display:'flex', alignItems:'center', gap:14, padding:'0 22px', height:56, borderBottom:'1px solid var(--border)', flex:'0 0 auto' }}>
        <button className="btn btn-ghost" onClick={onBack} style={{ paddingLeft:8 }}>
          <span style={{ transform:'rotate(180deg)', display:'inline-flex' }}><Icon name="arrowRight" size={16} color="var(--muted-2)" /></span> Timeline
        </button>
        <div style={{ width:1, height:22, background:'var(--border)' }} />
        <Avatar person={me} size={30} ring />
        <div>
          <div style={{ fontSize:14.5, fontWeight:600, display:'flex', alignItems:'center', gap:8 }}>{me.name} <Pill color="var(--red)">departing · last day {me.lastDay}</Pill></div>
          <div style={{ fontSize:11.5, color:'var(--muted)' }}>{me.role} · {mine.length} entries</div>
        </div>
        <div style={{ flex:1 }} />
        <button className="btn btn-primary" onClick={()=>setDigest(true)}><Icon name="sparkle" size={15} /> Generate weekly digest</button>
      </div>

      {/* feed */}
      <div style={{ flex:1, overflowY:'auto', padding:'22px 0' }}>
        <div style={{ width:680, maxWidth:'92%', margin:'0 auto' }}>
          <QuickAddBar />
          {showBanner && <CommitBanner onDismiss={()=>setShowBanner(false)} />}
          <div style={{ fontSize:11, textTransform:'uppercase', letterSpacing:'.06em', color:'var(--muted)', margin:'4px 2px 12px' }}>My entries</div>
          <div style={{ display:'flex', flexDirection:'column', gap:9 }}>
            {mine.map(e => <LogCard key={e.id} e={e} />)}
          </div>
        </div>
      </div>

      {digest && <DigestModal onClose={()=>setDigest(false)} />}
    </div>
  );
}

window.PersonalLogScreen = PersonalLogScreen;
