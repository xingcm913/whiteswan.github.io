import { useState } from 'react'
import type { GrammarQuestion } from '../../types'
import { useApp } from '../../context/AppContext'

interface Props {
  items: GrammarQuestion[]
}

export default function GrammarModule({ items }: Props) {
  const { addXP } = useApp()
  const [idx, setIdx] = useState(0)
  const [input, setInput] = useState('')
  const [picked, setPicked] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(0)

  if (items.length === 0) return <p className="text-slate-500">本课暂无语法题。</p>
  const q = items[idx]
  const isChoice = q.type === 'choice'

  function check() {
    const ans = isChoice ? picked : input.trim()
    if (!ans) return
    const ok = ans.toLowerCase() === q.answer.toLowerCase()
    if (ok) {
      setCorrect((c) => c + 1)
      addXP(8)
    }
    setSubmitted(true)
  }

  function next() {
    if (idx < items.length - 1) {
      setIdx(idx + 1)
      setInput('')
      setPicked(null)
      setSubmitted(false)
    }
  }

  const isCorrect = submitted && (isChoice ? picked === q.answer : input.trim().toLowerCase() === q.answer.toLowerCase())

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">✏️ 语法练习</span>
        <span className="text-slate-400">{idx + 1} / {items.length} · 正确 {correct}</span>
      </div>

      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-400">第 {idx + 1} 题</p>
        <p className="mt-2 text-lg font-semibold text-slate-800">{q.prompt}</p>

        {isChoice ? (
          <div className="mt-5 grid gap-2">
            {q.options!.map((opt) => (
              <button
                key={opt}
                onClick={() => !submitted && setPicked(opt)}
                className={`rounded-xl border px-4 py-3 text-left transition ${
                  submitted
                    ? opt === q.answer
                      ? 'border-green-400 bg-green-50 text-green-700'
                      : picked === opt
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-slate-100 text-slate-400'
                    : picked === opt
                    ? 'border-brand-500 bg-brand-50 text-brand-700'
                    : 'border-slate-200 hover:border-brand-300 hover:bg-slate-50'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={submitted}
              onKeyDown={(e) => e.key === 'Enter' && check()}
              placeholder="输入答案..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none focus:border-brand-500 focus:bg-white disabled:opacity-60"
            />
          </div>
        )}

        {submitted && (
          <div className={`mt-4 rounded-xl p-4 text-sm ${isCorrect ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            <p className="font-semibold">{isCorrect ? '✓ 回答正确！+8 XP' : '✗ 再想想'}</p>
            <p className="mt-1">正确答案：<span className="font-bold">{q.answer}</span></p>
            <p className="mt-1">{q.explanation}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          {!submitted ? (
            <button
              onClick={check}
              disabled={isChoice ? !picked : !input.trim()}
              className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              提交
            </button>
          ) : (
            <button
              onClick={next}
              disabled={idx === items.length - 1}
              className="rounded-xl bg-brand-600 px-6 py-2.5 font-semibold text-white hover:bg-brand-700 disabled:opacity-40"
            >
              {idx === items.length - 1 ? '已完成' : '下一题 →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
