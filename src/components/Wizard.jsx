import React, { useMemo, useState } from 'react'
import { recommend, recommendInstruction, instructionEventIndex } from '../services/ontologyEngine.js'
import { generateAll } from '../services/generator.js'
import { savePlan } from '../services/storage.js'
import { mdToHtml, copyMarkdown, downloadMarkdown, downloadDoc, printPlan } from '../services/exportUtils.js'

const ICON = { 과학: '🔬', 국어: '📖', 수학: '📐', 사회: '🌏', '기술·가정': '🏠', 기술가정: '🏠' }
const iconOf = (label) => Object.entries(ICON).find(([k]) => label.includes(k))?.[1] || '📘'
const STEPS = ['① 교과 내용 고르기', '② 글 유형·독서전략', '③ 수업지도안 완성']

export default function Wizard({ k, settings, user, initial, onNew, onGoSettings }) {
  const [step, setStep] = useState(initial ? 3 : 1)
  const [subjectId, setSubjectId] = useState(null)
  const [areaId, setAreaId] = useState(null)
  const [elementId, setElementId] = useState(null)
  const [skillId, setSkillId] = useState(null)
  const [grade, setGrade] = useState('중학교 1학년')
  const [minutes, setMinutes] = useState(45)
  const [formatId, setFormatId] = useState(null)
  const [contentId, setContentId] = useState(null)
  const [strategy, setStrategy] = useState(null)
  const [insId, setInsId] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(initial?.result || null)
  const [meta, setMeta] = useState(initial?.meta || null)
  const [planId, setPlanId] = useState(initial?.id || null)
  const [saved, setSaved] = useState(false)

  const subject = k.subjects.find((s) => s.id === subjectId)
  const area = subject?.areas.find((a) => a.id === areaId)
  const element = area?.elements.find((e) => e.id === elementId)
  const skill = subject?.skills.find((s) => s.id === skillId)
  const formats = k.text.Format || []
  const contents = k.text.ContentType || []
  const format = formats.find((f) => f.id === formatId) || formats[0]
  const content = contents.find((c) => c.id === contentId) || contents.find((c) => c.label === '설명') || contents[0]

  const recs = useMemo(
    () => (element ? recommend(k, { subject, skill, element, formatLabel: format?.label, contentLabel: content?.label }) : []),
    [k, subject, skill, element, format, content],
  )
  const chosen = recs.find((r) => r.id === strategy) || null
  const insRecs = useMemo(
    () => (element ? recommendInstruction(k, { skill, contentLabel: content?.label, grade, excludeLabels: recs.map((r) => r.label) }) : []),
    [k, skill, content, grade, recs, element],
  )
  const chosenIns = insRecs.find((r) => r.id === insId) || null
  const STAGE_NAMES = ['', '', '', '', '', '6단계(학생 수행)', '7단계(피드백)', '', '9단계(파지와 전이)']

  const pickSubject = (id) => { setSubjectId(id); setAreaId(null); setElementId(null); setSkillId(null); setStrategy(null) }
  const pickArea = (id) => { setAreaId(id); setElementId(null); setStrategy(null) }

  const generate = async () => {
    setBusy(true)
    const instruction = chosenIns ? { label: chosenIns.label, description: chosenIns.description, verbs: chosenIns.verbs, eventIdx: instructionEventIndex(chosenIns) } : null
    const ctx = { subject, area, element, coreIdeas: area.coreIdeas, skill, grade, minutes, formatLabel: format.label, contentLabel: content.label, strategy: chosen, events: k.events, instruction }
    const r = await generateAll(ctx, settings)
    setResult(r)
    setMeta({ subject: subject.label, area: area.label, element: element.label, skill: skill?.label || '', format: format.label, contentType: content.label, strategy: chosen.label, instruction: chosenIns?.label || '', grade, minutes })
    setPlanId(null); setSaved(false); setBusy(false); setStep(3)
  }

  const setRow = (i, key, v) => {
    const plan = result.plan.map((r, j) => (j === i ? { ...r, [key]: v } : r))
    setResult({ ...result, plan }); setSaved(false)
  }
  const current = () => ({
    id: planId || `plan_${Date.now()}`,
    title: `${meta.subject} - ${meta.element} (${meta.strategy})`,
    author: user.name, meta, result, updatedAt: Date.now(),
  })
  const save = () => { const p = current(); savePlan(p); setPlanId(p.id); setSaved(true) }

  return (
    <div>
      <ol className="steps">
        {STEPS.map((s, i) => (
          <li key={s} className={step === i + 1 ? 'on' : step > i + 1 ? 'done' : ''}>{s}</li>
        ))}
      </ol>

      {step === 1 && (
        <div className="card">
          <h2>1. 어떤 교과의 어떤 내용을 가르칠까요?</h2>
          <div className="cards">
            {k.subjects.map((s) => (
              <button key={s.id} className={'subject' + (s.id === subjectId ? ' on' : '')} onClick={() => pickSubject(s.id)}>
                <span className="ico">{iconOf(s.label)}</span>{s.label}
              </button>
            ))}
          </div>

          {subject && (<>
            <h3>영역</h3>
            <div className="chips">
              {subject.areas.map((a) => <button key={a.id} className={'chip' + (a.id === areaId ? ' on' : '')} onClick={() => pickArea(a.id)}>{a.label}</button>)}
            </div>
          </>)}

          {area && (<>
            <h3>내용 요소 (지식·이해)</h3>
            <div className="chips">
              {area.elements.map((e) => <button key={e.id} className={'chip' + (e.id === elementId ? ' on' : '')} onClick={() => setElementId(e.id)}>{e.label}</button>)}
            </div>
            {!!area.coreIdeas.length && <div className="hint"><b>핵심 아이디어</b><ul>{area.coreIdeas.map((c) => <li key={c}>{c}</li>)}</ul></div>}
            <h3>과정·기능 <span className="muted small">(독서전략 추천에 사용됩니다)</span></h3>
            <div className="chips">
              {subject.skills.map((s) => <button key={s.id} className={'chip' + (s.id === skillId ? ' on' : '')} onClick={() => { setSkillId(s.id === skillId ? null : s.id); setStrategy(null) }}>{s.label}</button>)}
            </div>
            <div className="inline">
              <label>학년<select value={grade} onChange={(e) => setGrade(e.target.value)}>{['중학교 1학년', '중학교 2학년', '중학교 3학년'].map((g) => <option key={g}>{g}</option>)}</select></label>
              <label>수업 시간(분)<input type="number" min="20" max="100" value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 45)} /></label>
            </div>
          </>)}

          <div className="actions"><button className="primary big" disabled={!element} onClick={() => setStep(2)}>다음 ▶</button></div>
        </div>
      )}

      {step === 2 && element && (
        <div className="card">
          <h2>2. 글의 종류와 독서전략을 고르세요</h2>
          <p className="muted">선택: {subject.label} › {area.label} › <b>{element.label}</b>{skill ? ` · ${skill.label}` : ''}</p>
          <h3>글의 체재</h3>
          <div className="chips">{formats.map((f) => <button key={f.id} title={f.description} className={'chip' + (f.id === format?.id ? ' on' : '')} onClick={() => { setFormatId(f.id); setStrategy(null) }}>{f.label}</button>)}</div>
          <p className="muted small">{format?.description}</p>
          <h3>글의 유형(내용)</h3>
          <div className="chips">{contents.map((c) => <button key={c.id} title={c.description} className={'chip' + (c.id === content?.id ? ' on' : '')} onClick={() => { setContentId(c.id); setStrategy(null) }}>{c.label}</button>)}</div>
          <p className="muted small">{content?.description}</p>

          <h3>⭐ 추천 독서전략 <span className="muted small">(과정·기능과 글 유형에 맞춰 추천)</span></h3>
          <div className="recs">
            {recs.map((r, i) => (
              <button key={r.id} className={'rec' + (r.id === strategy ? ' on' : '')} onClick={() => setStrategy(r.id)}>
                <span className="badge">추천 {i + 1}</span>
                <b>{r.label}</b>
                <span className="muted small">{r.reason}</span>
              </button>
            ))}
          </div>

          {!!insRecs.length && (<>
            <h3>🧩 정보활용 수업전략 추가 <span className="muted small">(선택 · 과정·기능 수행동사에 맞춰 추천)</span></h3>
            <div className="recs">
              {insRecs.map((r) => (
                <button key={r.id} className={'rec' + (r.id === insId ? ' on' : '')} onClick={() => setInsId(r.id === insId ? null : r.id)}>
                  <span className="badge ins">{STAGE_NAMES[instructionEventIndex(r)]}에 반영</span>
                  <b>{r.label}</b>
                  <span className="small">{r.description}</span>
                  <span className="muted small">{r.reason}</span>
                </button>
              ))}
            </div>
          </>)}
 && <div className="hint">AI 키가 없어 <b>기본 초안</b>이 생성됩니다. 더 좋은 읽기자료는 <button className="link" onClick={onGoSettings}>설정</button>에서 Gemini 키를 입력하세요.</div>}
          <div className="actions">
            <button onClick={() => setStep(1)}>◀ 이전</button>
            <button className="primary big" disabled={!chosen || busy} onClick={generate}>{busy ? '만드는 중…' : '✨ 읽기자료·지도안 만들기'}</button>
          </div>
        </div>
      )}

      {step === 3 && result && meta && (
        <div className="stack">
          <div className="card">
            <div className="titlebar">
              <h2>3. {meta.subject} · {meta.element} <span className="badge">{meta.strategy}</span>{meta.instruction && <> <span className="badge ins">{meta.instruction}</span></>}</h2>
              <div className="toolbar">
                <button className="primary" onClick={save}>💾 보관함에 저장</button>
                <button onClick={() => copyMarkdown(current()).then(() => alert('복사되었습니다.'))}>복사</button>
                <button onClick={() => downloadMarkdown(current())}>마크다운(.md)</button>
                <button onClick={() => downloadDoc(current())}>한글·워드(.doc)</button>
                <button onClick={() => printPlan(current())}>인쇄/PDF</button>
              </div>
            </div>
            {saved && <div className="ok">✓ 보관함에 저장했습니다.</div>}
            {result.notice && <div className="error">{result.notice}</div>}
            <div className="muted small">생성 방식: {result.source === 'gemini' ? 'AI(Gemini)' : '온톨로지 기본 초안'} · 아래 내용은 모두 직접 수정할 수 있습니다.</div>
          </div>

          <div className="card">
            <h3>📄 읽기자료</h3>
            <div className="two">
              <textarea rows={16} value={result.passage} onChange={(e) => { setResult({ ...result, passage: e.target.value }); setSaved(false) }} />
              <div className="preview" dangerouslySetInnerHTML={{ __html: mdToHtml(result.passage) }} />
            </div>
            {!!result.vocabulary?.length && <ul>{result.vocabulary.map((v, i) => <li key={i}><b>{v.word}</b>: {v.meaning}</li>)}</ul>}
            <h3>📝 독서 활동지 질문</h3>
            {result.questions.map((q, i) => (
              <input key={i} className="full" value={q} onChange={(e) => setResult({ ...result, questions: result.questions.map((x, j) => (j === i ? e.target.value : x)) })} />
            ))}
          </div>

          <div className="card">
            <h3>🗂 가네 9사태 수업지도안</h3>
            <div className="scroll">
              <table className="tbl plan">
                <thead><tr><th>단계</th><th>수업사태</th><th>교사 활동</th><th>학생 활동</th><th>시간</th><th>독서전략 연계</th></tr></thead>
                <tbody>
                  {result.plan.map((r, i) => (
                    <tr key={i}>
                      <td>{r.step}</td>
                      <td><b>{r.eventName}</b></td>
                      <td><textarea rows={5} value={r.teacherActivity} onChange={(e) => setRow(i, 'teacherActivity', e.target.value)} /></td>
                      <td><textarea rows={5} value={r.studentActivity} onChange={(e) => setRow(i, 'studentActivity', e.target.value)} /></td>
                      <td><input className="time" value={r.time} onChange={(e) => setRow(i, 'time', e.target.value)} /></td>
                      <td><textarea rows={3} value={r.strategyLink} onChange={(e) => setRow(i, 'strategyLink', e.target.value)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="actions">
              <button onClick={() => (initial ? onNew() : setStep(2))}>{initial ? '새 지도안 만들기' : '◀ 전략 다시 고르기'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
