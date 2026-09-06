import { useMemo, useState } from 'react'
import { useApp } from '../context/AppContext'
import { COURSES } from '../data/courses'
import { LANGUAGES } from '../data/languages'
import VocabModule from '../components/modules/VocabModule'
import GrammarModule from '../components/modules/GrammarModule'
import SpeakingModule from '../components/modules/SpeakingModule'
import ListeningModule from '../components/modules/ListeningModule'

const TABS = [
  { key: 'vocab', label: '单词记忆', icon: '📇', desc: '闪卡方式记忆单词' },
  { key: 'grammar', label: '语法练习', icon: '✏️', desc: '填空与选择题' },
  { key: 'speaking', label: '口语跟读', icon: '🎙️', desc: 'AI 语音评分' },
  { key: 'listening', label: '听力训练', icon: '🎧', desc: '听音答题' },
] as const

type TabKey = typeof TABS[number]['key']

export default function PracticePage() {
  const { currentUser } = useApp()
  const [tab, setTab] = useState<TabKey>('vocab')

  const pool = useMemo(() => {
    if (!currentUser) return { vocab: [], grammar: [], speaking: [], listening: [] }
    const courses = COURSES.filter((c) => c.language === currentUser.currentLanguage)
    return {
      vocab: courses.flatMap((c) => c.lessons.flatMap((l) => l.vocab)),
      grammar: courses.flatMap((c) => c.lessons.flatMap((l) => l.grammar)),
      speaking: courses.flatMap((c) => c.lessons.flatMap((l) => l.speaking)),
      listening: courses.flatMap((c) => c.lessons.flatMap((l) => l.listening)),
    }
  }, [currentUser])

  if (!currentUser) return null
  const lang = LANGUAGES.find((l) => l.code === currentUser.currentLanguage)!

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🎯 互动练习</h1>
        <p className="mt-1 text-slate-500">针对 {lang.flag} {lang.name} 的专项训练，强化听说读写</p>
      </div>

      {/* Module picker */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-2xl p-5 text-left transition ${
              tab === t.key
                ? 'bg-brand-600 text-white shadow-lg shadow-brand-500/30'
                : 'bg-white text-slate-700 shadow-sm hover:shadow-md'
            }`}
          >
            <span className="text-3xl">{t.icon}</span>
            <p className="mt-2 font-bold">{t.label}</p>
            <p className={`mt-1 text-xs ${tab === t.key ? 'text-brand-100' : 'text-slate-400'}`}>{t.desc}</p>
          </button>
        ))}
      </div>

      <div className="animate-fade-in">
        {tab === 'vocab' && <VocabModule items={pool.vocab} langCode={currentUser.currentLanguage} />}
        {tab === 'grammar' && <GrammarModule items={pool.grammar} />}
        {tab === 'speaking' && <SpeakingModule items={pool.speaking} langCode={currentUser.currentLanguage} />}
        {tab === 'listening' && <ListeningModule items={pool.listening} langCode={currentUser.currentLanguage} />}
      </div>
    </div>
  )
}
