import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'
import { useApp } from '../context/AppContext'
import { COURSES } from '../data/courses'
import { LANGUAGES } from '../data/languages'

export default function ProgressPage() {
  const { currentUser, activity } = useApp()
  if (!currentUser) return null

  const lang = LANGUAGES.find((l) => l.code === currentUser.currentLanguage)!
  const userCourses = COURSES.filter((c) => c.language === currentUser.currentLanguage)

  // Last 7 days activity
  const chartData = useMemo(() => {
    const days: { date: string; label: string; xp: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().slice(0, 10)
      const rec = activity.find((a) => a.date === ds)
      days.push({
        date: ds,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        xp: rec?.xp || 0,
      })
    }
    return days
  }, [activity])

  const totalXPThisWeek = chartData.reduce((s, d) => s + d.xp, 0)
  const goal = currentUser.preferences.dailyGoal
  const todayXP = chartData[chartData.length - 1]?.xp || 0
  const goalPct = Math.min(100, Math.round((todayXP / goal) * 100))

  const totalLessons = userCourses.reduce((s, c) => s + c.lessons.length, 0)
  const completedLessons = userCourses
    .flatMap((c) => c.lessons)
    .filter((l) => currentUser.completedLessons.includes(l.id)).length
  const lessonsPct = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">📊 学习进度</h1>
        <p className="mt-1 text-slate-500">追踪你的学习数据，见证每一步成长</p>
      </div>

      {/* Top stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 p-5 text-white">
          <p className="text-sm text-white/80">🔥 连续学习</p>
          <p className="mt-1 text-4xl font-bold">{currentUser.streak} <span className="text-lg">天</span></p>
          <p className="mt-2 text-xs text-white/70">坚持就是胜利！</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white">
          <p className="text-sm text-white/80">⭐ 总经验值</p>
          <p className="mt-1 text-4xl font-bold">{currentUser.xp}</p>
          <p className="mt-2 text-xs text-white/70">等级 Lv.{currentUser.level}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-5 text-white">
          <p className="text-sm text-white/80">🧠 掌握单词</p>
          <p className="mt-1 text-4xl font-bold">{currentUser.vocabMastered.length}</p>
          <p className="mt-2 text-xs text-white/70">已记入生词本</p>
        </div>
      </div>

      {/* Daily goal */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800">今日目标</h2>
          <span className="text-sm text-slate-500">{todayXP} / {goal} XP</span>
        </div>
        <div className="mt-3 h-4 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
            style={{ width: `${goalPct}%` }}
          />
        </div>
        <p className="mt-2 text-sm text-slate-500">
          {goalPct >= 100 ? '🎉 今日目标已达成！' : `还差 ${goal - todayXP} XP 完成今日目标`}
        </p>
      </div>

      {/* XP chart */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-bold text-slate-800">近 7 天 XP 趋势</h2>
          <span className="text-sm text-slate-400">本周共 {totalXPThisWeek} XP</span>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
            <YAxis stroke="#94a3b8" fontSize={12} />
            <Tooltip
              contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              formatter={(v: any) => [`${v} XP`, '经验']}
            />
            <Bar dataKey="xp" fill="#0c8be9" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Course progress */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">{lang.name} 课程进度</h2>
        <div className="space-y-4">
          {userCourses.map((c) => {
            const done = c.lessons.filter((l) => currentUser.completedLessons.includes(l.id)).length
            const pct = Math.round((done / c.lessons.length) * 100)
            return (
              <div key={c.id}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="font-medium text-slate-700">{c.title}</span>
                  <span className="text-slate-400">{done}/{c.lessons.length}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={`h-full rounded-full bg-gradient-to-r ${c.color}`} style={{ width: `${pct}%` }} />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-center">
          <p className="text-sm text-slate-500">
            总体完成度 <span className="text-xl font-bold text-brand-600">{lessonsPct}%</span>（{completedLessons}/{totalLessons} 课时）
          </p>
        </div>
      </div>
    </div>
  )
}
