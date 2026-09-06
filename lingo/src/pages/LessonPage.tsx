import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { COURSES } from '../data/courses'
import { LANGUAGES } from '../data/languages'
import { useApp } from '../context/AppContext'
import VocabModule from '../components/modules/VocabModule'
import GrammarModule from '../components/modules/GrammarModule'
import SpeakingModule from '../components/modules/SpeakingModule'
import ListeningModule from '../components/modules/ListeningModule'

const TABS = [
  { key: 'vocab', label: '单词', icon: '📇' },
  { key: 'grammar', label: '语法', icon: '✏️' },
  { key: 'speaking', label: '口语', icon: '🎙️' },
  { key: 'listening', label: '听力', icon: '🎧' },
] as const

export default function LessonPage() {
  const { courseId, lessonId } = useParams()
  const { currentUser, completeLesson, checkAchievements } = useApp()
  const [tab, setTab] = useState<typeof TABS[number]['key']>('vocab')
  const [done, setDone] = useState(false)

  const course = useMemo(() => COURSES.find((c) => c.id === courseId), [courseId])
  const lesson = useMemo(
    () => course?.lessons.find((l) => l.id === lessonId),
    [course, lessonId],
  )

  useEffect(() => {
    setDone(false)
    setTab('vocab')
  }, [lessonId])

  if (!currentUser || !course || !lesson) {
    return (
      <div className="py-20 text-center">
        <p className="text-slate-500">课时未找到</p>
        <Link to="/courses" className="mt-4 inline-block text-brand-600 hover:underline">返回课程列表</Link>
      </div>
    )
  }

  const lang = LANGUAGES.find((l) => l.code === course.language)!
  const completed = currentUser.completedLessons.includes(lesson.id)

  const finishLesson = () => {
    completeLesson(lesson.id, lesson.xp)
    checkAchievements()
    setDone(true)
  }

  if (done) {
    return (
      <div className="animate-pop py-16 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 text-5xl shadow-xl">
          🎉
        </div>
        <h2 className="mt-6 text-2xl font-bold text-slate-800">课时完成！</h2>
        <p className="mt-2 text-slate-500">
          获得 <span className="font-bold text-amber-500">+{lesson.xp} XP</span>，继续加油！
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/courses" className="rounded-xl bg-slate-100 px-5 py-2.5 font-medium text-slate-700 hover:bg-slate-200">
            返回课程
          </Link>
          <Link to="/" className="rounded-xl bg-brand-600 px-5 py-2.5 font-semibold text-white hover:bg-brand-700">
            回到首页
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <Link to="/courses" className="text-sm text-slate-400 hover:text-brand-600">← 返回课程</Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className={`rounded-full bg-gradient-to-r ${course.color} px-3 py-1 text-xs font-semibold text-white`}>
            {lang.flag} {course.level}
          </span>
          <h1 className="text-2xl font-bold text-slate-800">{lesson.title}</h1>
          {completed && (
            <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-600">已完成</span>
          )}
        </div>
        <p className="mt-1 text-slate-500">{lesson.description}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto rounded-2xl bg-white p-2 shadow-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition ${
              tab === t.key ? 'bg-brand-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Module */}
      <div className="animate-fade-in">
        {tab === 'vocab' && <VocabModule items={lesson.vocab} langCode={course.language} />}
        {tab === 'grammar' && <GrammarModule items={lesson.grammar} />}
        {tab === 'speaking' && <SpeakingModule items={lesson.speaking} langCode={course.language} />}
        {tab === 'listening' && <ListeningModule items={lesson.listening} langCode={course.language} />}
      </div>

      {/* Finish */}
      <div className="flex justify-end border-t border-slate-100 pt-5">
        <button
          onClick={finishLesson}
          className="rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 px-6 py-3 font-bold text-white shadow-lg shadow-orange-500/30 hover:opacity-90"
        >
          ✨ 完成本课 (+{lesson.xp} XP)
        </button>
      </div>
    </div>
  )
}
