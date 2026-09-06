import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { COURSES } from '../data/courses'
import { LANGUAGES } from '../data/languages'

export default function CoursesPage() {
  const { currentUser } = useApp()
  const [filter, setFilter] = useState<string>('all')
  if (!currentUser) return null

  const langs = LANGUAGES
  const filtered =
    filter === 'all' ? COURSES : COURSES.filter((c) => c.language === filter)

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📖 分级课程</h1>
        <p className="mt-1 text-slate-500">按语言与级别系统学习，循序渐进提升语言能力</p>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
          }`}
        >
          全部
        </button>
        {langs.map((l) => (
          <button
            key={l.code}
            onClick={() => setFilter(l.code)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === l.code ? 'bg-brand-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'
            }`}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Course grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {filtered.map((c) => {
          const done = c.lessons.filter((l) => currentUser.completedLessons.includes(l.id)).length
          const pct = Math.round((done / c.lessons.length) * 100)
          const lang = langs.find((l) => l.code === c.language)!
          return (
            <div key={c.id} className="overflow-hidden rounded-2xl bg-white shadow-sm">
              <div className={`bg-gradient-to-br ${c.color} p-6 text-white`}>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-white/25 px-3 py-1 text-xs font-semibold">
                    {lang.flag} {c.level}
                  </span>
                  <span className="text-xs opacity-80">{c.lessons.length} 课时</span>
                </div>
                <h2 className="mt-3 text-xl font-bold">{c.title}</h2>
                <p className="mt-1 text-sm text-white/80">{c.description}</p>
              </div>
              <div className="p-5">
                <div className="mb-4">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>学习进度</span>
                    <span>{done}/{c.lessons.length} · {pct}%</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className={`h-full bg-gradient-to-r ${c.color}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="space-y-2">
                  {c.lessons.map((l) => {
                    const completed = currentUser.completedLessons.includes(l.id)
                    return (
                      <Link
                        key={l.id}
                        to={`/courses/${c.id}/${l.id}`}
                        className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 transition hover:border-brand-300 hover:bg-brand-50"
                      >
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm ${
                            completed ? 'bg-green-100 text-green-600' : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {completed ? '✓' : '▶'}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-slate-800">{l.title}</p>
                          <p className="truncate text-xs text-slate-400">{l.description}</p>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-amber-500">+{l.xp} XP</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
