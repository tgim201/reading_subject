// 브라우저 저장소(localStorage) 래퍼. 서버 없이도(GitHub Pages) 동작합니다.
const get = (key, fallback) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}
const set = (key, value) => localStorage.setItem(key, JSON.stringify(value))

export const loadUser = () => get('rlp_user', null)
export const saveUser = (u) => set('rlp_user', u)
export const clearUser = () => localStorage.removeItem('rlp_user')

export const loadSettings = () => get('rlp_settings', { apiKey: '', model: 'gemini-2.5-flash' })
export const saveSettings = (s) => set('rlp_settings', s)

export const loadPlans = () => get('rlp_plans', [])
export function savePlan(plan) {
  const all = loadPlans()
  const i = all.findIndex((p) => p.id === plan.id)
  if (i >= 0) all[i] = plan
  else all.unshift(plan)
  set('rlp_plans', all)
}
export const deletePlan = (id) => set('rlp_plans', loadPlans().filter((p) => p.id !== id))

export const loadCustomOntologies = () => get('rlp_custom_ttl', [])
export function saveCustomOntology(name, text) {
  const all = loadCustomOntologies().filter((o) => o.name !== name)
  all.push({ name, text })
  set('rlp_custom_ttl', all)
}
export const deleteCustomOntology = (name) =>
  set('rlp_custom_ttl', loadCustomOntologies().filter((o) => o.name !== name))
