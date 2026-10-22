// 마크다운 변환(표·제목·목록·굵게) 및 내보내기(복사, .md, .doc, 인쇄)
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')

export function mdToHtml(md = '') {
  const lines = md.split('\n')
  const out = []
  let i = 0
  while (i < lines.length) {
    const l = lines[i]
    if (/^\|.*\|\s*$/.test(l) && /^\|[\s:|-]+\|\s*$/.test(lines[i + 1] || '')) {
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => inline(c.trim()))
      const head = cells(l)
      i += 2
      const rows = []
      while (i < lines.length && /^\|.*\|\s*$/.test(lines[i])) rows.push(cells(lines[i++]))
      out.push(`<table><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`)
      continue
    }
    if (/^#{1,3}\s/.test(l)) {
      const n = l.match(/^#+/)[0].length + 1
      out.push(`<h${n}>${inline(l.replace(/^#+\s*/, ''))}</h${n}>`)
    } else if (/^>\s?/.test(l)) out.push(`<blockquote>${inline(l.replace(/^>\s?/, ''))}</blockquote>`)
    else if (/^[-*]\s/.test(l)) out.push(`<li>${inline(l.replace(/^[-*]\s/, ''))}</li>`)
    else if (l.trim()) out.push(`<p>${inline(l)}</p>`)
    i++
  }
  return out.join('\n')
}

export function planToMarkdown(p) {
  const cell = (s) => (s || '').replace(/\|/g, '/').replace(/\n/g, ' ')
  let md = `# ${p.title}\n\n`
  md += `- 교과: ${p.meta.subject} / ${p.meta.area} / ${p.meta.element}\n`
  md += `- 과정·기능: ${p.meta.skill || '-'}\n`
  md += `- 텍스트 유형: ${p.meta.format} · ${p.meta.contentType}\n`
  md += `- 독서전략: ${p.meta.strategy}\n`
  if (p.meta.instruction) md += `- 정보활용 수업전략: ${p.meta.instruction}\n`
  md += `- 학년/시간: ${p.meta.grade} / ${p.meta.minutes}분\n\n`
  md += `## 1. 읽기자료\n\n${p.result.passage}\n\n`
  if (p.result.vocabulary?.length) md += `### 핵심 어휘\n\n${p.result.vocabulary.map((v) => `- **${v.word}**: ${v.meaning}`).join('\n')}\n\n`
  md += `## 2. 독서 활동지\n\n${p.result.questions.map((q, i) => `${i + 1}. ${q}`).join('\n')}\n\n`
  md += `## 3. 가네 9사태 수업지도안\n\n| 단계 | 수업사태 | 교사 활동 | 학생 활동 | 시간 | 독서전략 연계 |\n|---|---|---|---|---|---|\n`
  md += p.result.plan.map((r) => `| ${r.step} | ${cell(r.eventName)} | ${cell(r.teacherActivity)} | ${cell(r.studentActivity)} | ${cell(r.time)} | ${cell(r.strategyLink)} |`).join('\n')
  return md + '\n'
}

const STYLE = `body{font-family:'Malgun Gothic',sans-serif;line-height:1.6;max-width:900px;margin:20px auto;padding:0 16px}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #444;padding:6px 8px;vertical-align:top;font-size:13px}th{background:#eef}blockquote{background:#fff7e0;margin:8px 0;padding:6px 10px}`
const wrapHtml = (title, md) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${esc(title)}</title><style>${STYLE}</style></head><body>${mdToHtml(md)}</body></html>`

function download(filename, content, type) {
  const url = URL.createObjectURL(new Blob(['\ufeff' + content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const copyMarkdown = (p) => navigator.clipboard.writeText(planToMarkdown(p))
export const downloadMarkdown = (p) => download(`${p.title}.md`, planToMarkdown(p), 'text/markdown;charset=utf-8')
// 한글·워드에서 바로 열리는 .doc (HTML 기반)
export const downloadDoc = (p) => download(`${p.title}.doc`, wrapHtml(p.title, planToMarkdown(p)), 'application/msword')
export function printPlan(p) {
  const w = window.open('', '_blank')
  if (!w) return alert('팝업 차단을 해제해 주세요.')
  w.document.write(wrapHtml(p.title, planToMarkdown(p)))
  w.document.close()
  w.focus()
  setTimeout(() => w.print(), 300)
}
