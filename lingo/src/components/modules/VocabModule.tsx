import { useState } from 'react'
import type { VocabItem } from '../../types'
import { useApp } from '../../context/AppContext'
import { speak } from '../../lib/speech'
import { LANGUAGES } from '../../data/languages'

interface Props {
  items: VocabItem[]
  langCode: string
}

export default function VocabModule({ items, langCode }: Props) {
  const { currentUser, masterVocab, addXP } = useApp()
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [known, setKnown] = useState<Set<string>>(new Set())

  if (!currentUser) return null
  if (items.length === 0) return <p className="text-slate-500">本课暂无单词。</p>

  const lang = LANGUAGES.find((l) => l.code === langCode)!
  const item = items[idx]
  const progress = ((idx + 1) / items.length) * 100

  function next() {
    if (idx < items.length - 1) {
      setIdx(idx + 1)
      setFlipped(false)
    }
  }
  function prev() {
    if (idx > 0) {
      setIdx(idx - 1)
      setFlipped(false)
    }
  }
  function markKnown() {
    if (!known.has(item.id)) {
      setKnown((s) => new Set(s).add(item.id))
      masterVocab(item.id)
      addXP(5)
    }
    next()
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">📇 单词记忆</span>
        <span className="text-slate-400">{idx + 1} / {items.length} · 已掌握 {known.size}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all" style={{ width: `${progress}%` }} />
      </div>

      {/* Flashcard */}
      <div
        onClick={() => setFlipped(!flipped)}
        className="relative h-64 cursor-pointer [perspective:1200px]"
      >
        <div
          className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
          style={{ transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
        >
          {/* Front */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-100 p-6 [backface-visibility:hidden]">
            <p className="text-xs uppercase tracking-wider text-emerald-600">{item.partOfSpeech}</p>
            <p className="mt-2 text-4xl font-bold text-slate-800">{item.word}</p>
            <p className="mt-2 text-slate-500">{item.pronunciation}</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                speak(item.word, lang.speechLang).catch(() => {})
              }}
              className="mt-4 rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-medium text-white hover:bg-emerald-600"
            >
              🔊 朗读
            </button>
            <p className="mt-4 text-xs text-slate-400">点击卡片查看释义</p>
          </div>
          {/* Back */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-brand-50 to-indigo-100 p-6 [backface-visibility:hidden]" style={{ transform: 'rotateY(180deg)' }}>
            <p className="text-3xl font-bold text-slate-800">{item.translation}</p>
            <div className="mt-4 w-full rounded-xl bg-white/70 p-3 text-center">
              <p className="text-sm text-slate-700">{item.example}</p>
              <p className="mt-1 text-xs text-slate-500">{item.exampleTrans}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                speak(item.example, lang.speechLang).catch(() => {})
              }}
              className="mt-3 text-xs text-brand-600 hover:underline"
            >
              🔊 朗读例句
            </button>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-3">
        <button
          onClick={prev}
          disabled={idx === 0}
          className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          ← 上一个
        </button>
        <button
          onClick={markKnown}
          className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:opacity-90"
        >
          {known.has(item.id) ? '✓ 已掌握' : '我认识了 (+5 XP)'}
        </button>
        <button
          onClick={next}
          disabled={idx === items.length - 1}
          className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          下一个 →
        </button>
      </div>
    </div>
  )
}
