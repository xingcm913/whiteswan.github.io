import { useApp } from '../context/AppContext'
import { ACHIEVEMENTS } from '../data/achievements'

export default function AchievementsPage() {
  const { currentUser, leaderboard, getUserStats } = useApp()
  if (!currentUser) return null

  const stats = getUserStats(currentUser)
  const unlocked = ACHIEVEMENTS.filter((a) => currentUser.achievements.includes(a.id))
  const totalXPFromAchievements = unlocked.reduce((s, a) => s + a.xp, 0)

  const myRank = leaderboard.findIndex((u) => u.id === currentUser.id) + 1

  return (
    <div className="animate-fade-in space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">🏆 成就与排行榜</h1>
        <p className="mt-1 text-slate-500">解锁徽章，登上排行榜，见证你的努力</p>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-5 text-white">
          <p className="text-sm text-white/80">🎖️ 已解锁徽章</p>
          <p className="mt-1 text-4xl font-bold">{unlocked.length} / {ACHIEVEMENTS.length}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-violet-400 to-purple-600 p-5 text-white">
          <p className="text-sm text-white/80">⭐ 徽章奖励 XP</p>
          <p className="mt-1 text-4xl font-bold">{totalXPFromAchievements}</p>
        </div>
        <div className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 p-5 text-white">
          <p className="text-sm text-white/80">🏅 我的排名</p>
          <p className="mt-1 text-4xl font-bold">#{myRank || '-'}</p>
        </div>
      </div>

      {/* Achievements grid */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">徽章墙</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {ACHIEVEMENTS.map((a) => {
            const got = currentUser.achievements.includes(a.id)
            return (
              <div
                key={a.id}
                className={`rounded-2xl p-4 text-center transition ${
                  got ? 'bg-gradient-to-br from-amber-50 to-orange-50 ring-2 ring-amber-200' : 'bg-slate-50 opacity-70'
                }`}
              >
                <div className={`text-5xl ${got ? '' : 'grayscale'}`}>{got ? a.icon : '🔒'}</div>
                <p className={`mt-2 font-bold ${got ? 'text-amber-700' : 'text-slate-500'}`}>{a.name}</p>
                <p className="mt-1 text-xs text-slate-500">{a.description}</p>
                <p className={`mt-2 text-xs font-semibold ${got ? 'text-amber-600' : 'text-slate-400'}`}>+{a.xp} XP</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">🏆 全球排行榜</h2>
        <div className="space-y-2">
          {leaderboard.map((u, i) => (
            <div
              key={u.id}
              className={`flex items-center gap-4 rounded-2xl p-3 ${
                u.id === currentUser.id ? 'bg-brand-50 ring-1 ring-brand-200' : ''
              }`}
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${
                  i === 0
                    ? 'bg-gradient-to-br from-amber-300 to-amber-500 text-white'
                    : i === 1
                    ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white'
                    : i === 2
                    ? 'bg-gradient-to-br from-orange-300 to-orange-500 text-white'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {i + 1}
              </span>
              <span className="text-2xl">{u.avatar}</span>
              <div className="flex-1">
                <p className="font-semibold text-slate-800">
                  {u.username} {u.id === currentUser.id && <span className="text-xs text-brand-600">(我)</span>}
                </p>
                <p className="text-xs text-slate-400">Lv.{u.level} · 连续 {u.streak} 天</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-brand-600">{u.xp} XP</p>
                <p className="text-xs text-slate-400">{u.completedLessons.length} 课时</p>
              </div>
            </div>
          ))}
          {leaderboard.length === 0 && (
            <p className="py-6 text-center text-slate-400">暂无数据</p>
          )}
        </div>
      </div>

      {/* Stats details */}
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold text-slate-800">📈 我的数据</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: '总 XP', value: stats.xp, icon: '⭐' },
            { label: '连续天数', value: stats.streak, icon: '🔥' },
            { label: '完成课时', value: stats.completedLessons, icon: '📚' },
            { label: '掌握单词', value: stats.vocabMastered, icon: '🧠' },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-2xl">{s.icon}</p>
              <p className="mt-1 text-2xl font-bold text-slate-800">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
