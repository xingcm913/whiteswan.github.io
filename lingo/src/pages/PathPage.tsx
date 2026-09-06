import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { COURSES } from '../data/courses'
import { LANGUAGES } from '../data/languages'

export default function PathPage() {
  const { currentUser } = useApp()
  if (!currentUser) return null

  const lang = LANGUAGES.find((l) => l.code === currentUser.currentLanguage)!
  const courses = COURSES.filter((c) => c.language === currentUser.currentLanguage)

  const recommendations = useMemo(() => {
    // Build a learning path: uncompleted lessons sorted by course order
    const path: {
      courseId: string
      courseTitle: string
      color: string
      lessonId: string
      lessonTitle: string
      xp: number
      reason: string
      priority: 'high' | 'medium' | 'low'
    }[] = []

    courses.forEach((c) => {
      c.lessons.forEach((l) => {
        const done = currentUser.completedLessons.includes(l.id)
        if (done) return
        // reason: first uncompleted in course => continue path
        const courseDoneCount = c.lessons.filter((x) =>
          currentUser.completedLessons.includes(x.id),
        ).length
        const isNextInCourse = courseDoneCount === c.lessons.indexOf(l)
        path.push({
          courseId: c.id,
          courseTitle: c.title,
          color: c.color,
          lessonId: l.id,
          lessonTitle: l.title,
          xp: l.xp,
          reason: isNextInCourse
            ? '继续上一节课的进度'
            : `拓展 ${c.level} 内容`,
          priority: isNextInCourse ? 'high' : courseDoneCount > 0 ? 'medium' : 'low',
        })
      })
    })

    return path.slice(0, 8)
  }, [courses, currentUser])

  // weak vocab: vocab from completed lessons not yet mastered
  const weakVocab = useMemo(() => {
    const list: { word: string; trans: string; course: string }[] = []
    courses.forEach((c) => {
      c.lessons.forEach((l) => {
        if (!currentUser.completedLessons.includes(l.id)) return
        l.vocab.forEach((v) => {
          if (!currentUser.vocabMastered.includes(v.id)) {
            list.push({ word: v.word, trans: v.translation, course: c.title })
          }
        })
      })
    })
    return list.slice(0, 8)
  }, [courses, currentUser])

  const priorityColor = {
    high: 'bg-red-50 text-red-600 ring-red-200',
    medium: 'bg-amber-50 text-amber-600 ring-amber-200',
    low: 'bg-slate-50 text-slate-500 ring-slate-200',
  }
  const priorityLabel = { high: '强烈推荐', medium: '推荐', low: '可选' }

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🧭 个性化学习路径</h1>
        <p className="mt-1 text-slate-500">基于你的学习进度与掌握情况，为你定制下一步</p>
      </div>

      {/* Profile summary */}
      <div className="rounded-2xl bg-gradient-to-r from-brand-500 to-indigo-600 p-6 text-white">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <p className="text-sm text-brand-100">当前学习</p>
            <p className="text-2xl font-bold">{lang.flag} {lang.name}</p>
          </div>
          <div>
            <p className="text-sm text-brand-100">已完成课时</p>
            <p className="text-2xl font-bold">{currentUser.completedLessons.length}</p>
          </div>
          <div>
            <p className="text-sm text-brand-100">已掌握单词</p>
            <p className="text-2xl font-bold">{currentUser.vocabMastered.length}</p>
          </div>
          <div>
            <p className="text-sm text-brand-100">兴趣方向</p>
            <p className="text-2xl font-bold">{currentUser.preferences.interests.join('、')}</p>
          </div>
        </div>
      </div>

      {/* Recommended path */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">🎯 推荐学习顺序</h2>
        {recommendations.length === 0 ? (
          <div className="py-10 text-center text-slate-500">
            🎉 恭喜！你已完成该语言的所有课时。可以切换其他语言继续学习。
          </div>
        ) : (
          <div className="relative space-y-3 pl-6">
            <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-slate-100" />
            {recommendations.map((r, i) => (
              <Link
                key={r.lessonId}
                to={`/courses/${r.courseId}/${r.lessonId}`}
                className="group relative block rounded-2xl border border-slate-100 p-4 transition hover:border-brand-300 hover:shadow-md"
              >
                <span className="absolute -left-[18px] top-5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-500 text-xs text-white ring-4 ring-white">
                  {i + 1}
                </span>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full bg-gradient-to-r ${r.color} px-2.5 py-0.5 text-xs font-semibold text-white`}>
                        {r.courseTitle}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${priorityColor[r.priority]}`}>
                        {priorityLabel[r.priority]}
                      </span>
                    </div>
                    <p className="mt-2 font-semibold text-slate-800 group-hover:text-brand-700">{r.lessonTitle}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{r.reason}</p>
                  </div>
                  <span className="shrink-0 text-sm font-bold text-amber-500">+{r.xp} XP</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Weak vocab review */}
      {weakVocab.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-bold text-slate-800">📌 需要复习的单词</h2>
          <p className="mb-3 text-sm text-slate-500">来自已学课程但尚未标记掌握的单词</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {weakVocab.map((v, i) => (
              <div key={i} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-2.5">
                <div>
                  <span className="font-semibold text-slate-800">{v.word}</span>
                  <span className="ml-2 text-sm text-slate-500">{v.trans}</span>
                </div>
                <Link to="/practice" className="text-xs text-brand-600 hover:underline">去练习 →</Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
