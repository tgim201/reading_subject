// 읽기자료 · 활동지 · 가네 9사태 지도안 생성기
// 1) Gemini API 키가 있으면 AI가 생성하고, 2) 없거나 실패하면 온톨로지 기반 초안을 생성합니다.
import { guideFor } from './strategyGuides.js'

const DEFAULT_EVENTS = ['주의집중', '학습목표 제시', '선수학습 능력 재생', '학습자료 제시', '학습 지침 제공', '학생 수행 요구', '피드백 제공', '성취 행동 평가', '파지와 전이']
const TIME_RATIO = [3, 2, 3, 8, 5, 12, 4, 5, 3] // 합계 45분 기준

function timeSlots(total) {
  const sum = TIME_RATIO.reduce((a, b) => a + b, 0)
  return TIME_RATIO.map((r) => `${Math.max(1, Math.round((r * total) / sum))}분`)
}
const eventNames = (ctx) => DEFAULT_EVENTS.map((d, i) => ctx.events?.[i]?.label || d)

// ───────── 오프라인(온톨로지 기반) 초안 ─────────
export function generateOffline(ctx) {
  const topic = ctx.element.label
  const s = ctx.strategy.label
  const g = guideFor(s)
  const ideas = ctx.coreIdeas.length ? ctx.coreIdeas : [`${topic}은(는) ${ctx.subject.label}과의 중요한 학습 내용이다.`]
  const cont = ctx.formatLabel !== '비연속적'
  const nonCont = ctx.formatLabel !== '연속적'

  let passage = `## ${topic}\n\n`
  if (cont) {
    passage += ideas.map((d) => d).join(' ') + '\n\n'
    passage += `${topic}에 대해 알아볼 때에는 먼저 무엇을 뜻하는지, 어떤 특징이 있는지, 우리 생활과 어떻게 관련되는지를 차례로 살펴보는 것이 좋다. ` +
      `이러한 내용은 ${ctx.area.label} 영역의 다른 개념과도 이어지므로, 글을 읽으면서 중요한 낱말과 근거를 표시하며 읽어야 한다.\n\n`
  }
  if (nonCont) {
    const rows = ctx.area.elements.slice(0, 5)
    passage += `[표] ${ctx.area.label} 영역의 주요 내용\n\n| 내용 요소 | 알아볼 점 |\n|---|---|\n`
    passage += rows.map((e) => `| ${e.label}${e.id === ctx.element.id ? ' (오늘의 주제)' : ''} | 뜻, 특징, 생활 속 사례 |`).join('\n') + '\n\n'
  }
  passage += `> ⚠ 이 글은 온톨로지의 핵심 아이디어로 만든 **초안**입니다. 설정에서 Gemini API 키를 입력하면 학습자 눈높이에 맞는 800~1,200자 읽기자료가 생성됩니다. 필요하면 아래 글을 직접 고쳐 쓰세요.`

  const vocabulary = [{ word: topic, meaning: '(교사가 학습자 수준에 맞게 뜻을 입력하세요)' }]
  const questions = g.questions(topic)
  const names = eventNames(ctx)
  const t = timeSlots(ctx.minutes)
  const link = `‘${s}’ (${ctx.strategy.fn || '독서'} 기능)`
  const plan = [
    ['‘' + topic + '’과(와) 관련된 사진·영상·질문을 제시하여 호기심을 유발한다.', '질문에 자유롭게 답하며 수업 주제에 관심을 가진다.', ''],
    [`학습목표를 제시한다: “${s} 전략을 사용하여 ‘${topic}’ 글을 읽고 핵심 내용을 설명할 수 있다.”`, '학습목표를 소리 내어 읽고 오늘 할 활동을 확인한다.', ''],
    [`이전 시간에 배운 관련 개념을 짧은 질문으로 확인하고, ‘${s}’ 또는 비슷한 전략을 써 본 경험을 묻는다.`, '이미 알고 있는 내용과 읽기 경험을 발표한다.', ''],
    [`${ctx.formatLabel} ${ctx.contentLabel}글 읽기자료를 배부하고, 제목·소제목·시각자료를 훑어보게 한다. 핵심 용어를 안내한다.`, '읽기자료를 훑어 읽으며 모르는 낱말에 표시한다.', `읽기자료(${ctx.formatLabel}·${ctx.contentLabel}) 제시`],
    [`${link} 전략의 방법을 시범 보인다. ${g.summary}. 단계: ${g.steps.map((x, i) => `(${i + 1}) ${x}`).join(' ')}`, '교사의 시범을 보며 전략의 단계를 이해하고 활동지를 확인한다.', `${s} 방법 안내`],
    [`활동지를 배부하고 모둠을 순회하며 질문과 힌트를 제공한다. 활동지 질문: ${questions.map((q, i) => `${i + 1}) ${q}`).join(' ')}`, `전략 단계에 따라 읽기자료를 읽고 활동지를 작성한다.`, `${s} 활동지 수행`],
    ['활동지를 확인하며 잘한 점을 칭찬하고, 잘못 이해한 부분은 근거 문장을 보도록 안내한다.', '친구와 활동지를 바꾸어 보고 의견을 나누며 수정한다.', ''],
    [`새로운 짧은 글이나 형성평가 문항(핵심 개념 설명, 전략 적용)을 제시하고 체크리스트로 평가한다.`, `스스로 ‘${s}’ 전략을 적용하여 문제를 해결한다.`, `${s} 수행 결과 평가`],
    [`오늘 배운 ‘${topic}’과(와) 전략을 다른 단원·교과 글에 적용할 방법을 묻고, 과제를 안내한다.`, `배운 점과 전략 사용 소감을 정리하고 다른 상황에 적용할 계획을 말한다.`, `${s} 전이`],
  ].map((r, i) => ({
    step: i + 1,
    eventName: names[i],
    teacherActivity: r[0],
    studentActivity: r[1],
    time: t[i],
    strategyLink: r[2],
  }))
  // 정보활용 수업전략(instruction_strategy.ttl)을 해당 수업사태에 결합
  const ins = ctx.instruction
  if (ins) {
    const r = plan[ins.eventIdx]
    r.teacherActivity += ` [정보활용 수업전략: ${ins.label}] ${ins.description}. 방법을 시범 보이고 활동을 안내한다.`
    r.studentActivity += ` ‘${ins.label}’ 방식으로 활동에 참여한다.`
    r.strategyLink = `${r.strategyLink ? r.strategyLink + ' + ' : ''}${ins.label}`.trim()
  }
  return { passage, vocabulary, questions, plan, source: 'offline' }
}

