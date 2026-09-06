import { useState } from 'react'
import type { SpeakingItem } from '../../types'
import { useApp } from '../../context/AppContext'
import { speak, recognize, similarity } from '../../lib/speech'
import { LANGUAGES } from '../../data/languages'

interface Props {
  items: SpeakingItem[]
  langCode: string
}

export default function SpeakingModule({ items, langCode }: Props) {
  const { addXP } = useApp()
  const [idx, setIdx] = useState(0)
  const [listening, setListening] = useState(false)
  const [result, setResult] = useState<string>('')
  const [score, setScore] = useState<number | null>(null)
  const [error, setError] = useState<string>('')

  if (items.length === 0) return <p className="text-slate-500">本课暂无口语练习。</p>
  const lang = LANGUAGES.find((l) => l.code === langCode)!
  const item = items[idx]

  async function startRecognition() {
    setError('')
    setResult('')
    setScore(null)
    setListening(true)
    try {
      const transcript = await recognize(lang.speechLang)
      setResult(transcript)
      if (transcript) {
        const s = similarity(transcript, item.text)
        setScore(s)
        if (s >= 0.6) addXP(Math.round(s * 15))
      }
    } catch (e: any) {
      setError(e?.message || '识别失败')
    } finally {
      setListening(false)
    }
  }

  function next() {
    if (idx < items.length - 1) {
      setIdx(idx + 1)
      setResult('')
      setScore(null)
      setError('')
    }
  }

  const scorePct = score !== null ? Math.round(score * 100) : 0

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-slate-600">🎙️ 口语跟读</span>
        <span className="text-slate-400">{idx + 1} / {items.length}</span>
      </div>

      <div className="rounded-2xl bg-gradient-to-br from-indigo-50 to-purple-100 p-6">
        <p className="text-center text-xs uppercase tracking-wider text-indigo-500">跟我读</p>
        <p className="mt-3 text-center text-2xl font-bold text-slate-800">{item.text}</p>
        <p className="mt-2 text-center text-slate-500">{item.translation}</p>
        <button
          onClick={() => speak(item.text, lang.speechLang).catch(() => {})}
          className="mx-auto mt-4 flex items-center gap-2 rounded-full bg-white px-5 py-2 text-sm font-medium text-indigo-600 shadow hover:shadow-md"
        >
          🔊 听示范发音
        </button>
      </div>

      <div className="flex flex-col items-center rounded-2xl bg-white p-6 shadow-sm">
        <button
          onClick={startRecognition}
          disabled={listening}
          className={`flex h-24 w-24 items-center justify-center rounded-full text-4xl text-white shadow-lg transition ${
            listening
              ? 'animate-pulse bg-red-500'
              : 'bg-gradient-to-br from-indigo-500 to-purple-600 hover:scale-105'
          }`}
        >
          {listening ? '🎤' : '🎙️'}
        </button>
        <p className="mt-3 text-sm text-slate-500">
          {listening ? '正在聆听...请朗读' : '点击麦克风开始跟读'}
        </p>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        {result && (
          <div className="mt-4 w-full animate-fade-in rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-400">你的发音：</p>
            <p className="mt-1 text-lg font-semibold text-slate-800">{result}</p>
            {score !== null && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500">相似度评分</span>
                  <span className={`font-bold ${scorePct >= 70 ? 'text-green-600' : scorePct >= 40 ? 'text-amber-500' : 'text-red-500'}`}>
                    {scorePct}%
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className={`h-full rounded-full ${scorePct >= 70 ? 'bg-green-500' : scorePct >= 40 ? 'bg-amber-400' : 'bg-red-400'}`}
                    style={{ width: `${scorePct}%` }}
                  />
                </div>
                <p className="mt-2 text-center text-sm">
                  {scorePct >= 80 ? '🎉 太棒了，发音非常标准！' : scorePct >= 60 ? '👍 不错，继续练习！' : scorePct >= 40 ? '💪 再试一次吧' : '🔁 多听几遍再试试'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button
          onClick={next}
          disabled={idx === items.length - 1}
          className="rounded-xl bg-slate-100 px-5 py-2 text-sm font-medium text-slate-600 disabled:opacity-40"
        >
          {idx === items.length - 1 ? '已完成' : '下一句 →'}
        </button>
      </div>

      <p className="text-center text-xs text-slate-400">
        💡 提示：语音识别需要麦克风权限，推荐使用 Chrome / Edge 浏览器
      </p>
    </div>
  )
}
