import { useState } from 'react'
import type { ListeningItem } from '../../types'
import { useApp } from '../../context/AppContext'
import { speak } from '../../lib/speech'
import { LANGUAGES } from '../../data/languages'

interface Props {
  items: ListeningItem[]
  langCode: string
}

export default function ListeningModule({ items, langCode }: Props) {
  const { addXP } = useApp()
  const [idx, setIdx] = useState(0)
  const [picked, setPicked] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [showTranscript, setShowTranscript] = useState(false)

  if (items.length === 0) return <p className="text-slate-500">本课暂无听力题。</p>
  const lang = LANGUAGES.find((l) => l.code === langCode)!
  const item = items[idx]

  function submit() {
    if (picked === null) return
    if (picked === item.answer) addXP(10)
    setSubmitted(true)
  }

  function next() {
    if (idx < items.length - 1) {
      setIdx(idx + 1)
      setPicked(null)
      setSubmitted(false)
      setShowTranscript(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">🎧 听力训练</span>
        <span className="text-slate-400">{idx + 1} / {items.length}</span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-cyan-100 p-6">
        <p className="text-center text-xs uppercase tracking-wider text-sky-600">听音频并回答问题</p>
        <button
          onClick={() => speak(item.text, lang.speechLang).catch(() => {})}
          className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-cyan-600 text-4xl text-white shadow-lg hover:scale-105"
        >
          🔊
        </button>
        <p className="mt-3 text-center text-sm text-slate-500">点击播放音频</p>

        {showTranscript && (
          <div className="mt-4 rounded-xl bg-white/70 p-3 text-center animate-fade-in">
            <p className="text-sm text-slate-700">{item.text}</p>
            <p className="mt-1 text-xs text-slate-500">{item.translation}</p>
          </div>
        )}
        <button
          onClick={() => setShowTranscript(!showTranscript)}
          className="mt-3 block mx-auto text-xs text-sky-600 hover:underline"
        >
          {showTranscript ? '隐藏原文' : '查看原文'}
        </button>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="font-semibold text-slate-800">问题：{item.question}</p>
        <div className="mt-4 grid gap-2">
          {item.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => !submitted && setPicked(i)}
              className={`rounded-xl border px-4 py-3 text-left transition ${
                submitted
                  ? i === item.answer
                    ? 'border-green-400 bg-green-50 text-green-700'
                    : picked === i
                    ? 'border-red-400 bg-red-50 text-red-600'
                    : 'border-slate-100 text-slate-400'
                  : picked === i
                  ? 'border-sky-500 bg-sky-50 text-sky-700'
                  : 'border-slate-200 hover:border-sky-300 hover:bg-slate-50'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>

        {submitted && (
          <p className={`mt-4 rounded-lg p-3 text-sm ${picked === item.answer ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {picked === item.answer ? '✓ 回答正确！+10 XP' : `✗ 正确答案是：${item.options[item.answer]}`}
          </p>
        )}

        <div className="mt-5 flex justify-end">
          {!submitted ? (
            <button
              onClick={submit}
              disabled={picked === null}
              className="rounded-xl bg-sky-600 px-6 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
            >
              提交
            </button>
          ) : (
            <button
              onClick={next}
              disabled={idx === items.length - 1}
              className="rounded-xl bg-sky-600 px-6 py-2.5 font-semibold text-white hover:bg-sky-700 disabled:opacity-40"
            >
              {idx === items.length - 1 ? '已完成' : '下一题 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
