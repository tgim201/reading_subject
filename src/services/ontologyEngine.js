// 온톨로지(TTL) 로더 / 파서
// - src/ontologies/*.ttl 은 빌드 시 자동 포함됩니다. (새 교과 = 새 .ttl 파일 추가)
// - 관리자 화면에서 업로드한 .ttl 은 브라우저(localStorage)에 저장되어 함께 로드됩니다.
// - 파일 종류는 파일 이름이 아니라 "안에 들어있는 클래스"로 자동 판별합니다.
//     ex:Subject 인스턴스       -> 교과 교육과정
//     ex:ReadingFunction        -> 독서전략
//     ex:TextTypeAttribute      -> 텍스트 유형
//     ex:InstructionalEvent     -> 가네 9가지 수업사태
import { Parser } from 'n3'
import { loadCustomOntologies } from './storage.js'

const builtin = import.meta.glob('../ontologies/*.ttl', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const RDF_TYPE = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#type'
export const local = (iri) => iri.split(/[#/]/).pop()

function parseFile(name, text) {
  const quads = new Parser().parse(text)
  const nodes = new Map()
  for (const q of quads) {
    if (q.subject.termType !== 'NamedNode') continue
    let n = nodes.get(q.subject.value)
    if (!n) {
      n = { id: q.subject.value, types: new Set(), props: {} }
      nodes.set(n.id, n)
    }
    if (q.predicate.value === RDF_TYPE) {
      if (q.object.termType === 'NamedNode') n.types.add(local(q.object.value))
    } else {
      const k = local(q.predicate.value)
      ;(n.props[k] ||= []).push({ v: q.object.value, t: q.object.termType })
    }
  }
  return { name, triples: quads.length, nodes }
}

const first = (n, k) => n?.props?.[k]?.[0]?.v
const labelOf = (f, iri) => first(f.nodes.get(iri), 'label') ?? local(iri)
const ofType = (f, t) => [...f.nodes.values()].filter((n) => n.types.has(t))

function detectKinds(f) {
  const kinds = []
  if (ofType(f, 'Subject').length) kinds.push('curriculum')
  if (ofType(f, 'ReadingFunction').length) kinds.push('strategy')
  if (ofType(f, 'TextTypeAttribute').length) kinds.push('text')
  if (ofType(f, 'InstructionalEvent').length) kinds.push('lesson')
  if (ofType(f, 'InstructionalStrategy').length) kinds.push('instruction')
  return kinds
}

function buildSubject(f) {
  const s = ofType(f, 'Subject')[0]
  const areas = (s.props.hasArea || []).map((a) => {
    const an = f.nodes.get(a.v)
    return {
      id: a.v,
      label: labelOf(f, a.v),
      coreIdeas: (an?.props.hasCoreIdea || [])
        .map((c) => first(f.nodes.get(c.v), 'description'))
        .filter(Boolean),
      elements: (an?.props.hasContentElement || [])
        .filter((e) => f.nodes.get(e.v)?.types.has('KnowledgeUnderstanding'))
        .map((e) => ({ id: e.v, label: labelOf(f, e.v) })),
    }
  })
  const list = (t) => ofType(f, t).map((n) => ({ id: n.id, label: labelOf(f, n.id) }))
  return {
    id: s.id,
    file: f.name,
    label: labelOf(f, s.id),
    description: first(s, 'description') || '',
    areas,
    skills: list('ProcessSkill'),
    competencies: list('Competency'),
    values: list('ValueAttitude'),
  }
}

function buildFunctions(f) {
  return ofType(f, 'ReadingFunction').map((n) => ({
    id: n.id,
    label: labelOf(f, n.id),
    verbs: (n.props.hasVerb || []).map((v) => labelOf(f, v.v)),
    strategies: (n.props.hasStrategy || []).map((s) => ({ id: s.v, label: labelOf(f, s.v) })),
  }))
}

function buildText(f) {
  const groups = {}
  for (const n of ofType(f, 'TextTypeAttribute')) {
    const cat = local(first(n, 'hasCategory') || 'etc')
    ;(groups[cat] ||= []).push({
      id: n.id,
      label: labelOf(f, n.id),
      description: first(n, 'contentDescription') || '',
    })
  }
  return groups
}

// 교과 기능어(과정·기능 수행동사) 기반 정보활용 수업전략 (instruction_strategy.ttl)
function buildInstructions(f) {
  return ofType(f, 'InstructionalStrategy').map((n) => ({
    id: n.id,
    label: labelOf(f, n.id),
    description: first(n, 'strategyDescription') || '',
    level: first(n, 'targetSchoolLevel') || '',
    stage: first(n, 'infoLiteracyStage') || '',
    verbs: (n.props.hasSkillVerb || []).map((v) => labelOf(f, v.v)),
    genres: (n.props.hasGenre || []).map((g) => labelOf(f, g.v)),
  }))
}

function buildEvents(f) {
  return ofType(f, 'InstructionalEvent')
    .map((n) => {
      const names = (k) => (n.props[k] || []).map((x) => labelOf(f, x.v))
      return {
        seq: Number(first(n, 'sequenceNumber')) || 0,
        label: labelOf(f, n.id),
        strategies: names('hasStrategy'),
        resources: names('usesResource'),
        activities: names('hasActivity'),
        assessments: names('hasAssessment'),
        example: first(n, 'exampleDescription') || '',
      }
    })
    .sort((a, b) => a.seq - b.seq)
}

/** TTL 문법 검사 (관리자 화면에서도 사용) */
export function validateTTL(text) {
  try {
    const f = parseFile('검사', text)
    const kinds = detectKinds(f)
    const subj = kinds.includes('curriculum') ? buildSubject(f) : null
    return { ok: true, triples: f.triples, kinds, subjectLabel: subj?.label }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  }
}

export const KIND_LABEL = {
  curriculum: '교과 교육과정',
  strategy: '독서전략',
  text: '텍스트 유형',
  lesson: '수업사태(가네)',
  instruction: '정보활용 수업전략',
}

/** 전체 지식 그래프를 (재)구성한다. 관리자 화면에서 파일을 바꾼 뒤에도 다시 호출한다. */
export function loadKnowledge() {
  const sources = [
    ...Object.entries(builtin).map(([p, text]) => ({ name: p.split('/').pop(), text, custom: false })),
    ...loadCustomOntologies().map((c) => ({ name: c.name, text: c.text, custom: true })),
  ]
  const k = { subjects: [], functions: [], text: {}, events: [], instructions: [], files: [] }
  for (const src of sources) {
    try {
      const f = parseFile(src.name, src.text)
      const kinds = detectKinds(f)
      k.files.push({ name: src.name, custom: src.custom, triples: f.triples, kinds, text: src.text })
      if (kinds.includes('curriculum')) k.subjects.push(buildSubject(f))
      if (kinds.includes('strategy')) k.functions.push(...buildFunctions(f))
      if (kinds.includes('text')) {
        const g = buildText(f)
        for (const key of Object.keys(g)) k.text[key] = [...(k.text[key] || []), ...g[key]]
      }
      if (kinds.includes('lesson') && !k.events.length) k.events = buildEvents(f)
      if (kinds.includes('instruction')) k.instructions.push(...buildInstructions(f))
    } catch (e) {
      k.files.push({ name: src.name, custom: src.custom, triples: 0, kinds: [], error: String(e.message || e), text: src.text })
    }
  }
  return k
}

// ───────── 추천 로직: 교과 과정·기능 → 독서기능 → 독서전략 ─────────
// 과정·기능 문구에 들어있는 낱말 → 독서 핵심기능(readstrategy.ttl 의 라벨)
const SKILL_KEYWORDS = {
  분석: '분석', 수집: '탐색', 인식: '탐색', 탐색: '탐색', 탐구: '탐색', 조사: '탐색', 설계: '조절(메타인지)',
  결론: '종합', 종합: '종합', 요약: '종합', 정리: '종합', 비교: '비교', 대조: '대조', 분류: '분류',
  추론: '추론', 추리: '추론', 증명: '추론', 근거: '추론', 증거: '추론', 예측: '예측', 예상: '예측',
  평가: '평가', 비판: '평가', 검토: '평가', 판단: '평가', 의사결정: '평가', 적용: '적용', 활용: '적용',
  해결: '적용', 창의: '창안', 창안: '창안', 표현: '표현', 소통: '표현', 발표: '표현', 주장: '표현',
  성찰: '조절(메타인지)', 반성: '조절(메타인지)', 점검: '조절(메타인지)', 관계: '관계화', 연결: '관계화',
  이해: '이해', 해석: '이해', 설명: '이해',
}
const NONCONT_STRATEGIES = ['대조표', '벤다이어그램', '피라미드 다이어그램', '의미자질 분석하기', '대립 척도표', '닿소리표 그리기', '플롯 조직표', '글 구조 전략']
const ARGUE_STRATEGIES = ['오류 찾기', '참/거짓 가리기', '대립 척도표', '정교한 질문', '상호텍스트 전략']
const SUBJECT_HINT = [
  ['과학', '과학책 훑어보기'], ['수학', '수학책을 읽는 열쇠'], ['사회', '역사의 흐름 파악하기'],
  ['국어', '문학지도'], ['국어', '글 구조 전략'],
]

export function recommend(k, { subject, skill, element, formatLabel, contentLabel }) {
  const text = `${skill?.label || ''} ${element?.label || ''}`
  const fscore = new Map()
  const add = (fl, w) => fscore.set(fl, (fscore.get(fl) || 0) + w)
  for (const [kw, fl] of Object.entries(SKILL_KEYWORDS)) if (text.includes(kw)) add(fl, 2)
  for (const fn of k.functions) {
    for (const v of fn.verbs) {
      const stem = v.replace(/하다$|다$/, '').split(' ').pop()
      if (stem.length >= 2 && text.includes(stem)) add(fn.label, 3)
    }
  }
  const defaults = ['이해', '탐색', '종합']
  let ranked = [...fscore.entries()].sort((a, b) => b[1] - a[1]).map(([l]) => l)
  for (const d of defaults) if (ranked.length < 3 && !ranked.includes(d)) ranked.push(d)
  ranked = ranked.slice(0, 3)

  const sc = new Map()
  ranked.forEach((fl, i) => {
    const fn = k.functions.find((x) => x.label === fl)
    if (!fn) return
    fn.strategies.forEach((s) => {
      const cur = sc.get(s.id) || { id: s.id, label: s.label, score: 0, reasons: new Set(), fn: fl }
      cur.score += 5 - i
      cur.reasons.add(`‘${fl}’ 기능과 연결`)
      sc.set(s.id, cur)
    })
  })
  for (const cur of sc.values()) {
    if (formatLabel && formatLabel !== '연속적' && NONCONT_STRATEGIES.includes(cur.label)) {
      cur.score += 2; cur.reasons.add('표·도표가 있는 글에 적합')
    }
    if (contentLabel === '논증' && ARGUE_STRATEGIES.includes(cur.label)) {
      cur.score += 2; cur.reasons.add('논증하는 글에 적합')
    }
    for (const [sub, strat] of SUBJECT_HINT) {
      if (subject?.label?.includes(sub) && cur.label === strat) {
        cur.score += 3; cur.reasons.add(`${subject.label}과 읽기에 특화`)
      }
    }
  }
  return [...sc.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((c) => ({ id: c.id, label: c.label, fn: c.fn, reason: [...c.reasons].join(' · ') }))
}

// ───────── 추천 로직: 과정·기능 수행동사 → 정보활용 수업전략 (instruction_strategy.ttl) ─────────
// 교과 과정·기능 문구의 낱말 → 수업전략 기능어(…하기)의 어간
const VERB_ALIAS = {
  인식: ['식별', '파악'], 도출: ['추론', '정리'], 결론: ['요약', '정리'], 설계: ['계획', '구성'],
  의사결정: ['평가', '고려'], 탐구: ['탐색', '조사'], 증거: ['추론', '분석'], 활용: ['제작', '구성'],
  검토: ['평가', '분석'], 비판: ['평가', '분석'], 창의: ['생성', '생각'], 협력: ['공유', '소통'],
}
// 글 유형(내용) → 선호 정보 장르 키워드
const GENRE_BY_CONTENT = {
  설명: ['설명문', '원인', '비교'], 논증: ['주장'], 서사: ['픽션', '단편'], 기술: ['설명문'],
  지시: ['설명문'], 교섭: ['주장'],
}
// 기능어에 따라 수업의 어느 단계(가네 사태)에 넣을지 결정
const COLLAB = ['공유', '소통', '교환', '토론', '말하기', '참여', '조정', '주장']
const PRODUCE = ['제작', '제시', '전달', '구성', '생성', '표현']
export function instructionEventIndex(ins) {
  const stems = ins.verbs.map((v) => v.replace(/하기$/, ''))
  if (stems.some((s) => COLLAB.includes(s))) return 6 // 7. 피드백 제공(동료와 공유)
  if (stems.some((s) => PRODUCE.includes(s))) return 8 // 9. 파지와 전이(산출·발표)
  return 5 // 6. 학생 수행 요구
}

export function recommendInstruction(k, { skill, contentLabel, grade, excludeLabels = [] }) {
  const sk = skill?.label || ''
  const level = (grade || '').includes('고') ? '고' : '중'
  const genreKeys = GENRE_BY_CONTENT[contentLabel] || []
  const aliasStems = Object.entries(VERB_ALIAS).filter(([w]) => sk.includes(w)).flatMap(([, v]) => v)
  const out = []
  for (const s of k.instructions) {
    if (excludeLabels.includes(s.label)) continue
    // 학년군이 맞지 않으면 제외 ('전학년', '중·고', '저·중' 은 중학교 가능)
    if (s.level && s.level !== '전학년' && !s.level.includes(level)) continue
    let score = 0
    const hit = []
    for (const v of s.verbs) {
      const stem = v.replace(/하기$/, '')
      if (stem.length >= 2 && sk.includes(stem)) { score += 3; hit.push(v) }
      else if (aliasStems.includes(stem)) { score += 2; hit.push(v) }
    }
    const reasons = []
    if (hit.length) reasons.push(`과정·기능과 연결된 기능어: ${hit.join(', ')}`)
    const gHit = s.genres.some((g) => genreKeys.some((gk) => g.includes(gk)))
    if (gHit) { score += 2; reasons.push(`${contentLabel} 글에 적합한 장르`) }
    else if (s.genres.some((g) => g === '논픽션') && ['설명', '논증', '기술', '지시'].includes(contentLabel)) score += 1
    if (!reasons.length) reasons.push('수업 활동 확장에 활용')
    out.push({ ...s, score, hit, reason: reasons.join(' · ') })
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4)
}
