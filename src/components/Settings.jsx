import React, { useState } from 'react'

export default function Settings({ settings, onSave }) {
  const [apiKey, setApiKey] = useState(settings.apiKey)
  const [model, setModel] = useState(settings.model)
  const [done, setDone] = useState(false)
  return (
    <div className="card narrow">
      <h2>⚙️ AI 설정 (선택)</h2>
      <p className="muted">Gemini API 키를 입력하면 AI가 학습자 눈높이의 읽기자료와 지도안을 작성합니다. 비워 두면 온톨로지 기반 기본 초안이 만들어집니다.</p>
      <label>Gemini API 키<input type="password" value={apiKey} onChange={(e) => { setApiKey(e.target.value); setDone(false) }} placeholder="https://aistudio.google.com/apikey 에서 발급" /></label>
      <label>모델 이름<input value={model} onChange={(e) => { setModel(e.target.value); setDone(false) }} /></label>
      <p className="muted small">키는 이 브라우저에만 저장되며 Google API 호출 외에는 전송되지 않습니다. 공용 컴퓨터에서는 사용 후 지워 주세요.</p>
      <button className="primary" onClick={() => { onSave({ apiKey: apiKey.trim(), model: model.trim() || 'gemini-2.5-flash' }); setDone(true) }}>저장</button>
      {done && <span className="ok"> ✓ 저장되었습니다</span>}
    </div>
  )
}
