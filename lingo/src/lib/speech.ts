export function speak(text: string, lang: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) {
      reject(new Error('浏览器不支持语音合成'))
      return
    }
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = lang
    utter.rate = 0.9
    utter.onend = () => resolve()
    utter.onerror = () => reject(new Error('语音播放失败'))
    window.speechSynthesis.speak(utter)
  })
}

type SR = any

export function getRecognition(): SR | null {
  const w = window as any
  const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition
  if (!Ctor) return null
  const rec = new Ctor()
  rec.interimResults = false
  rec.maxAlternatives = 1
  return rec
}

export function recognize(lang: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rec = getRecognition()
    if (!rec) {
      reject(new Error('当前浏览器不支持语音识别，请使用 Chrome / Edge'))
      return
    }
    rec.lang = lang
    let finished = false
    const finish = () => {
      if (finished) return
      finished = true
    }
    rec.onresult = (e: any) => {
      finish()
      const transcript = e.results[0][0].transcript
      resolve(transcript)
    }
    rec.onerror = (e: any) => {
      finish()
      reject(new Error(`识别失败：${e.error || '未知错误'}`))
    }
    rec.onend = () => {
      if (!finished) {
        finish()
        resolve('')
      }
    }
    try {
      rec.start()
    } catch (err) {
      reject(new Error('无法启动语音识别'))
    }
  })
}

// Simple similarity score (0-1) for pronunciation evaluation
export function similarity(a: string, b: string): number {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .replace(/[.,!?;:、。，！？；：]/g, '')
      .trim()
  const aa = norm(a)
  const bb = norm(b)
  if (!aa || !bb) return 0
  if (aa === bb) return 1
  // longest common subsequence ratio
  const m = aa.length
  const n = bb.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = aa[i - 1] === bb[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const lcs = dp[m][n]
  return (2 * lcs) / (m + n)
}
