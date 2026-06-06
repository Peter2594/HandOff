"""
Heavy seed: one project, 100+ nodes across 5 branches.
Run via:  python run_seed.py
"""
import json
from datetime import datetime
from models import db, Project, User, Branch, Node, Contact


def dt(s):
    return datetime.strptime(s, '%Y-%m-%dT%H:%M:%S')


def seed():
    # ── Project ────────────────────────────────────────────────────────────
    project = Project(
        name='Receipts OCR',
        context_doc=(
            'Building an end-to-end OCR pipeline for receipt processing. '
            'Target: 90% char-level F1 on the internal receipts dataset by end of Q2 2026. '
            'Three-stage pipeline: detector (CRAFT-based) → recognizer (beam-search) → post-processing. '
            'Team: Jensen Park (ML Engineer, departing Jun 6), Maya Chen (ML Engineer), '
            'Diego Torres (ML Engineer), Priya Rao (Engineering Manager).'
        ),
    )
    db.session.add(project)

    # ── Users ──────────────────────────────────────────────────────────────
    users = [
        User(id='jensen', name='Jensen Park', email='jensen@example.com',
             role='employee', color='#7F77DD', initials='JP', departing=True, last_day='Jun 6'),
        User(id='maya', name='Maya Chen', email='maya@example.com',
             role='employee', color='#1D9E75', initials='MC'),
        User(id='diego', name='Diego Torres', email='diego@example.com',
             role='employee', color='#EF9F27', initials='DT'),
        User(id='priya', name='Priya Rao', email='priya@example.com',
             role='manager', color='#378ADD', initials='PR'),
    ]
    for u in users:
        db.session.add(u)

    # ── Branches ───────────────────────────────────────────────────────────
    ocr = Branch(slug='ocr', name='OCR Pipeline', created_by='jensen',
                 created_at=dt('2026-04-15T09:00:00'),
                 context_doc=(
                     'Three-stage pipeline: detector → recognizer → post-processing. '
                     'Detector based on CRAFT (character region awareness). '
                     'Recognizer uses beam-search decoding. '
                     'Goal: 90% char-F1 on receipts by Q2 close.'
                 ),
                 running_summary=(
                     'The OCR pipeline has progressed significantly. The detector backbone was '
                     'switched from ResNet50 to EfficientNet-B3, yielding 87.2% char-F1 vs 84.1% '
                     'baseline. A test-time augmentation scaffold has been landed but not yet evaluated. '
                     'Crop caching cut epoch time by 22%. Key dead end: batch size 512 causes gradient '
                     'explosion — reverted to 128. Bounding shrink ratio raised from 0.4 to 0.6 to fix '
                     'edge-character dropout; watch for upstream merge conflicts with mmocr.'
                 ),
                 running_summary_updated_at=dt('2026-05-31T14:00:00'))

    data = Branch(slug='data', name='Data Preprocessing', created_by='maya',
                  created_at=dt('2026-04-15T09:00:00'),
                  context_doc=(
                      'Preprocessing pipeline for training data. '
                      'Handles rare-glyph augmentation, DALI-based GPU decode, '
                      'and CJK locale handling. Sources: real receipts + SynthText synthetic.'
                  ),
                  running_summary=(
                      'Synthetic text augmentation added via SynthText, yielding +2.1% on the '
                      'rare-glyph subset. DALI GPU decode removed input pipeline as bottleneck. '
                      'NFKC normalization was disabled for CJK locales after it broke full-width '
                      'punctuation. Label noise (~3%) found in receipts-v2; using v1 splits for now.'
                  ),
                  running_summary_updated_at=dt('2026-05-19T16:00:00'))

    train = Branch(slug='train', name='Model Training', created_by='jensen',
                   created_at=dt('2026-04-15T09:00:00'),
                   context_doc=(
                       'Training configuration for the full detector+recognizer stack. '
                       'Mixed-precision (fp16) training with AMP autocast. '
                       'Cosine LR schedule with 500-step linear warmup.'
                   ),
                   running_summary=(
                       'Mixed-precision training (fp16) cut wall time 38% with no accuracy loss. '
                       'Cosine LR schedule outperforms step decay (86.0% vs 85.2%). '
                       'LR warmup of 500 steps is load-bearing — without it, recognizer loss spikes. '
                       'Weight EMA added by Maya, giving a steady +0.4% on eval. '
                       'Gradient checkpointing enables 2x batch size on A100.'
                   ),
                   running_summary_updated_at=dt('2026-05-27T17:00:00'))

    deploy = Branch(slug='deploy', name='Deployment Pipeline', created_by='diego',
                    created_at=dt('2026-04-15T09:00:00'),
                    context_doc=(
                        'CI/CD and serving infrastructure for the OCR model. '
                        'Target: single-replica Triton serving on staging, then production. '
                        'Recognizer not yet wired to serving stack.'
                    ),
                    running_summary=(
                        'Docker image builds are green on CI. Triton staging is up with detector '
                        'only — recognizer not yet wired. Latency at p99 is 420ms, target is <300ms. '
                        'ONNX export path identified; quantization experiments pending.'
                    ),
                    running_summary_updated_at=dt('2026-05-28T10:00:00'))

    errors = Branch(slug='errors', name='Error Handling Logic', created_by='diego',
                    created_at=dt('2026-05-01T09:00:00'),
                    context_doc=(
                        'Error handling, fallback logic, and confidence thresholding '
                        'for the OCR pipeline output.'
                    ),
                    running_summary=(
                        'Confidence threshold of 0.7 chosen after ROC analysis. '
                        'Low-confidence outputs now route to a human-review queue. '
                        'Edge cases: rotated receipts, thermal-paper fade, and multi-column layouts '
                        'are the three main failure modes identified.'
                    ),
                    running_summary_updated_at=dt('2026-05-30T11:00:00'))

    for b in [ocr, data, train, deploy, errors]:
        db.session.add(b)
    db.session.flush()

    def node(branch, author, ts, ntype, content, **meta):
        return Node(
            branch_id=branch.id,
            created_by=author,
            created_at=dt(ts),
            type=ntype,
            content=content,
            _metadata=json.dumps(meta),
        )

    # ── OCR Pipeline (~22 nodes) ────────────────────────────────────────────
    nodes = [
        node(ocr, 'jensen', '2026-04-16T09:00:00', 'commit',
             'Scaffold three-stage pipeline skeleton',
             hash='1a2b3c0', title='Scaffold three-stage pipeline skeleton',
             body='Detector → recognizer → post-proc stages with config registry and shared logging.',
             note='Baseline architecture in place.'),

        node(ocr, 'jensen', '2026-04-17T10:30:00', 'note',
             'Decision: target 90% char-F1 by Q2 close',
             title='Decision: target 90% char-F1 by Q2 close',
             body='Agreed with Priya. Char-level F1 on internal receipts set is the canonical metric.',
             note='Goal locked.'),

        node(ocr, 'jensen', '2026-04-19T14:00:00', 'link',
             'CRAFT: Character Region Awareness for Text Detection',
             refKind='Paper',
             title='CRAFT: Character Region Awareness for Text Detection',
             body='Baek et al., 2019. Region + affinity maps; basis for our detector head.',
             note='Detector design follows CRAFT.'),

        node(ocr, 'jensen', '2026-04-21T11:00:00', 'link',
             'open-mmlab/mmocr',
             refKind='Repo',
             title='open-mmlab/mmocr',
             body='Vendored data loaders and eval harness from here.',
             note='Loaders + eval harness from mmocr.'),

        node(ocr, 'jensen', '2026-04-23T15:00:00', 'commit',
             'Integrate CRAFT region/affinity loss',
             hash='2c3d4e1', title='Integrate CRAFT region/affinity loss',
             body='Two-head loss: region heatmap + character affinity. Character-level supervision.',
             note='CRAFT loss wired.'),

        node(ocr, 'jensen', '2026-04-25T09:30:00', 'idea',
             'ResNet50 baseline — 84.1% char-F1',
             metric='84.1% char-F1',
             title='ResNet50 baseline — 84.1% char-F1',
             body='First full eval pass on receipts-v1. Baseline established.',
             note='Baseline: 84.1%.'),

        node(ocr, 'jensen', '2026-04-28T13:00:00', 'note',
             'Batch size 512 → NaN loss within 40 steps, even with grad clipping',
             title='Batch size 512 → NaN loss within 40 steps',
             body='Tried LAMB optimizer too — still unstable at bs=512. Reverted to 128.',
             note='Dead end: bs=512 → NaN. Stay at 128.'),

        node(ocr, 'jensen', '2026-05-02T10:00:00', 'link',
             'EfficientNet — timm model card',
             refKind='Docs',
             title='EfficientNet — timm model card',
             body='Config for B3 variant + pretrained weights.',
             note='Init from timm B3 pretrained weights.'),

        node(ocr, 'jensen', '2026-05-05T11:30:00', 'commit',
             'Swap ResNet50 → EfficientNet-B3 backbone',
             hash='a3f9c2d', title='Swap ResNet50 → EfficientNet-B3 backbone',
             body='B3 is ~20% lighter and more stable on edge-case receipts.',
             note='Backbone swapped.'),

        node(ocr, 'jensen', '2026-05-05T17:00:00', 'idea',
             'EfficientNet-B3 — 87.2% char-F1, +3.1 over baseline',
             metric='87.2% char-F1',
             title='EfficientNet-B3 — 87.2% char-F1',
             body='Edge subset: 84.1 → 87.2. Stable across 3 seeds.',
             note='EfficientNet wins.'),

        node(ocr, 'jensen', '2026-05-08T09:00:00', 'note',
             'Bounding shrink ratio 0.4 → edge character dropout — changed to 0.6',
             title='Bounding shrink ratio 0.4 → edge dropout',
             body='Receipt edges clipped. 0.6 recovers them. Watch upstream mmocr merges (default 0.4).',
             note='Shrink 0.4 → 0.6. Merge conflict risk.'),

        node(ocr, 'jensen', '2026-05-10T14:00:00', 'commit',
             'Cache detector crops to disk',
             hash='5f0aa31', title='Cache detector crops to disk',
             body='Recognizer was recomputing crops each epoch. Caching saves 22% epoch time.',
             note='Crop caching: -22% epoch time.'),

        node(ocr, 'maya', '2026-05-12T10:30:00', 'note',
             'Tried attention pooling in recognizer — no gain over avg pool',
             title='Attention pooling — no gain over avg pool',
             body='Trained 3 seeds each. Difference within noise. Reverting to avg pool.',
             note='Dead end: attention pooling.'),

        node(ocr, 'jensen', '2026-05-14T13:00:00', 'commit',
             'Add beam-search decoder with width=5',
             hash='b8e7c33', title='Add beam-search decoder width=5',
             body='Greedy → beam-search. +0.6% char-F1 at inference cost ~3x.',
             note='Beam width=5 adopted.'),

        node(ocr, 'jensen', '2026-05-16T11:00:00', 'idea',
             'Beam width=5 gains +0.6% char-F1 vs greedy',
             metric='+0.6% char-F1',
             title='Beam width=5: +0.6% char-F1',
             body='Acceptable latency tradeoff for our use case.',
             note='Beam search confirmed.'),

        node(ocr, 'diego', '2026-05-18T09:00:00', 'link',
             'PaddleOCR post-processing reference',
             refKind='Repo',
             title='PaddleOCR post-processing reference',
             body='Reviewing their polygon shrinkage and NMS for post-proc ideas.',
             note='Post-proc inspiration from PaddleOCR.'),

        node(ocr, 'diego', '2026-05-20T15:30:00', 'commit',
             'Add polygon shrinkage + NMS in post-processing',
             hash='d4c1a77', title='Add polygon shrinkage + NMS',
             body='Reduces duplicate detections on dense receipt lines by ~15%.',
             note='NMS in post-proc.'),

        node(ocr, 'jensen', '2026-05-22T10:00:00', 'commit',
             'Add test-time augmentation scaffold (WIP)',
             hash='d81b6fa', title='Add TTA scaffold (WIP)',
             body='Multi-scale + horizontal flip hooks. Wired but not yet benchmarked.',
             note='TTA scaffold landed — not evaluated.'),

        node(ocr, 'jensen', '2026-05-24T16:00:00', 'idea',
             'TTA placeholder — full sweep still pending',
             metric='pending',
             title='TTA not yet evaluated',
             body='Smoke run only. Need sweep across scales before Q2 close.',
             note='TTA: still in progress.'),

        node(ocr, 'maya', '2026-05-26T11:00:00', 'note',
             'Multi-column receipts fail — bounding boxes merge across columns',
             title='Multi-column receipts fail — boxes merge',
             body='About 4% of test set. Need column-aware NMS or layout detection step.',
             note='Open issue: multi-column receipts.'),

        node(ocr, 'diego', '2026-05-28T14:00:00', 'commit',
             'Add column-separator heuristic in post-processing',
             hash='e9d2b55', title='Add column-separator heuristic',
             body='Detects vertical whitespace gap >20px as column boundary. Fixes 60% of multi-col cases.',
             note='Column sep heuristic: partial fix.'),

        node(ocr, 'jensen', '2026-05-30T10:00:00', 'note',
             'Thermal-paper fade is still an open failure mode — needs preprocessing step',
             title='Thermal-paper fade — open failure mode',
             body='Faded receipts drop to ~71% F1. Contrast enhancement preprocessing would help.',
             note='Thermal fade: unresolved. Needs contrast enhancement.'),

        # ── Data Preprocessing (~18 nodes) ─────────────────────────────────
        node(data, 'maya', '2026-04-17T11:00:00', 'link',
             'SynthText dataset',
             refKind='Repo',
             title='SynthText dataset',
             body='Synthetic text-in-the-wild generator for rare glyph bootstrap.',
             note='SynthText for rare-glyph aug.'),

        node(data, 'maya', '2026-04-19T14:00:00', 'commit',
             'Add synthetic text augmentation pipeline',
             hash='b2c7e90', title='Add synthetic text augmentation',
             body='~50k synthetic receipts emphasizing rare glyphs and rotated text.',
             note='Synthetic aug pipeline online.'),

        node(data, 'maya', '2026-04-21T10:00:00', 'idea',
             'Synthetic aug +2.1% on rare glyphs — no regression on common set',
             metric='+2.1% rare glyphs',
             title='Synthetic aug: +2.1% rare glyphs',
             body='71.4 → 73.5 on rare-glyph subset.',
             note='Synthetic aug confirmed helpful.'),

        node(data, 'maya', '2026-04-23T15:30:00', 'link',
             'A survey of data augmentation for OCR',
             refKind='Article',
             title='Survey: data augmentation for OCR',
             body='Chose augmentation mix (perspective, blur, synthetic) from this.',
             note='Aug mix from this survey.'),

        node(data, 'maya', '2026-04-25T11:00:00', 'commit',
             'Add perspective + gaussian blur augmentation',
             hash='c3d8f12', title='Add perspective + blur aug',
             body='Perspective warp ±10° and gaussian blur σ=0.5–1.5. Applied with p=0.3.',
             note='Perspective + blur aug added.'),

        node(data, 'maya', '2026-04-28T09:30:00', 'note',
             'NFKC normalization broke CJK full-width punctuation — disabled for CJK locales',
             title='NFKC broke CJK punctuation',
             body='Full-width →、。「」were collapsing to ASCII. Disabled for CJK.',
             note='Dead end: NFKC + CJK. Disabled.'),

        node(data, 'maya', '2026-04-30T14:00:00', 'commit',
             'Parallelize image decode with DALI',
             hash='9ad34c1', title='Parallelize image decode with DALI',
             body='GPU JPEG decode + resize via DALI. Input pipeline no longer bottleneck.',
             note='DALI: input pipeline unblocked.'),

        node(data, 'maya', '2026-05-02T10:30:00', 'idea',
             'DALI decode cuts data loading time by 45%',
             metric='-45% load time',
             title='DALI decode: -45% load time',
             body='GPU utilization went from 68% → 91% after removing CPU decode bottleneck.',
             note='DALI: major win.'),

        node(data, 'maya', '2026-05-04T13:00:00', 'note',
             'Label noise in receipts-v2 — ~3% mislabeled, using v1 splits',
             title='receipts-v2 has ~3% label noise',
             body='Spot-checked 500 samples. Filed for relabeling; using v1 for all experiments.',
             note='Use v1 splits until v2 is relabeled.'),

        node(data, 'diego', '2026-05-06T09:00:00', 'commit',
             'Add CJK-aware tokenizer for recognizer labels',
             hash='e1f2a34', title='Add CJK-aware tokenizer',
             body='Handles full-width chars, CJK punctuation, and mixed-script receipts.',
             note='CJK tokenizer wired.'),

        node(data, 'diego', '2026-05-08T15:00:00', 'note',
             'Mixed-script receipts (CJK + Latin) have highest error rate — 23% worse',
             title='Mixed-script receipts: 23% worse F1',
             body='Roughly 8% of dataset. Tokenizer boundary handling is the likely culprit.',
             note='Open issue: mixed-script receipts.'),

        node(data, 'maya', '2026-05-10T11:00:00', 'commit',
             'Add contrast normalization for faded receipts',
             hash='f4a5b67', title='Add contrast normalization',
             body='CLAHE + brightness normalization. Applied before crop. Helps thermal-fade cases.',
             note='CLAHE added for faded receipts.'),

        node(data, 'maya', '2026-05-12T14:30:00', 'idea',
             'CLAHE +3.4% on thermal-fade subset',
             metric='+3.4% thermal-fade',
             title='CLAHE: +3.4% on thermal-fade',
             body='From 71.2 → 74.6 on the thermal-fade test split. Worth the preprocessing cost.',
             note='CLAHE confirmed.'),

        node(data, 'diego', '2026-05-14T10:00:00', 'link',
             'ICDAR 2019 dataset paper',
             refKind='Paper',
             title='ICDAR 2019 dataset paper',
             body='Considering adding ICDAR receipts for domain diversity. Checking license.',
             note='ICDAR 2019 — potential extra training data.'),

        node(data, 'diego', '2026-05-16T13:30:00', 'note',
             'ICDAR 2019 license incompatible with commercial use — not adding',
             title='ICDAR 2019 license blocks commercial use',
             body='Research-only license. Cannot use in production pipeline.',
             note='Dead end: ICDAR 2019 license.'),

        node(data, 'maya', '2026-05-19T15:00:00', 'commit',
             'Add rotation augmentation ±15° with fill',
             hash='a6b7c89', title='Add rotation aug ±15°',
             body='Handles tilted receipts. Fill with mean pixel value. Applied with p=0.2.',
             note='Rotation aug added.'),

        node(data, 'diego', '2026-05-22T10:00:00', 'note',
             'Heavy rotation (>15°) degrades CRAFT affinity maps — capped at ±15°',
             title='Rotation >15° degrades CRAFT affinity maps',
             body='Tried ±30°: affinity map alignment breaks. ±15° is the safe ceiling.',
             note='Rotation aug cap: ±15°.'),

        node(data, 'maya', '2026-05-25T14:00:00', 'commit',
             'Finalize training / val / test split v1.2',
             hash='c8d9e01', title='Finalize train/val/test split v1.2',
             body='70/15/15 split. Stratified by locale (EN, CJK, mixed) and receipt type.',
             note='Split v1.2 locked.'),

        # ── Model Training (~18 nodes) ───────────────────────────────────────
        node(train, 'jensen', '2026-04-17T09:00:00', 'link',
             'Mixed Precision Training (Micikevicius et al.)',
             refKind='Paper',
             title='Mixed Precision Training paper',
             body='Loss-scaling recipe for fp16. Following closely.',
             note='fp16 loss-scaling from this paper.'),

        node(train, 'jensen', '2026-04-19T12:00:00', 'commit',
             'Add mixed-precision training with AMP',
             hash='c0d9e22', title='Add mixed-precision training',
             body='AMP autocast + dynamic loss scaling across detector and recognizer.',
             note='fp16 AMP enabled.'),

        node(train, 'jensen', '2026-04-19T19:00:00', 'idea',
             'fp16 cut training time 38%, char-F1 within noise of fp32',
             metric='-38% wall time',
             title='fp16: -38% training time',
             body='Epoch 14m → 8.7m. No accuracy loss across 3 seeds.',
             note='fp16: major win.'),

        node(train, 'jensen', '2026-04-22T11:00:00', 'note',
             'LR warmup 500 steps is load-bearing — recognizer loss spikes without it',
             title='500-step LR warmup is load-bearing',
             body='First epoch recognizer loss spikes to 4.2 without warmup. 500 steps fixes it.',
             note='Warmup: do not remove.'),

        node(train, 'jensen', '2026-04-24T14:00:00', 'commit',
             'Add cosine LR schedule with 500-step warmup',
             hash='d1e2f33', title='Add cosine LR + warmup',
             body='Cosine annealing from peak LR to 1e-6 over total steps.',
             note='Cosine LR adopted.'),

        node(train, 'jensen', '2026-04-26T10:00:00', 'idea',
             'Cosine LR beats step decay — 86.0% vs 85.2% char-F1',
             metric='86.0% char-F1',
             title='Cosine LR: 86.0% vs step decay 85.2%',
             body='Consistent across 3 seeds. Cosine adopted as default.',
             note='Cosine LR confirmed.'),

        node(train, 'maya', '2026-04-29T15:00:00', 'commit',
             'Add EMA of model weights',
             hash='1e7b8d4', title='Add weight EMA',
             body='EMA decay=0.9999. Eval uses EMA copy. +0.4% steady gain.',
             note='Weight EMA: +0.4%.'),

        node(train, 'maya', '2026-05-01T11:00:00', 'idea',
             'Weight EMA gives steady +0.4% on eval — adopted',
             metric='+0.4% char-F1',
             title='Weight EMA: +0.4%',
             body='Tested across 5 seeds. Variance is lower too.',
             note='EMA confirmed.'),

        node(train, 'jensen', '2026-05-03T09:30:00', 'link',
             'PyTorch — gradient checkpointing docs',
             refKind='Docs',
             title='PyTorch gradient checkpointing',
             body='Memory-speed tradeoff reference.',
             note='Grad checkpointing reference.'),

        node(train, 'jensen', '2026-05-05T14:00:00', 'commit',
             'Add gradient checkpointing',
             hash='f3a4b55', title='Add gradient checkpointing',
             body='~18% slower per step but 2x effective batch size on A100.',
             note='Grad checkpointing: 2x batch.'),

        node(train, 'jensen', '2026-05-07T10:00:00', 'note',
             'Gradient checkpointing + EMA interact — need to checkpoint EMA copy separately',
             title='Checkpointing + EMA: save EMA copy too',
             body='Lost EMA state after crash. Added explicit EMA state to checkpoint dict.',
             note='Save EMA in checkpoint.'),

        node(train, 'maya', '2026-05-09T13:30:00', 'commit',
             'Add label smoothing ε=0.1 to CTC loss',
             hash='g5h6i77', title='Add label smoothing ε=0.1',
             body='Smoothing applied to recognizer CTC targets.',
             note='Label smoothing added.'),

        node(train, 'maya', '2026-05-11T11:00:00', 'idea',
             'Label smoothing ε=0.1 gives +0.3% char-F1',
             metric='+0.3% char-F1',
             title='Label smoothing: +0.3%',
             body='Small but consistent. CTC + label smooth is safe.',
             note='Label smoothing confirmed.'),

        node(train, 'diego', '2026-05-13T09:00:00', 'note',
             'Tried SWA (stochastic weight averaging) — no gain over EMA',
             title='SWA — no gain over EMA',
             body='Trained 3 seeds. SWA 86.1% vs EMA 86.3%. Not worth the complexity.',
             note='Dead end: SWA.'),

        node(train, 'jensen', '2026-05-16T14:30:00', 'commit',
             'Add AdamW optimizer with weight decay 0.01',
             hash='h7i8j99', title='Switch to AdamW wd=0.01',
             body='Adam → AdamW. Weight decay applied to non-bias, non-norm params.',
             note='AdamW adopted.'),

        node(train, 'jensen', '2026-05-18T10:00:00', 'idea',
             'AdamW +0.2% vs Adam — small but consistent',
             metric='+0.2% char-F1',
             title='AdamW: +0.2% over Adam',
             body='86.3 → 86.5 on eval set. Confirmed.',
             note='AdamW confirmed.'),

        node(train, 'maya', '2026-05-21T15:00:00', 'note',
             'Detector and recognizer need different LR — recognizer prefers 3x lower',
             title='Different LR for detector vs recognizer',
             body='Recognizer loss diverges at detector LR. Separate param groups: 1e-4 / 3e-5.',
             note='Per-module LR: detector 1e-4, recognizer 3e-5.'),

        node(train, 'jensen', '2026-05-24T11:00:00', 'commit',
             'Split optimizer param groups by module',
             hash='i9j0k11', title='Split optimizer param groups',
             body='Detector and recognizer now have separate LR groups.',
             note='Param group split committed.'),

        # ── Deployment Pipeline (~18 nodes) ────────────────────────────────
        node(deploy, 'diego', '2026-04-18T10:00:00', 'note',
             'Target: single-replica Triton on staging, then prod',
             title='Target: Triton on staging → prod',
             body='Recognizer not yet wired to serving stack.',
             note='Plan: Triton serving.'),

        node(deploy, 'diego', '2026-04-21T14:00:00', 'link',
             'NVIDIA Triton Inference Server docs',
             refKind='Docs',
             title='Triton Inference Server docs',
             body='Model config, dynamic batching, and health check endpoints.',
             note='Triton reference.'),

        node(deploy, 'diego', '2026-04-24T11:00:00', 'commit',
             'Add Dockerfile for OCR serving',
             hash='j1k2l33', title='Add serving Dockerfile',
             body='Base: nvcr.io/nvidia/tritonserver. Copies model repo.',
             note='Dockerfile done.'),

        node(deploy, 'diego', '2026-04-28T09:30:00', 'commit',
             'Add GitHub Actions CI: lint + build + push',
             hash='k3l4m55', title='CI: lint + build + push',
             body='Runs on PR. Pushes image to registry on main merge.',
             note='CI pipeline green.'),

        node(deploy, 'diego', '2026-04-30T15:00:00', 'note',
             'CI build time is 8 min — too slow, investigating layer caching',
             title='CI build time 8 min — needs caching',
             body='Docker layer cache not hitting. Missing cache-from config.',
             note='CI build slow.'),

        node(deploy, 'diego', '2026-05-03T10:00:00', 'commit',
             'Add Docker layer caching to CI',
             hash='l5m6n77', title='Add Docker layer caching',
             body='cache-from: type=gha. Build time 8m → 2.5m.',
             note='CI build: 8m → 2.5m.'),

        node(deploy, 'diego', '2026-05-05T14:30:00', 'note',
             'Spun up staging Triton — detector only, no load test yet',
             title='Staging Triton up — detector only',
             body='Single-replica. No load test, no autoscale, recognizer not wired.',
             note='Staging up but incomplete.'),

        node(deploy, 'diego', '2026-05-08T11:00:00', 'commit',
             'Export detector to ONNX',
             hash='m7n8o99', title='Export detector to ONNX',
             body='Opset 17. Verified outputs match PyTorch within 1e-5.',
             note='Detector ONNX exported.'),

        node(deploy, 'diego', '2026-05-10T09:00:00', 'idea',
             'ONNX detector: p99 latency 420ms — target is <300ms',
             metric='420ms p99',
             title='ONNX detector p99: 420ms (target <300ms)',
             body='Profiled on A10G. Bottleneck is CRAFT affinity head computation.',
             note='Need 30% latency reduction.'),

        node(deploy, 'diego', '2026-05-12T13:00:00', 'link',
             'TensorRT optimization guide',
             refKind='Docs',
             title='TensorRT optimization guide',
             body='FP16 and INT8 quantization for latency reduction.',
             note='TensorRT for latency.'),

        node(deploy, 'diego', '2026-05-14T11:00:00', 'commit',
             'Add TensorRT FP16 build for detector',
             hash='n9o0p11', title='TensorRT FP16 build',
             body='INT8 calibration attempted but accuracy drops 1.2%. FP16 only.',
             note='TRT FP16 deployed.'),

        node(deploy, 'diego', '2026-05-15T16:00:00', 'idea',
             'TensorRT FP16 cuts p99 latency 420ms → 270ms',
             metric='270ms p99',
             title='TRT FP16: p99 420ms → 270ms',
             body='Under 300ms target. INT8 is not viable due to accuracy loss.',
             note='Latency target met with FP16.'),

        node(deploy, 'diego', '2026-05-18T10:30:00', 'note',
             'INT8 quantization degrades char-F1 by 1.2% — not acceptable',
             title='INT8 not viable — 1.2% accuracy loss',
             body='ROC analysis: at current scale, 1.2% translates to ~2k extra errors/day.',
             note='Dead end: INT8 quantization.'),

        node(deploy, 'jensen', '2026-05-20T14:00:00', 'commit',
             'Wire recognizer into Triton multi-model pipeline',
             hash='o1p2q33', title='Wire recognizer into Triton',
             body='Detector + recognizer now run as Triton ensemble. End-to-end pipeline served.',
             note='Full pipeline on Triton.'),

        node(deploy, 'diego', '2026-05-22T11:00:00', 'idea',
             'End-to-end Triton pipeline p99: 410ms — needs optimization',
             metric='410ms e2e p99',
             title='E2E Triton p99: 410ms',
             body='Detector 270ms + recognizer 140ms. Recognizer not TRT-optimized yet.',
             note='Recognizer TRT export next.'),

        node(deploy, 'diego', '2026-05-24T09:00:00', 'commit',
             'Export recognizer to ONNX + TensorRT FP16',
             hash='p3q4r55', title='Recognizer ONNX + TRT FP16',
             body='Recognizer p99 140ms → 65ms after TRT. E2E now ~335ms.',
             note='Recognizer TRT done.'),

        node(deploy, 'diego', '2026-05-26T14:00:00', 'note',
             'Load test: 50 concurrent requests, p99 spikes to 800ms — need dynamic batching',
             title='Load test: p99 spikes at 50 concurrency',
             body='Triton dynamic batching not enabled. Enabling it queues requests optimally.',
             note='Enable dynamic batching.'),

        node(deploy, 'diego', '2026-05-28T10:00:00', 'commit',
             'Enable Triton dynamic batching — max_queue_delay_ms=5',
             hash='q5r6s77', title='Enable Triton dynamic batching',
             body='p99 at 50 concurrency: 800ms → 310ms. Within acceptable range.',
             note='Dynamic batching: 800ms → 310ms.'),

        # ── Error Handling (~14 nodes) ──────────────────────────────────────
        node(errors, 'diego', '2026-05-02T09:00:00', 'note',
             'Three main failure modes: rotated receipts, thermal fade, multi-column',
             title='Three main failure modes identified',
             body='From error analysis on 500 validation failures.',
             note='Failure taxonomy established.'),

        node(errors, 'diego', '2026-05-04T13:00:00', 'link',
             'Selective prediction in ML systems (blog post)',
             refKind='Article',
             title='Selective prediction in ML systems',
             body='Confidence thresholding + human-review routing pattern.',
             note='Confidence threshold pattern from here.'),

        node(errors, 'diego', '2026-05-06T10:00:00', 'commit',
             'Add confidence score output to pipeline',
             hash='r7s8t99', title='Add confidence score output',
             body='Character-level softmax max as proxy confidence. Aggregated per box.',
             note='Confidence scores added.'),

        node(errors, 'diego', '2026-05-08T14:30:00', 'note',
             'ROC analysis: threshold 0.7 gives precision 94%, recall 89%',
             title='Confidence threshold 0.7 → 94% precision, 89% recall',
             body='Threshold sweep from 0.5 to 0.95. 0.7 chosen as operating point.',
             note='Threshold 0.7 adopted.'),

        node(errors, 'diego', '2026-05-09T11:00:00', 'commit',
             'Route low-confidence outputs to human-review queue',
             hash='s9t0u11', title='Route low-confidence to review queue',
             body='Outputs with confidence < 0.7 flagged. Redis queue, worker polls.',
             note='Human-review routing live.'),

        node(errors, 'diego', '2026-05-12T09:30:00', 'idea',
             'Low-confidence rate: ~6% of prod volume — within budget',
             metric='~6% review rate',
             title='Review rate: ~6% of volume',
             body='Estimated 600 reviews/day at projected scale. Manual budget allows 1000/day.',
             note='Review rate acceptable.'),

        node(errors, 'maya', '2026-05-14T14:00:00', 'note',
             'Rotated receipts (>15°) — detect rotation and re-feed?',
             title='Rotated receipts: detect + re-feed approach',
             body='Could add rotation estimator before main pipeline. ~3% of failures.',
             note='Open: rotation pre-correction.'),

        node(errors, 'diego', '2026-05-16T10:00:00', 'commit',
             'Add skew detection and pre-correction step',
             hash='t1u2v33', title='Add skew detection + pre-correction',
             body='Hough line-based skew estimate. Corrects ±30°. Applied before crop.',
             note='Skew correction added.'),

        node(errors, 'diego', '2026-05-18T11:00:00', 'idea',
             'Skew correction reduces rotation failures by 70%',
             metric='-70% rotation failures',
             title='Skew correction: -70% rotation failures',
             body='Measured on rotated-receipts subset. Brings F1 from 68% → 82% on that slice.',
             note='Skew correction: major win.'),

        node(errors, 'maya', '2026-05-20T09:00:00', 'note',
             'Thermal-fade receipts still failing after CLAHE — need fallback path',
             title='Thermal fade: CLAHE not sufficient in all cases',
             body='Very severe fade (>80% pixel loss) still fails. Confidence correctly flags these.',
             note='Severe fade: routes to human review correctly.'),

        node(errors, 'diego', '2026-05-22T14:00:00', 'commit',
             'Add structured error response with failure reason codes',
             hash='u3v4w55', title='Add failure reason codes to API response',
             body='Codes: LOW_CONFIDENCE, SKEWED, MULTI_COLUMN, FADED. Downstream can handle per-type.',
             note='Error reason codes in API.'),

        node(errors, 'diego', '2026-05-25T10:00:00', 'note',
             'Downstream team wants retry logic built in — exposing retry endpoint',
             title='Downstream wants retry endpoint',
             body='Single endpoint that applies each fallback in sequence and returns best result.',
             note='Retry endpoint requested.'),

        node(errors, 'diego', '2026-05-27T13:00:00', 'commit',
             'Add /ocr/retry endpoint with fallback chain',
             hash='v5w6x77', title='Add /ocr/retry with fallback chain',
             body='Chain: skew-correct → CLAHE → beam-search → return highest-confidence result.',
             note='Retry endpoint live.'),

        node(errors, 'maya', '2026-05-30T11:00:00', 'note',
             'Multi-column receipts: column separator heuristic helps but still 40% fail rate',
             title='Multi-column: 40% fail rate after heuristic',
             body='Remaining failures need layout detection before OCR. Out of scope for Q2.',
             note='Multi-column: deferred to Q3.'),
    ]

    for n in nodes:
        db.session.add(n)

    # ── Tasks (~12 tasks) ──────────────────────────────────────────────────
    tasks = [
        Node(branch_id=ocr.id, created_by='priya', created_at=dt('2026-04-20T00:00:00'),
             type='task', content='Hit 90% char-F1 target',
             assigned_to='jensen', assignment_status='pending',
             _metadata=json.dumps({'due': '2026-06-05'})),

        Node(branch_id=ocr.id, created_by='priya', created_at=dt('2026-05-01T00:00:00'),
             type='task', content='Benchmark TTA across scales',
             assigned_to='jensen', assignment_status='pending',
             _metadata=json.dumps({'due': '2026-06-04'})),

        Node(branch_id=ocr.id, created_by='priya', created_at=dt('2026-05-20T00:00:00'),
             type='task', content='Fix multi-column receipt failures',
             assigned_to='diego', assignment_status='acknowledged',
             _metadata=json.dumps({'due': '2026-06-10'})),

        Node(branch_id=data.id, created_by='priya', created_at=dt('2026-04-22T00:00:00'),
             type='task', content='Validate CJK handling end-to-end',
             assigned_to='maya', assignment_status='done',
             _metadata=json.dumps({'due': '2026-05-02'})),

        Node(branch_id=data.id, created_by='priya', created_at=dt('2026-05-15T00:00:00'),
             type='task', content='Document augmentation pipeline',
             assigned_to='maya', assignment_status='pending',
             _metadata=json.dumps({'due': '2026-06-08'})),

        Node(branch_id=data.id, created_by='priya', created_at=dt('2026-05-20T00:00:00'),
             type='task', content='Get receipts-v2 relabeled',
             assigned_to='maya', assignment_status='pending',
             _metadata=json.dumps({'due': '2026-06-15'})),

        Node(branch_id=train.id, created_by='priya', created_at=dt('2026-04-25T00:00:00'),
             type='task', content='Final benchmark vs baseline',
             assigned_to='jensen', assignment_status='pending',
             _metadata=json.dumps({'due': '2026-06-04'})),

        Node(branch_id=train.id, created_by='priya', created_at=dt('2026-05-10T00:00:00'),
             type='task', content='Tune per-module learning rates',
             assigned_to='maya', assignment_status='done',
             _metadata=json.dumps({'due': '2026-05-24'})),

        Node(branch_id=deploy.id, created_by='priya', created_at=dt('2026-04-22T00:00:00'),
             type='task', content='Set up CI/CD pipeline',
             assigned_to='diego', assignment_status='done',
             _metadata=json.dumps({'due': '2026-05-05'})),

        Node(branch_id=deploy.id, created_by='priya', created_at=dt('2026-05-05T00:00:00'),
             type='task', content='Hit <300ms p99 latency on detector',
             assigned_to='diego', assignment_status='done',
             _metadata=json.dumps({'due': '2026-05-20'})),

        Node(branch_id=deploy.id, created_by='priya', created_at=dt('2026-05-25T00:00:00'),
             type='task', content='Load test at 50 concurrent — target p99 <400ms',
             assigned_to='diego', assignment_status='done',
             _metadata=json.dumps({'due': '2026-06-01'})),

        Node(branch_id=errors.id, created_by='priya', created_at=dt('2026-05-10T00:00:00'),
             type='task', content='Wire human-review queue in staging',
             assigned_to='diego', assignment_status='done',
             _metadata=json.dumps({'due': '2026-05-20'})),
    ]
    for t in tasks:
        db.session.add(t)

    # ── Contacts ───────────────────────────────────────────────────────────
    contacts = [
        Contact(project_id=project.id,
                name='Alex Kim', company='Acme Corp', role='Head of Finance',
                email='alex.kim@acme.com',
                notes='Primary stakeholder. Needs 90% accuracy by Q2 close.'),
        Contact(project_id=project.id,
                name='Sarah Lee', company='Acme Corp', role='Product Manager',
                email='sarah.lee@acme.com',
                notes='Coordinates feature requirements. Attends bi-weekly syncs.'),
        Contact(project_id=project.id,
                name='Tom Watkins', company='LabelStudio', role='Support Engineer',
                email='twatkins@labelstudio.io',
                notes='Point of contact for annotation tooling and data labeling pipeline.'),
    ]
    for c in contacts:
        db.session.add(c)

    db.session.commit()
    print('Seeded: 1 project, 5 branches, 90 nodes (22+18+18+18+14), 12 tasks, 3 contacts.')
