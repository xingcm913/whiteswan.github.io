import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../data/languages'

const NAV = [
  { to: '/', label: '首页', icon: '🏠' },
  { to: '/courses', label: '课程', icon: '📖' },
  { to: '/practice', label: '练习', icon: '🎯' },
  { to: '/progress', label: '进度', icon: '📊' },
  { to: '/path', label: '学习路径', icon: '🧭' },
  { to: '/community', label: '社区', icon: '💬' },
  { to: '/achievements', label: '成就', icon: '🏆' },
]

export default function Layout() {
  const { currentUser, logout, setLanguage } = useApp()
  const navigate = useNavigate()

  if (!currentUser) {
    return <Outlet />
  }

  const xpInLevel = currentUser.xp % 500
  const xpProgress = (xpInLevel / 500) * 100

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-30 hidden h-screen w-60 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex h-16 items-center gap-2 border-b border-slate-200 px-5">
          <span className="text-2xl">🗣️</span>
          <span className="text-lg font-bold text-brand-700">LingoVerse</span>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        {/* Language switcher */}
        <div className="border-t border-slate-200 p-3">
          <p className="mb-2 px-2 text-xs font-semibold uppercase text-slate-400">当前语言</p>
          <div className="flex gap-1">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                onClick={() => setLanguage(l.code)}
                className={`flex-1 rounded-lg py-1.5 text-sm transition ${
                  currentUser.currentLanguage === l.code
                    ? 'bg-brand-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                title={l.name}
              >
                {l.flag}
              </button>
            ))}
          </div>
        </div>
        {/* User */}
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-2xl">{currentUser.avatar}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-800">{currentUser.username}</p>
              <p className="text-xs text-slate-400">Lv.{currentUser.level}</p>
            </div>
            <button
              onClick={() => {
                logout()
                navigate('/login')
              }}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-500"
              title="退出登录"
            >
              ⏻
            </button>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all"
              style={{ width: `${xpProgress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-slate-400">
            {xpInLevel}/500 XP
          </p>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 md:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗣️</span>
          <span className="font-bold text-brand-700">LingoVerse</span>
        </div>
        <span className="text-xl">{currentUser.avatar}</span>
      </header>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex border-t border-slate-200 bg-white md:hidden">
        {NAV.slice(0, 5).map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
                isActive ? 'text-brand-600' : 'text-slate-500'
              }`
            }
          >
            <span className="text-lg">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Main */}
      <main className="ml-0 min-h-screen flex-1 md:ml-60">
        <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 md:px-8 md:pt-8 md:pb-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
