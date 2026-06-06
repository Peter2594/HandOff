// app.jsx — top-level shell: screen routing + tweaks. Mounted by Handoff.html
const { useState: useStateA, useEffect: useEffectA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "timelineStyle": "railway",
  "accent": "#7F77DD"
}/*EDITMODE-END*/;

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [screen, setScreen] = useStateA('timeline');

  // accent flows through the --purple token
  useEffectA(() => { document.documentElement.style.setProperty('--purple', t.accent); }, [t.accent]);

  return (
    <div style={{ height:'100%' }}>
      {screen === 'timeline' && (
        <TimelineScreen
          styleVariant={t.timelineStyle}
          onOpenLog={() => setScreen('log')}
          onGenerateHandover={() => setScreen('handover')} />
      )}
      {screen === 'log' && <PersonalLogScreen onBack={() => setScreen('timeline')} />}
      {screen === 'handover' && <HandoverScreen onClose={() => setScreen('timeline')} />}

      <TweaksPanel>
        <TweakSection label="Timeline style" />
        <TweakRadio label="Layout" value={t.timelineStyle}
          options={['railway', 'dense', 'bands']}
          onChange={(v) => setTweak('timelineStyle', v)} />
        <div style={{ fontSize:11, color:'var(--muted)', lineHeight:1.5, padding:'2px 2px 4px' }}>
          {t.timelineStyle==='railway' && 'Railway map — the spec: thin tracks, circular entry nodes, tasks hanging below.'}
          {t.timelineStyle==='dense' && 'Dense — compact lanes and smaller nodes to fit more on screen.'}
          {t.timelineStyle==='bands' && 'Bands — alternating lane shading and heavier tracks for scannability.'}
        </div>
        <TweakSection label="Theme" />
        <TweakColor label="Accent" value={t.accent}
          options={['#7F77DD', '#378ADD', '#1D9E75', '#EF9F27']}
          onChange={(v) => setTweak('accent', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
