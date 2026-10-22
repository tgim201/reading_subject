import React, { useState } from 'react'
import { validateTTL, KIND_LABEL } from '../services/ontologyEngine.js'
import { saveCustomOntology, deleteCustomOntology } from '../services/storage.js'

export default function Admin({ k, onChange }) {
  const [open, setOpen] = useState(null)
  const [draft, setDraft] = useState('')
  const [name, setName] = useState('새교과.ttl')
  const [check, setCheck] = useState(null)

  const run = (text) => { setDraft(text); setCheck(validateTTL(text)) }
  const onFile = async (e) => {
    const f = e.target.files[0]
    if (!f) return
    setName(f.name)
    run(await f.text())
    e.target.value = ''
  }
  const save = () => {
    const n = name.endsWith('.ttl') ? name : `${name}.ttl`
    saveCustomOntology(n, draft)
    setCheck(null); setDraft(''); onChange()
    alert(`'${n}' 이(가) 추가되었습니다. 지도안 만들기 화면에서 바로 사용할 수 있습니다.`)
  }

  return (
    <div className="stack">
      <div className="card">
        <h2>🛠 온톨로지 파일 관리</h2>
        <p className="muted">교과는 ‘<code>ex:Subject</code> 인스턴스를 가진 .ttl 파일’로 자동 인식됩니다. 5개 교과 외에 새 교과를 추가하려면 아래에서 파일을 올리거나 붙여넣으세요.</p>
        <table className="tbl">
          <thead><tr><th>파일</th><th>종류</th><th>트리플</th><th>구분</th><th /></tr></thead>
          <tbody>
            {k.files.map((f) => (
              <React.Fragment key={f.name}>
                <tr>
                  <td>{f.name}</td>
                  <td>{f.error ? <span className="error">오류</span> : f.kinds.map((x) => KIND_LABEL[x]).join(', ') || '-'}</td>
                  <td>{f.triples}</td>
                  <td>{f.custom ? '추가됨(브라우저)' : '기본 내장'}</td>
                  <td>
                    <button onClick={() => setOpen(open === f.name ? null : f.name)}>보기</button>{' '}
                    {f.custom && <button onClick={() => { if (confirm('삭제할까요?')) { deleteCustomOntology(f.name); onChange() } }}>삭제</button>}
                  </td>
                </tr>
                {open === f.name && <tr><td colSpan="5">{f.error && <div className="error">{f.error}</div>}<textarea className="code" readOnly value={f.text} rows={12} /></td></tr>}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h3>➕ 새 교과(또는 전략·텍스트 유형) 추가</h3>
        <label>.ttl 파일 선택<input type="file" accept=".ttl,text/turtle" onChange={onFile} /></label>
        <label>저장할 파일 이름<input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <label>Turtle 코드 (직접 붙여넣기·수정 가능)
          <textarea className="code" rows={10} value={draft} onChange={(e) => run(e.target.value)} placeholder="@prefix ex: <https://example.org/curriculum/ethics#> ." />
        </label>
        {check && (check.ok
          ? <div className="ok">✓ 문법 이상 없음 · 트리플 {check.triples}개 · {check.kinds.map((x) => KIND_LABEL[x]).join(', ') || '인식된 종류 없음'}{check.subjectLabel ? ` · 교과명: ${check.subjectLabel}` : ''}</div>
          : <div className="error">✗ {check.error}</div>)}
        <button className="primary" disabled={!check?.ok || !check.kinds.length} onClick={save}>추가하기</button>
        <p className="muted small">※ 업로드한 파일은 이 브라우저에만 저장됩니다. 모든 교사에게 반영하려면 파일을 <code>src/ontologies/</code> 폴더에 넣고 다시 배포하세요.</p>
      </div>
    </div>
  )
}
