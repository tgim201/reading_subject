import React, { useState } from 'react'
import { loadPlans, deletePlan } from '../services/storage.js'

export default function Library({ onOpen }) {
  const [plans, setPlans] = useState(loadPlans())
  if (!plans.length) return <div className="card narrow center"><h2>📁 내 보관함</h2><p className="muted">저장된 지도안이 없습니다. 지도안을 만든 뒤 ‘보관함에 저장’을 눌러 보세요.</p></div>
  return (
    <div className="card">
      <h2>📁 내 보관함 ({plans.length})</h2>
      <div className="list">
        {plans.map((p) => (
          <div className="row" key={p.id}>
            <div>
              <b>{p.title}</b>
              <div className="muted small">{p.meta.subject} · {p.meta.area} · {p.meta.strategy} · {new Date(p.updatedAt).toLocaleString('ko-KR')}</div>
            </div>
            <div>
              <button className="primary" onClick={() => onOpen(p)}>열기·수정</button>{' '}
              <button onClick={() => { if (confirm('삭제할까요?')) { deletePlan(p.id); setPlans(loadPlans()) } }}>삭제</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
