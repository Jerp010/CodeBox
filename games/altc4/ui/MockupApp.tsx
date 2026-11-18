import { useState } from 'react';

export type MockupRole = 'host' | 'spec-holder' | 'programmer';
type MockupState = 'ready' | 'checking' | 'paused';

const roles: Array<{ id: MockupRole; label: string }> = [
  { id: 'host', label: 'Host' },
  { id: 'spec-holder', label: 'Spec Holder' },
  { id: 'programmer', label: 'Programmer' },
];

// Render the separate static interface study with local role and display-state selectors.
export function MockupApp({
  initialRole = 'host',
  onExit,
}: {
  initialRole?: MockupRole;
  onExit?: () => void;
}) {
  const [role, setRole] = useState<MockupRole>(initialRole);
  const [state, setState] = useState<MockupState>('ready');

  return (
    <main className="altc4-shell">
      <header className="altc4-topbar">
        <a className="altc4-brand" href="#mockup" aria-label="Alt+C4 mockup home">
          <span className="altc4-brand-mark">C4</span>
          <span>BOOM BANANA <small>ALT+C4 / INTERFACE STUDY</small></span>
        </a>
        <div className="altc4-toolbar">
          <label className="altc4-select-label">
            <span>View</span>
            <select value={role} onChange={(event) => setRole(event.target.value as MockupRole)}>
              {roles.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
            </select>
          </label>
          <label className="altc4-select-label">
            <span>Preview state</span>
            <select value={state} onChange={(event) => setState(event.target.value as MockupState)}>
              <option value="ready">Ready</option>
              <option value="checking">Checking answer</option>
              <option value="paused">Paused</option>
            </select>
          </label>
          {onExit && <button className="altc4-button altc4-button-quiet" onClick={onExit}>Return to menu</button>}
        </div>
      </header>

      <div className="altc4-mockup-banner text-xs tracking-widest uppercase" role="note">
        <span className="altc4-banner-dot" /> MOCKUP · SAMPLE DATA · NO LIVE GAME STATE
      </div>

      <section className="altc4-workspace" aria-live="polite">
        {role === 'host' && <HostMockup state={state} />}
        {role === 'spec-holder' && <SpecHolderMockup state={state} />}
        {role === 'programmer' && <ProgrammerMockup state={state} />}
      </section>
      <footer className="altc4-footer"><span>WORKSHOP BUILD 01</span><span>LOCAL PREVIEW · CONTROLS DO NOT SUBMIT</span></footer>
    </main>
  );
}

// Show the selected sample feedback state without running game logic.
function StateNotice({ state }: { state: MockupState }) {
  const notice = {
    ready: { icon: '✓', title: 'SYSTEM READY', detail: 'Waiting for the next repair step.' },
    checking: { icon: '…', title: 'CHECKING PATCH', detail: 'The clock keeps running while an answer is checked.' },
    paused: { icon: 'Ⅱ', title: 'ROUND PAUSED', detail: 'A teammate disconnected. This sample view is paused.' },
  }[state];
  return <div className={`altc4-state altc4-state-${state}`}><span className="altc4-state-icon">{notice.icon}</span><div><strong>{notice.title}</strong><p>{notice.detail}</p></div></div>;
}

// Render a labelled sample statistic in the mock host view.
function Stat({ label, value, tone = '' }: { label: string; value: string; tone?: string }) {
  return <div className={`altc4-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

// Preview the shared bomb workbench using fixed sample progress, time, and chances.
function HostMockup({ state }: { state: MockupState }) {
  return <>
    <div className="altc4-page-heading"><div><span className="altc4-kicker">CONTROL DESK / ROOM 7K2</span><h1>Bomb workbench</h1><p>Shared round overview for the host station.</p></div><span className="altc4-round-tag">ROUND 01 · MOCKUP</span></div>
    <StateNotice state={state} />
    <div className="altc4-host-grid">
      <section className="altc4-card altc4-bomb-card">
        <div className="altc4-card-heading"><div><span className="altc4-kicker">LIVE WORKBENCH</span><h2>Repair progress</h2></div><span className="altc4-live-chip"><i /> ROUND ACTIVE</span></div>
        <div className="altc4-bomb-art" aria-label="Illustration of a workshop bomb with three panels">
          <span className="altc4-wire wire-yellow" /><span className="altc4-wire wire-blue" /><span className="altc4-wire wire-red" />
          <div className="altc4-bomb-top"><i /></div><div className="altc4-bomb-body"><div className="altc4-bomb-display">00:42</div><div className="altc4-bomb-panels"><span className="panel-done">✓</span><span className="panel-active">02</span><span>03</span></div><small>REPAIR UNIT 04</small></div>
        </div>
        <div className="altc4-panel-list"><div className="altc4-panel-row"><span className="panel-index done">01</span><span><b>Loop counter</b><small>Fixed by Programmer</small></span><em>SEALED</em></div><div className="altc4-panel-row active"><span className="panel-index">02</span><span><b>Boundary check</b><small>Programmer is editing</small></span><em>ACTIVE</em></div><div className="altc4-panel-row"><span className="panel-index">03</span><span><b>Return value</b><small>Waiting for turn</small></span><em>LOCKED</em></div></div>
      </section>
      <aside className="altc4-host-side"><section className="altc4-card altc4-stats-card"><div className="altc4-card-heading"><div><span className="altc4-kicker">ROUND STATUS</span><h2>Keep an eye on it</h2></div></div><div className="altc4-stat-grid"><Stat label="TIME LEFT" value="00:42" tone="stat-warning" /><Stat label="CHANCES" value="♥ ♥ ♥" tone="stat-lives" /><Stat label="PANELS" value="1 / 3" /><Stat label="LANGUAGE" value="JAVA" /></div></section><section className="altc4-card altc4-player-card"><span className="altc4-kicker">TEAM LINK</span><h2>Two roles, one repair</h2><div className="altc4-teammate"><span className="altc4-avatar avatar-spec">S</span><div><b>Spec Holder</b><small>Field manual open</small></div><span className="connection-dot" /></div><div className="altc4-teammate"><span className="altc4-avatar avatar-programmer">P</span><div><b>Programmer</b><small>Editing panel 02</small></div><span className="connection-dot" /></div></section><div className="altc4-host-hint"><span>⌁</span><p>Host view stays shared. Puzzle instructions and answer details remain private to the players.</p></div></aside>
    </div>
  </>;
}

// Preview the private manual and local checklist using fixed sample instructions.
function SpecHolderMockup({ state }: { state: MockupState }) {
  return <>
    <div className="altc4-page-heading"><div><span className="altc4-kicker">FIELD MANUAL / ROOM 7K2</span><h1>Read the repair card</h1><p>Give your teammate the clue. They have the code panel.</p></div><span className="altc4-role-stamp spec-stamp">SPEC HOLDER</span></div>
    <StateNotice state={state} />
    <div className="altc4-role-grid spec-grid"><section className="altc4-card altc4-brief-card"><div className="altc4-card-heading"><div><span className="altc4-kicker">PANEL 02 OF 03</span><h2>The boundary check</h2></div><span className="altc4-language-tag">JAVA</span></div><p className="altc4-brief-lead">This loop should process every item in the list, including the final one.</p><div className="altc4-instruction"><span className="instruction-number">01</span><div><b>Look at the stopping condition</b><p>The loop stops as soon as its index reaches the final valid position. Check the comparison against the list length.</p></div></div><div className="altc4-instruction"><span className="instruction-number">02</span><div><b>Tell your teammate what to change</b><p>Keep the starting index and loop body as they are. Only the boundary comparison needs a repair.</p></div></div><div className="altc4-checklist"><span className="altc4-kicker">FIELD CHECKLIST</span><label><input type="checkbox" defaultChecked /> Start at the first item</label><label><input type="checkbox" /> Include the final item</label><label><input type="checkbox" /> Leave the loop body unchanged</label></div><div className="altc4-communication"><span className="altc4-avatar avatar-programmer">P</span><span>Explain the change out loud to your Programmer.</span><b>VOICE ONLY</b></div></section><aside className="altc4-role-aside"><section className="altc4-card altc4-clock-card"><span className="altc4-kicker">SHARED CLOCK</span><strong>00:42</strong><div className="altc4-clock-track"><i /></div><small>TIME KEEPS TICKING DURING CHECKS</small></section><section className="altc4-card altc4-chances-card"><span className="altc4-kicker">TEAM CHANCES</span><strong>♥ <i>♥</i> <i>♥</i></strong><p>One shared pool for the whole bomb.</p></section><div className="altc4-tip-card"><b>Good clue, no spoilers.</b><p>You can guide the repair, but the code panel stays on your teammate's screen.</p></div></aside></div>
  </>;
}

// Preview locked code and a disabled check control using a fixed sample puzzle.
function ProgrammerMockup({ state }: { state: MockupState }) {
  return <>
    <div className="altc4-page-heading"><div><span className="altc4-kicker">REPAIR CONSOLE / ROOM 7K2</span><h1>Patch the broken loop</h1><p>Your Spec Holder has the repair card. Talk through the fix together.</p></div><span className="altc4-role-stamp programmer-stamp">PROGRAMMER</span></div>
    <StateNotice state={state} />
    <div className="altc4-role-grid programmer-grid"><section className="altc4-card altc4-editor-card"><div className="altc4-card-heading editor-heading"><div><span className="altc4-kicker">PANEL 02 / EDITABLE LINE 04</span><h2>Boundary check</h2></div><span className="altc4-language-tag">JAVA</span></div><div className="altc4-code-window"><div className="altc4-code-toolbar"><span><i /> repair-loop.java</span><small>LOCKED CODE + ONE EDIT SLOT</small></div><pre aria-label="Sample Java code with one editable line"><code><span className="code-line"><i>01</i><span className="locked-code"><b>public</b> <b>static</b> <em>int</em> <strong>process</strong>(List&lt;Item&gt; items) {'{'}</span></span><span className="code-line"><i>02</i><span className="locked-code">  <b>int</b> total = <mark>0</mark>;</span></span><span className="code-line"><i>03</i><span className="locked-code">  <b>for</b> (<b>int</b> i = <mark>0</mark>; </span></span><span className="code-line editable-line"><i>04</i><span><b>i</b> &lt; items.size() - <mark>1</mark>; i++</span><sup>EDIT HERE</sup></span><span className="code-line"><i>05</i><span className="locked-code">  ) {'{'}</span></span><span className="code-line"><i>06</i><span className="locked-code">    total += items.get(i).value();</span></span><span className="code-line"><i>07</i><span className="locked-code">  {'}'}</span></span><span className="code-line"><i>08</i><span className="locked-code">  <b>return</b> total;</span></span><span className="code-line"><i>09</i><span className="locked-code">{'}'}</span></span></code></pre><div className="altc4-code-foot"><span>LOCKED LINES</span><span><i /> ONE EDITABLE SLOT</span></div></div><div className="altc4-editor-actions"><p>Tell your teammate what to change. This mockup keeps the code read-only.</p><button className="altc4-button altc4-button-primary" disabled>{state === 'checking' ? 'Checking patch…' : 'Check patch'}</button></div></section><aside className="altc4-role-aside programmer-aside"><section className="altc4-card altc4-clock-card"><span className="altc4-kicker">TIME LEFT</span><strong>00:42</strong><div className="altc4-clock-track"><i /></div><small>THE CLOCK RUNS DURING CHECKING</small></section><section className="altc4-card altc4-chances-card"><span className="altc4-kicker">CHANCES LEFT</span><strong>♥ <i>♥</i> <i>♥</i></strong><p>Incorrect checked answers cost one chance.</p></section><section className={`altc4-feedback altc4-feedback-${state}`}><span>{state === 'checking' ? '…' : state === 'paused' ? 'Ⅱ' : '!'}</span><div><b>{state === 'checking' ? 'Checking your patch' : state === 'paused' ? 'Round on pause' : 'Your partner has the brief'}</b><p>{state === 'checking' ? 'Please wait. Keep this panel open.' : state === 'paused' ? 'Reconnect to continue with your saved work.' : 'Share the instruction and agree on the one-line change.'}</p></div></section></aside></div>
  </>;
}
