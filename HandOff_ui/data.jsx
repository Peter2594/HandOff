// data.jsx — Handoff sample scenario: ML team building an OCR system, Jensen departing.
// Exposed on window for the other Babel scripts.

const NOW = new Date('2026-06-01T17:00:00');
const WIN_START = new Date('2026-05-02T00:00:00');
const WIN_END = new Date('2026-06-01T23:59:59');

function daysAgo(iso) {
  return Math.round((NOW - new Date(iso)) / 86400000);
}
// fraction 0..1 across the visible window
function frac(iso) {
  const t = new Date(iso).getTime();
  return Math.min(1, Math.max(0, (t - WIN_START) / (WIN_END - WIN_START)));
}
function fmtDate(iso, opts) {
  return new Date(iso).toLocaleDateString('en-US', opts || { month: 'short', day: 'numeric' });
}
function fmtTime(iso) {
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function relTime(iso) {
  const d = daysAgo(iso);
  if (d === 0) return 'today';
  if (d === 1) return 'yesterday';
  if (d < 7) return d + 'd ago';
  if (d < 30) return Math.floor(d / 7) + 'w ago';
  return Math.floor(d / 30) + 'mo ago';
}

const TYPE_META = {
  commit:     { color: '#1D9E75', label: 'Commit',     glyph: 'commit' },
  experiment: { color: '#EF9F27', label: 'Experiment', glyph: 'flask' },
  reference:  { color: '#7F77DD', label: 'Reference',  glyph: 'link' },
  note:       { color: '#6B6B7A', label: 'Note',       glyph: 'note' },
};

const TASK_META = {
  active:    { color: '#378ADD', label: 'Active' },
  completed: { color: '#639922', label: 'Completed' },
  overdue:   { color: '#E24B4A', label: 'Overdue' },
};

const PEOPLE = {
  jensen: { id: 'jensen', name: 'Jensen Park',  initials: 'JP', color: '#7F77DD', role: 'ML Engineer', departing: true,  lastDay: 'Jun 6' },
  maya:   { id: 'maya',   name: 'Maya Chen',    initials: 'MC', color: '#1D9E75', role: 'ML Engineer' },
  diego:  { id: 'diego',  name: 'Diego Torres', initials: 'DT', color: '#EF9F27', role: 'ML Engineer' },
  priya:  { id: 'priya',  name: 'Priya Rao',    initials: 'PR', color: '#378ADD', role: 'EM' },
};

// Lanes — order top to bottom. health derived from most recent entry below.
const LANES = [
  { id: 'ocr',    name: 'OCR Pipeline' },
  { id: 'data',   name: 'Data Preprocessing' },
  { id: 'train',  name: 'Model Training' },
  { id: 'deploy', name: 'Deployment Pipeline' },
  { id: 'errors', name: 'Error Handling Logic' },
];

// ENTRIES — ~35 across lanes. author defaults jensen unless noted.
const ENTRIES = [
  // ── OCR Pipeline (active, Jensen-heavy) ──
  { id:'e1',  lane:'ocr', type:'commit', date:'2026-05-03T10:12:00', author:'jensen',
    hash:'7c1e4b0', title:'Initial OCR pipeline skeleton', body:'Scaffolds detector → recognizer → post-proc stages with a config registry.',
    note:'Baseline architecture in place — three-stage pipeline.' },
  { id:'e2',  lane:'ocr', type:'note', date:'2026-05-04T09:40:00', author:'jensen',
    title:'Decision: target 90% accuracy by end of Q2', body:'Agreed with Priya. Accuracy measured as char-level F1 on the internal receipts set.',
    note:'Goal locked: 90% char-F1 on receipts by Q2 close.' },
  { id:'e3',  lane:'ocr', type:'reference', date:'2026-05-06T14:05:00', author:'jensen', refKind:'Paper',
    title:'CRAFT: Character Region Awareness for Text Detection', body:'Baek et al., 2019. Region + affinity maps for detecting individual characters; basis for our detector head.',
    note:'Detector design follows CRAFT region/affinity maps.' },
  { id:'e4',  lane:'ocr', type:'reference', date:'2026-05-08T11:20:00', author:'jensen', refKind:'Repo',
    title:'open-mmlab/mmocr', body:'Reference implementation we vendored the data loaders and eval harness from.',
    note:'Vendored loaders + eval harness from mmocr.' },
  { id:'e5',  lane:'ocr', type:'note', date:'2026-05-15T16:30:00', author:'jensen',
    title:'Batch size 512 caused gradient explosion — reverted to 128', body:'Loss went NaN within 40 steps at bs=512 even with grad clipping. 128 is stable. Worth revisiting with LAMB.',
    note:'Dead end: bs=512 → NaN. Reverted to 128.' },
  { id:'e6',  lane:'ocr', type:'note', date:'2026-05-20T13:15:00', author:'jensen',
    title:'Bounding shrink ratio 0.4 caused edge character dropout — changed to 0.6', body:'Characters at receipt edges were being clipped. Shrink 0.6 recovers them. NOTE: upstream mmocr default is 0.4 — merge conflict risk if we pull.',
    note:'Shrink ratio 0.4 → 0.6 to fix edge dropout. Watch upstream merges.' },
  { id:'e7',  lane:'ocr', type:'commit', date:'2026-05-28T18:42:00', author:'jensen',
    hash:'a3f9c2d', title:'Switch ResNet50 → EfficientNet backbone', body:'Replaces the detector backbone. EfficientNet-B3 is more stable on the edge-case set and ~20% lighter.',
    note:'Backbone swap: ResNet50 → EfficientNet-B3.' },
  { id:'e8',  lane:'ocr', type:'experiment', date:'2026-05-28T21:10:00', author:'jensen',
    metric:'87.2% char-F1', title:'EfficientNet-B3 — 87.2% char-F1, stable on edge cases', body:'Up from 84.1% (ResNet50). Edge-case subset jumped 84.1 → 87.2. No instability across 3 seeds.',
    note:'EfficientNet-B3 hits 87.2% — +3.1 over baseline.' },
  { id:'e9',  lane:'ocr', type:'commit', date:'2026-05-30T15:25:00', author:'jensen',
    hash:'d81b6fa', title:'Add test-time augmentation scaffold (WIP)', body:'Multi-scale + horizontal flip TTA hooks. Wired but not yet benchmarked.',
    note:'TTA scaffold landed — not evaluated yet.' },
  { id:'e10', lane:'ocr', type:'experiment', date:'2026-05-31T12:00:00', author:'jensen',
    metric:'pending', title:'TTA not yet evaluated — placeholder run', body:'Single smoke run completed; full sweep across scales still owed.',
    note:'TTA: still in progress.' },
  { id:'e11', lane:'ocr', type:'reference', date:'2026-05-11T10:00:00', author:'jensen', refKind:'Docs',
    title:'EfficientNet — timm model card', body:'Config reference for the B3 variant + pretrained weights we initialize from.',
    note:'Init from timm B3 pretrained weights.' },
  { id:'e12', lane:'ocr', type:'commit', date:'2026-05-24T09:05:00', author:'jensen',
    hash:'5f0aa31', title:'Cache detector crops to disk', body:'Recognizer stage was recomputing crops every epoch — caching cut epoch time 22%.',
    note:'Crop caching: -22% epoch time.' },

  // ── Data Preprocessing (Maya, stalled ~10d) ──
  { id:'e13', lane:'data', type:'reference', date:'2026-05-09T11:00:00', author:'maya', refKind:'Repo',
    title:'SynthText dataset', body:'Synthetic text-in-the-wild generator used to bootstrap rare glyph coverage.',
    note:'Using SynthText for rare-glyph augmentation.' },
  { id:'e14', lane:'data', type:'commit', date:'2026-05-10T14:30:00', author:'maya',
    hash:'b2c7e90', title:'Add synthetic text augmentation', body:'Generates ~50k synthetic receipts emphasizing rare glyphs and rotated text.',
    note:'Synthetic aug pipeline online.' },
  { id:'e15', lane:'data', type:'experiment', date:'2026-05-14T16:45:00', author:'maya',
    metric:'+2.1% rare glyphs', title:'Synthetic aug +2.1% on rare glyphs', body:'Rare-glyph subset accuracy 71.4 → 73.5. No regression on common set.',
    note:'Synthetic aug: +2.1% on rare glyphs.' },
  { id:'e16', lane:'data', type:'note', date:'2026-05-16T10:20:00', author:'maya',
    title:'Dropped NFKC normalization — broke CJK', body:'NFKC was collapsing full-width CJK punctuation into ASCII. Disabled for CJK locales.',
    note:'Dead end: NFKC broke CJK punctuation. Disabled.' },
  { id:'e17', lane:'data', type:'commit', date:'2026-05-18T13:00:00', author:'maya',
    hash:'9ad34c1', title:'Parallelize image decode with DALI', body:'Moved JPEG decode + resize onto GPU via DALI. Input pipeline no longer the bottleneck.',
    note:'DALI decode — input pipeline unblocked.' },
  { id:'e18', lane:'data', type:'reference', date:'2026-05-13T09:30:00', author:'maya', refKind:'Article',
    title:'A survey of data augmentation for OCR', body:'Used to choose the augmentation mix (perspective, blur, synthetic).',
    note:'Aug mix chosen from this survey.' },
  { id:'e19', lane:'data', type:'note', date:'2026-05-19T15:10:00', author:'maya',
    title:'Label noise in receipts-v2 — ~3% mislabeled', body:'Spot-checked 500 samples. Filed for relabeling; using v1 splits for now.',
    note:'receipts-v2 has ~3% label noise.' },

  // ── Model Training (Jensen + Maya, active) ──
  { id:'e20', lane:'train', type:'reference', date:'2026-05-11T08:50:00', author:'jensen', refKind:'Paper',
    title:'Mixed Precision Training (Micikevicius et al.)', body:'Loss-scaling recipe we follow for fp16.',
    note:'fp16 loss-scaling follows this paper.' },
  { id:'e21', lane:'train', type:'commit', date:'2026-05-12T12:15:00', author:'jensen',
    hash:'c0d9e22', title:'Add mixed-precision training', body:'AMP autocast + dynamic loss scaling across detector and recognizer.',
    note:'AMP fp16 training enabled.' },
  { id:'e22', lane:'train', type:'experiment', date:'2026-05-12T19:40:00', author:'jensen',
    metric:'-38% wall time', title:'fp16 cut training time 38%, no accuracy loss', body:'Epoch 14m → 8.7m. Char-F1 within noise of fp32 across 3 seeds.',
    note:'fp16: -38% time, no acc loss.' },
  { id:'e23', lane:'train', type:'note', date:'2026-05-18T11:05:00', author:'jensen',
    title:'LR warmup 500 steps stabilizes early training', body:'Without warmup, recognizer loss spikes in first epoch. 500-step linear warmup fixes it.',
    note:'500-step LR warmup is load-bearing.' },
  { id:'e24', lane:'train', type:'commit', date:'2026-05-22T17:30:00', author:'maya',
    hash:'1e7b8d4', title:'Add EMA of model weights', body:'Exponential moving average of weights; eval uses EMA copy. +0.4% steady gain.',
    note:'Weight EMA: +0.4% on eval.' },
  { id:'e25', lane:'train', type:'experiment', date:'2026-05-26T14:20:00', author:'jensen',
    metric:'86.0% char-F1', title:'Cosine schedule beats step decay', body:'Cosine annealing 85.2 → 86.0 vs step decay. Adopted as default.',
    note:'Cosine LR schedule adopted.' },
  { id:'e26', lane:'train', type:'reference', date:'2026-05-25T10:10:00', author:'jensen', refKind:'Docs',
    title:'PyTorch — torch.optim.lr_scheduler', body:'Reference for the cosine-with-restarts config.',
    note:'Scheduler config reference.' },
  { id:'e27', lane:'train', type:'note', date:'2026-05-27T16:00:00', author:'maya',
    title:'Gradient checkpointing lets us 2x batch on A100', body:'~18% slower per step but doubles effective batch — net win for convergence.',
    note:'Grad checkpointing → 2x batch.' },

  // ── Deployment Pipeline (gap — only 1 entry, dead ~23d) ──
  { id:'e28', lane:'deploy', type:'note', date:'2026-05-09T15:00:00', author:'jensen',
    title:'Spun up staging Triton server — no load test yet', body:'Single-replica Triton on staging serving the B3 detector. No load testing, no autoscaling, no recognizer wired.',
    note:'Staging Triton up — untested, recognizer not wired.' },

  // ── Error Handling Logic (gap — zero entries) ──
];

// TASKS — manager-assigned, hang below lane.
const TASKS = [
  { id:'t1', lane:'ocr',   state:'overdue',   label:'Optimize to 90% accuracy', date:'2026-05-10T00:00:00', due:'2026-05-29', by:'priya' },
  { id:'t2', lane:'ocr',   state:'completed', label:'Ship EfficientNet swap',    date:'2026-05-21T00:00:00', due:'2026-05-28', by:'priya' },
  { id:'t3', lane:'train', state:'active',    label:'Benchmark vs. baseline',    date:'2026-05-23T00:00:00', due:'2026-06-04', by:'priya' },
  { id:'t4', lane:'data',  state:'completed', label:'Validate CJK handling',     date:'2026-05-12T00:00:00', due:'2026-05-17', by:'priya' },
  { id:'t5', lane:'deploy',state:'overdue',   label:'Set up CI/CD',              date:'2026-05-14T00:00:00', due:'2026-05-25', by:'priya' },
  { id:'t6', lane:'data',  state:'active',    label:'Document aug pipeline',     date:'2026-05-26T00:00:00', due:'2026-06-08', by:'priya' },
];

// derive lane health from latest entry/task activity
function laneActivity(laneId) {
  const items = [...ENTRIES.filter(e => e.lane === laneId), ...TASKS.filter(t => t.lane === laneId)];
  if (!items.length) return { health: 'dead', lastDays: Infinity, count: 0, entries: 0 };
  const last = Math.min(...items.map(i => daysAgo(i.date)));
  const entries = ENTRIES.filter(e => e.lane === laneId).length;
  let health = 'active';
  if (last > 14) health = 'dead';
  else if (last > 7) health = 'stalled';
  return { health, lastDays: last, count: items.length, entries };
}

// canned weekly digest (Jensen, week of June 1)
const WEEKLY_DIGEST = {
  week: 'Week of June 1',
  sections: [
    { h: 'What I worked on', items: [
      'Swapped the OCR detector backbone from ResNet50 to EfficientNet-B3 (commit a3f9c2d) and landed a test-time-augmentation scaffold.',
      'Cached detector crops to disk, cutting epoch time 22%.' ] },
    { h: 'Key decisions made', items: [
      'EfficientNet-B3 is the new default backbone — 87.2% char-F1, stable across seeds.',
      'Bounding shrink ratio raised 0.4 → 0.6 to stop edge-character dropout.' ] },
    { h: 'References used', items: [
      'CRAFT: Character Region Awareness for Text Detection (paper).',
      'open-mmlab/mmocr (repo); timm EfficientNet model card.' ] },
    { h: 'Dead ends', items: [
      'Batch size 512 → gradient explosion; reverted to 128.',
      'TTA full sweep still owed — only a smoke run done.' ] },
    { h: 'Still in progress', items: [
      'Test-time augmentation evaluation across scales.',
      'Optimize to 90% accuracy (task is overdue).' ] },
  ],
};

window.HANDOFF = {
  NOW, WIN_START, WIN_END, daysAgo, frac, fmtDate, fmtTime, relTime,
  TYPE_META, TASK_META, PEOPLE, LANES, ENTRIES, TASKS, laneActivity, WEEKLY_DIGEST,
};
