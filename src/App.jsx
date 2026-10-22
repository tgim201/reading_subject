import React, { useState } from 'react'
import { loadKnowledge } from './services/ontologyEngine.js'
import { loadUser, saveUser, clearUser, loadSettings, saveSettings } from './services/storage.js'
import Login from './components/Login.jsx'
import Wizard from './components/Wizard.jsx'
import Library from './components/Library.jsx'
import Admin from './components/Admin.jsx'
import Settings from './components/Settings.jsx'

export default function App() {
  const [k, setK] = useState(() => loadKnowledge())
  const [user, setUser] = useState(loadUser())
  const [view, setView] = useState('wizard')
  const [settings, setSettings] = useState(loadSettings())
  const [editing, setEditing] = useState(null) // 보관함에서 불러온 지도안
  const [wizardKey, setWizardKey] = useState(0)

  if (!user) {
    return <Login onLogin={(u) => { saveUser(u); setUser(u); setView(u.role === 'admin' ? 'admin' : 'wizard') }} />
  }

  const go = (v) => setView(v)
  const newPlan = () => { setEditing(null); setWizardKey((n) => n + 1); setView('wizard') }
  const nav = [
    ['wizard', '✏️ 지도안 만들기'],
    ['library', '📁 내 보관함'],
    ...(user.role === 'admin' ? [['admin', '🛠 온톨로지 관리']] : []),
    ['settings', '⚙️ 설정'],
  ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand" onClick={newPlan}>📚 독서전략 수업지도안</div>
        <nav>
          {nav.map(([id, label]) => (
            <button key={id} className={view === id ? 'tab active' : 'tab'} onClick={() => (id === 'wizard' ? setView('wizard') : go(id))}>{label}</button>
          ))}
        </nav>
        <div className="who">
          {user.name}{user.school ? ` (${user.school})` : ''}{user.role === 'admin' ? ' · 관리자' : ''}
          <button className="link" onClick={() => { clearUser(); setUser(null) }}>로그아웃</button>
        </div>
      </header>
      <main>
        {view === 'wizard' && <Wizard key={wizardKey} k={k} settings={settings} user={user} initial={editing} onNew={newPlan} onGoSettings={() => go('settings')} />}
        {view === 'library' && <Library onOpen={(p) => { setEditing(p); setWizardKey((n) => n + 1); setView('wizard') }} />}
        {view === 'admin' && user.role === 'admin' && <Admin k={k} onChange={() => setK(loadKnowledge())} />}
        {view === 'settings' && <Settings settings={settings} onSave={(s) => { saveSettings(s); setSettings(s) }} />}
      </main>
      <footer className="foot">2022 개정 교육과정 온톨로지 · 독서전략 · PISA 텍스트 유형 · 가네 9사태 기반 · 교과 {k.subjects.map((s) => s.label).join(', ')}</footer>
    </div>
  )
}
