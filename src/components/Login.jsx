import React, { useState } from 'react'

// 관리자 비밀번호는 정적 사이트 특성상 화면 접근 제어용일 뿐 보안 장치가 아닙니다.
// 배포 전 원하는 값으로 바꾸세요.
const ADMIN_PASSWORD = 'admin1234'

export default function Login({ onLogin }) {
  const [tab, setTab] = useState('teacher')
  const [name, setName] = useState('')
  const [school, setSchool] = useState('')
  const [pw, setPw] = useState('')
  const [err, setErr] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!name.trim()) return setErr('이름(또는 닉네임)을 입력해 주세요.')
    if (tab === 'admin') {
      if (pw !== ADMIN_PASSWORD) return setErr('비밀번호가 올바르지 않습니다.')
      return onLogin({ name: name.trim(), school: school.trim(), role: 'admin' })
    }
    onLogin({ name: name.trim(), school: school.trim(), role: 'teacher' })
  }

  return (
    <div className="login-wrap">
      <form className="login card" onSubmit={submit}>
        <h1>📚 독서전략 수업지도안</h1>
        <p className="muted">교과 내용에 맞는 읽기자료와 가네 9사태 수업지도안을 쉽게 만들어 보세요.</p>
        <div className="seg">
          <button type="button" className={tab === 'teacher' ? 'on' : ''} onClick={() => { setTab('teacher'); setErr('') }}>교사 입장</button>
          <button type="button" className={tab === 'admin' ? 'on' : ''} onClick={() => { setTab('admin'); setErr('') }}>관리자 입장</button>
        </div>
        <label>이름(닉네임)<input value={name} onChange={(e) => setName(e.target.value)} placeholder="예: 김교사" autoFocus /></label>
        <label>학교 (선택)<input value={school} onChange={(e) => setSchool(e.target.value)} placeholder="예: 중앙중학교" /></label>
        {tab === 'admin' && <label>관리자 비밀번호<input type="password" value={pw} onChange={(e) => setPw(e.target.value)} /></label>}
        {err && <div className="error">{err}</div>}
        <button className="primary big" type="submit">시작하기</button>
        <p className="muted small">저장한 지도안은 이 컴퓨터의 브라우저에 보관됩니다.</p>
      </form>
    </div>
  )
}
