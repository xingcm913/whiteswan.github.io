import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'

export default function AuthPage() {
  const { login, register, currentUser } = useApp()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  if (currentUser) {
    return <Navigate to="/" replace />
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const res = mode === 'login' ? login(username, password) : register(username, password)
    if (res.ok) {
      setMsg({ type: 'ok', text: res.msg })
      setTimeout(() => navigate('/', { replace: true }), 400)
    } else {
      setMsg({ type: 'err', text: res.msg })
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-500 via-brand-600 to-indigo-700 p-4">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-3xl bg-white shadow-2xl md:grid-cols-2">
        {/* Left hero */}
        <div className="hidden flex-col justify-between bg-gradient-to-br from-brand-600 to-indigo-700 p-10 text-white md:flex">
          <div className="flex items-center gap-2 text-2xl font-bold">
            <span>🗣️</span> LingoVerse
          </div>
          <div>
            <h2 className="text-3xl font-bold leading-tight">开启你的多语言学习之旅</h2>
            <p className="mt-3 text-brand-100">
              沉浸式学习英语、日语、韩语。分级课程、互动练习、进度追踪、社区交流，一站式搞定。
            </p>
            <div className="mt-8 space-y-3">
              {[
                ['📚', '分级课程体系，从入门到精通'],
                ['🎯', '单词 / 语法 / 口语 / 听力 四大模块'],
                ['📊', '学习进度可视化追踪'],
                ['🏆', '成就激励与排行榜'],
              ].map(([icon, text]) => (
                <div key={text} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-lg">
                    {icon}
                  </span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-brand-200">© 2026 LingoVerse · 沉浸式多语种学习平台</p>
        </div>

        {/* Right form */}
        <div className="flex flex-col justify-center p-8 sm:p-12">
          <h1 className="text-2xl font-bold text-slate-800">
            {mode === 'login' ? '欢迎回来' : '创建账户'}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {mode === 'login' ? '登录继续你的学习旅程' : '注册后即可开始学习'}
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">用户名</label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                placeholder="请输入用户名"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-100"
                placeholder="请输入密码"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {msg && (
              <p
                className={`rounded-lg px-3 py-2 text-sm ${
                  msg.type === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                }`}
              >
                {msg.text}
              </p>
            )}

            <button
              type="submit"
              className="w-full rounded-xl bg-gradient-to-r from-brand-500 to-brand-700 py-3 font-semibold text-white shadow-lg shadow-brand-500/30 transition hover:opacity-90 active:scale-[0.99]"
            >
              {mode === 'login' ? '登 录' : '注 册'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            {mode === 'login' ? '还没有账户？' : '已有账户？'}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'register' : 'login')
                setMsg(null)
              }}
              className="ml-1 font-semibold text-brand-600 hover:underline"
            >
              {mode === 'login' ? '立即注册' : '去登录'}
            </button>
          </p>

          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-700">
            💡 演示提示：注册后数据保存在浏览器本地，你可以直接体验所有功能。
          </div>
        </div>
      </div>
    </div>
  )
}
