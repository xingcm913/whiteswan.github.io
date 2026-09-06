import { useState } from 'react'
import { useApp } from '../context/AppContext'
import { LANGUAGES } from '../data/languages'
import type { LangCode } from '../types'

export default function CommunityPage() {
  const { currentUser, posts, addPost, toggleLike, addComment } = useApp()
  const [filter, setFilter] = useState<LangCode | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [postLang, setPostLang] = useState<LangCode>('en')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [comment, setComment] = useState('')

  if (!currentUser) return null

  const filtered = filter === 'all' ? posts : posts.filter((p) => p.language === filter)

  function handlePost(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim() || !content.trim()) return
    addPost({ language: postLang, title: title.trim(), content: content.trim() })
    setTitle('')
    setContent('')
    setShowForm(false)
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime()
    const m = Math.floor(diff / 60000)
    if (m < 1) return '刚刚'
    if (m < 60) return `${m} 分钟前`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h} 小时前`
    const d = Math.floor(h / 24)
    return `${d} 天前`
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">💬 学习社区</h1>
          <p className="mt-1 text-slate-500">与全球学习者交流心得、分享经验</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
        >
          ✏️ 发帖
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <form onSubmit={handlePost} className="animate-fade-in rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-3 flex gap-2">
            {LANGUAGES.map((l) => (
              <button
                type="button"
                key={l.code}
                onClick={() => setPostLang(l.code)}
                className={`rounded-full px-3 py-1 text-sm ${
                  postLang === l.code ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {l.flag} {l.name}
              </button>
            ))}
          </div>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题"
            className="mb-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-brand-500"
          />
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="分享你的学习心得..."
            rows={4}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 outline-none focus:border-brand-500"
          />
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-xl bg-brand-600 px-5 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              发布
            </button>
          </div>
        </form>
      )}

      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-full px-4 py-1.5 text-sm ${filter === 'all' ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
        >
          全部
        </button>
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            onClick={() => setFilter(l.code)}
            className={`rounded-full px-4 py-1.5 text-sm ${filter === l.code ? 'bg-brand-600 text-white' : 'bg-white text-slate-600'}`}
          >
            {l.flag} {l.name}
          </button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {filtered.length === 0 && (
          <div className="rounded-2xl bg-white p-10 text-center text-slate-500 shadow-sm">还没有帖子，来发第一个吧！</div>
        )}
        {filtered.map((p) => {
          const lang = LANGUAGES.find((l) => l.code === p.language)!
          const liked = p.likes.includes(currentUser.id)
          const isOpen = expanded === p.id
          return (
            <div key={p.id} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.avatar}</span>
                <div className="flex-1">
                  <p className="font-semibold text-slate-800">{p.author}</p>
                  <p className="text-xs text-slate-400">{timeAgo(p.createdAt)} · {lang.flag} {lang.name}</p>
                </div>
              </div>
              <h3 className="mt-3 font-bold text-slate-800">{p.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{p.content}</p>

              <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                <button
                  onClick={() => toggleLike(p.id)}
                  className={`flex items-center gap-1 transition ${liked ? 'text-red-500' : 'hover:text-red-500'}`}
                >
                  {liked ? '❤️' : '🤍'} {p.likes.length}
                </button>
                <button
                  onClick={() => setExpanded(isOpen ? null : p.id)}
                  className="flex items-center gap-1 hover:text-brand-600"
                >
                  💬 {p.comments.length}
                </button>
              </div>

              {isOpen && (
                <div className="mt-4 animate-fade-in border-t border-slate-100 pt-4">
                  {/* Comment input */}
                  <div className="flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && comment.trim()) {
                          addComment(p.id, comment.trim())
                          setComment('')
                        }
                      }}
                      placeholder="写下你的评论..."
                      className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-brand-500"
                    />
                    <button
                      onClick={() => {
                        if (comment.trim()) {
                          addComment(p.id, comment.trim())
                          setComment('')
                        }
                      }}
                      className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white"
                    >
                      发送
                    </button>
                  </div>
                  {/* Comments */}
                  <div className="mt-3 space-y-3">
                    {p.comments.length === 0 && (
                      <p className="text-sm text-slate-400">暂无评论</p>
                    )}
                    {p.comments.map((c) => (
                      <div key={c.id} className="flex gap-2">
                        <span className="text-lg">{c.avatar}</span>
                        <div className="rounded-xl bg-slate-50 px-3 py-2">
                          <p className="text-sm font-medium text-slate-700">{c.author}</p>
                          <p className="text-sm text-slate-600">{c.content}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{timeAgo(c.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