// ───────── Gemini ─────────
export function buildPrompt(ctx) {
  const g = guideFor(ctx.strategy.label)
  return `당신은 중학교 교과 독서 교육 전문가이자 수업설계 전문가입니다.
제공된 교육과정 온톨로지 정보와 독서전략, 가네의 수업사태를 바탕으로 최적의 수업자료와 지도안을 작성하십시오.

[입력 정보]
1. 교과목: ${ctx.subject.label}
2. 교육과정 영역 및 내용요소: ${ctx.area.label} / ${ctx.element.label}
   - 영역 핵심 아이디어: ${ctx.coreIdeas.join(' ')}
3. 관련 과정·기능: ${ctx.skill?.label || '(선택 안 함)'}
4. 텍스트 속성: 체재 ${ctx.formatLabel}, 내용 유형 ${ctx.contentLabel}
5. 적용 독서전략: ${ctx.strategy.label} (핵심기능: ${ctx.strategy.fn || ''}) - ${g.summary}
6. 학습자: ${ctx.grade}, 수업 시간: ${ctx.minutes}분
${ctx.instruction ? `7. 정보활용 수업전략(instruction_strategy.ttl): ${ctx.instruction.label} - ${ctx.instruction.description} (연결 기능어: ${ctx.instruction.verbs.join(', ')}). 수업사태 ${ctx.instruction.eventIdx + 1}단계(${DEFAULT_EVENTS[ctx.instruction.eventIdx]})의 활동에 반드시 반영하고 독서전략 연계 칸에 함께 표기할 것.\n8.` : '7.'} 수업설계 프레임워크: 가네(Gagné)의 9가지 수업사태

[출력 요구조건]
1. 학습자 눈높이에 맞는 교과 읽기 자료 (약 800~1,200자). 체재가 비연속적/혼합이면 마크다운 표를 포함할 것. 제목은 "## "로 시작.
2. 선택한 독서전략을 적용하는 독서 활동지 질문 3문항.
3. 핵심 어휘 3~5개와 뜻.
4. 가네의 9가지 수업사태(${DEFAULT_EVENTS.map((d, i) => `${i + 1}.${d}`).join(' ')}) 순서의 수업지도안. 각 단계에 교사 활동, 학생 활동, 소요 시간(총 ${ctx.minutes}분), 독서전략 연계 포인트를 구체적으로 쓸 것.

반드시 아래 JSON 형식으로만 답하십시오(설명·코드블록 없이).
{"passage":"마크다운 문자열","vocabulary":[{"word":"","meaning":""}],"questions":["","",""],"plan":[{"step":1,"eventName":"","teacherActivity":"","studentActivity":"","time":"3분","strategyLink":""}]}`
}

function extractJson(text) {
  const clean = text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const a = clean.indexOf('{')
  const b = clean.lastIndexOf('}')
  return JSON.parse(clean.slice(a, b + 1))
}

export async function generateWithGemini(ctx, settings) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(settings.model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(ctx) }] }],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' },
    }),
  })
  if (!res.ok) throw new Error(`Gemini 응답 오류 (${res.status})`)
  const data = await res.json()
  const raw = data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || ''
  const j = extractJson(raw)
  if (!j.passage || !Array.isArray(j.plan) || j.plan.length < 9) throw new Error('AI 응답 형식이 올바르지 않습니다.')
  const names = eventNames(ctx)
  return {
    passage: j.passage,
    vocabulary: j.vocabulary || [],
    questions: j.questions || [],
    plan: j.plan.slice(0, 9).map((r, i) => ({
      step: i + 1,
      eventName: r.eventName || names[i],
      teacherActivity: r.teacherActivity || '',
      studentActivity: r.studentActivity || '',
      time: r.time || '',
      strategyLink: r.strategyLink || '',
    })),
    source: 'gemini',
  }
}

/** 키가 있으면 AI, 실패하면 오프라인 초안으로 자동 대체 */
export async function generateAll(ctx, settings) {
  if (settings.apiKey) {
    try {
      return { ...(await generateWithGemini(ctx, settings)), notice: '' }
    } catch (e) {
      return { ...generateOffline(ctx), notice: `AI 생성에 실패하여 기본 초안을 만들었습니다. (${e.message})` }
    }
  }
  return { ...generateOffline(ctx), notice: '' }
}
