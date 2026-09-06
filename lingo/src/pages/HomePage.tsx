import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { COURSES } from '../data/courses'
import { LANGUAGES } from '../data/languages'
import { ACHIEVEMENTS } from '../data/achievements'

export default function HomePage() {
  const { currentUser, checkAchievements, leaderboard } = useApp()

  useEffect(() => {
    if (currentUser) {
      const t = setTimeout(() => checkAchievements(), 300)
      return () => clearTimeout(t)
    }
  }, [currentUser, checkAchievements])

  if (!currentUser) return null

  const lang = LANGUAGES.find((l) => l.code === currentUser.currentLanguage)!
  const userCourses = COURSES.filter((c) => c.language === currentUser.currentLanguage)
  const completedCount = currentUser.completedLessons.length
  const totalLessons = userCourses.reduce((s, c) => s + c.lessons.length, 0)
  const unlockedAchievements = ACHIEVEMENTS.filter((a) =>
    currentUser.achievements.includes(a.id),
  )

  const cards = [
    { icon: '🔥', label: '连续学习', value: `${currentUser.streak} 天`, color: 'from-orange-400 to-red-500' },
    { icon: '⭐', label: '总经验', value: `${currentUser.xp} XP`, color: 'from-amber-400 to-yellow-500' },
    { icon: '📚', label: '完成课时', value: `${completedCount}/${totalLessons}`, color: 'from-sky-400 to-blue-500' },
    { icon: '🧠', label: '掌握单词', value: `${currentUser.vocabMastered.length}`, color: 'from-emerald-400 to-teal-500' },
  ]

  return (
    <div className="animate-fade-in space-y-8">
      {/* Greeting */}
      <div className="rounded-3xl bg-gradient-to-r from-brand-500 to-indigo-600 p-8 text-white">
        <p className="text-brand-100">你好，{currentUser.avatar}</p>
        <h1 className="mt-1 text-3xl font-bold">{currentUser.username}，继续加油！</h1>
        <p className="mt-2 text-brand-100">
          正在学习 <span className="font-semibold">{lang.flag} {lang.name}</span> · 等级 Lv.{currentUser.level}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/courses"
            className="rounded-xl bg-white px-5 py-2.5 font-semibold text-brand-700 shadow-md transition hover:scale-105"
          >
            📖 开始学习
          </Link>
          <Link
            to="/practice"
            className="rounded-xl bg-white/20 px-5 py-2.5 font-semibold text-white backdrop-blur transition hover:bg-white/30"
          >
            🎯 去练习
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl bg-white p-5 shadow-sm">
            <div className={`mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${c.color} text-xl`}>
              {c.icon}
            </div>
            <p className="text-2xl font-bold text-slate-800">{c.value}</p>
            <p className="text-sm text-slate-500">{c.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recommended courses */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">{lang.name} 推荐课程</h2>
            <Link to="/courses" className="text-sm font-medium text-brand-600 hover:underline">
              查看全部 →
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {userCourses.map((c) => {
              const done = c.lessons.filter((l) => currentUser.completedLessons.includes(l.id)).length
              const pct = Math.round((done / c.lessons.length) * 100)
              return (
                <Link
                  key={c.id}
                  to="/courses"
                  className="group rounded-2xl border border-slate-100 p-4 transition hover:border-brand-300 hover:shadow-md"
                >
                  <div className={`mb-3 h-20 rounded-xl bg-gradient-to-br ${c.color} p-3 text-white`}>
                    <p className="text-xs opacity-80">{c.level}</p>
                    <p className="mt-1 font-bold">{c.title}</p>
                  </div>
                  <p className="line-clamp-2 text-sm text-slate-500">{c.description}</p>
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>进度</span>
                      <span>{done}/{c.lessons.length}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div className={`h-full bg-gradient-to-r ${c.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Leaderboard */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-bold text-slate-800">🏆 排行榜</h2>
          <div className="space-y-2">
            {leaderboard.slice(0, 5).map((u, i) => (
              <div
                key={u.id}
                className={`flex items-center gap-3 rounded-xl p-2 ${
                  u.id === currentUser.id ? 'bg-brand-50 ring-1 ring-brand-200' : ''
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${
                    i === 0
                      ? 'bg-amber-100 text-amber-600'
                      : i === 1
                      ? 'bg-slate-200 text-slate-600'
                      : i === 2
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="text-xl">{u.avatar}</span>
                <span className="flex-1 truncate text-sm font-medium text-slate-700">{u.username}</span>
                <span className="text-xs font-semibold text-brand-600">{u.xp} XP</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Achievements preview */}
      {unlockedAchievements.length > 0 && (
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">🎖️ 已解锁成就</h2>
            <Link to="/achievements" className="text-sm font-medium text-brand-600 hover:underline">
              全部 →
            </Link>
          </div>
          <div className="flex flex-wrap gap-3">
            {unlockedAchievements.map((a) => (
              <div
                key={a.id}
                className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 ring-1 ring-amber-200"
              >
                <span className="text-xl">{a.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-amber-800">{a.name}</p>
                  <p className="text-xs text-amber-600">+{a.xp} XP</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
