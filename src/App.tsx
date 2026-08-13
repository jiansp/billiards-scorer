import { useEffect, useMemo, useState } from 'react'
import {
  applyEvent,
  DEFAULT_RULES,
  EVENT_DESC,
  EVENT_LABELS,
  EVENT_ORDER,
  type EventType,
  type HistoryEntry,
  type Rules,
} from './scoring'

const STORAGE_KEY = 'billiards-scorer-v1'

// 每种事件按钮的视觉配色
const EVENT_COLORS: Record<EventType, string> = {
  puSheng: '#3b82f6',
  xiaoJin: '#06b6d4',
  daJin: '#f59e0b',
  huangJinJiu: '#eab308',
  heiJin: '#ef4444',
  fanGui: '#64748b',
}

interface SavedState {
  phase: 'setup' | 'game'
  count: number
  names: string[]
  initial: number
  rules: Rules
  scores: number[]
  shooter: number
  history: HistoryEntry[]
}

export default function App() {
  const [phase, setPhase] = useState<'setup' | 'game'>('setup')
  const [count, setCount] = useState<2 | 3>(3)
  const [names, setNames] = useState<string[]>(['玩家1', '玩家2', '玩家3'])
  const [initial, setInitial] = useState(100)
  const [rules, setRules] = useState<Rules>(DEFAULT_RULES)

  const [scores, setScores] = useState<number[]>([])
  const [shooter, setShooter] = useState(0)
  const [history, setHistory] = useState<HistoryEntry[]>([])

  const [toast, setToast] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [pendingEvent, setPendingEvent] = useState<EventType | null>(null)

  // 启动时恢复存档
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return
      const d = JSON.parse(raw) as SavedState
      if (d.names) setNames(d.names)
      if (typeof d.count === 'number') setCount(d.count === 2 ? 2 : 3)
      if (typeof d.initial === 'number') setInitial(d.initial)
      if (d.rules) setRules(d.rules)
      if (d.phase === 'game' && Array.isArray(d.scores) && d.scores.length === d.count) {
        setScores(d.scores)
        setShooter(d.shooter ?? 0)
        setHistory(d.history ?? [])
        setPhase('game')
      }
    } catch {
      /* ignore */
    }
  }, [])

  // 持久化
  useEffect(() => {
    try {
      const data: SavedState = {
        phase,
        count,
        names,
        initial,
        rules,
        scores,
        shooter,
        history,
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      /* ignore */
    }
  }, [phase, count, names, initial, rules, scores, shooter, history])

  // toast 自动消失
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1800)
    return () => clearTimeout(t)
  }, [toast])

  const activeNames = useMemo(() => names.slice(0, count), [names, count])

  const startGame = () => {
    const ns = names.slice(0, count).map((n, i) => n.trim() || `玩家${i + 1}`)
    setNames((prev) => {
      const c = prev.slice()
      ns.forEach((v, i) => (c[i] = v))
      return c
    })
    setScores(ns.map(() => initial))
    setShooter(0)
    setHistory([])
    setPhase('game')
  }

  const newRound = () => {
    setScores(activeNames.map(() => initial))
    setShooter(0)
    setHistory([])
  }

  const exitToSetup = () => {
    setPhase('setup')
    setScores([])
    setHistory([])
  }

  // 真正结算：显式传入 上家/下家
  const applyDirect = (
    event: EventType,
    up: number,
    down: number
  ) => {
    const before = scores.slice()
    const after = applyEvent(before, shooter, up, down, event, rules)
    setScores(after)
    setHistory((h) => [...h, { event, shooter, before, after }])
    if (event === 'fanGui') {
      setToast(`${activeNames[down]} 获得自由球`)
    }
  }

  const handleEvent = (event: EventType) => {
    if (scores.length !== count) return
    // 两人局：另一人既是上家也是下家，无需选择
    if (count === 2) {
      const other = (shooter + 1) % 2
      applyDirect(event, other, other)
      return
    }
    // 三人局：每次手动指定上家，另一人即下家
    setPendingEvent(event)
  }

  // 在弹窗中点选上家后结算
  const confirmUp = (up: number) => {
    if (!pendingEvent) return
    const down = activeNames.findIndex((_, i) => i !== shooter && i !== up)
    applyDirect(pendingEvent, up, down)
    setPendingEvent(null)
  }

  const undo = () => {
    setHistory((h) => {
      if (h.length === 0) return h
      const last = h[h.length - 1]
      setScores(last.before)
      setShooter(last.shooter)
      return h.slice(0, -1)
    })
  }

  const bankrupt = scores.findIndex((s) => s <= 0)

  // ---------- 设置页面 ----------
  if (phase === 'setup') {
    return (
      <div className="app">
        <header className="topbar">
          <h1>台球追分计分器</h1>
        </header>
        <main className="setup">
          <section className="card">
            <label className="field-label">参与人数</label>
            <div className="seg">
              <button
                className={count === 2 ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setCount(2)}
              >
                2 人
              </button>
              <button
                className={count === 3 ? 'seg-btn active' : 'seg-btn'}
                onClick={() => setCount(3)}
              >
                3 人
              </button>
            </div>
          </section>

          <section className="card">
            <label className="field-label">玩家昵称</label>
            {Array.from({ length: count }).map((_, i) => (
              <input
                key={i}
                className="text-input"
                value={names[i] ?? ''}
                placeholder={`玩家${i + 1}`}
                onChange={(e) => {
                  const c = names.slice()
                  c[i] = e.target.value
                  setNames(c)
                }}
              />
            ))}
          </section>

          <section className="card">
            <label className="field-label">起始分数</label>
            <input
              className="text-input"
              type="number"
              value={initial}
              onChange={(e) => setInitial(Math.max(0, Number(e.target.value) || 0))}
            />
            <p className="hint">通常采用每人 100 分（一副扑克总分）。</p>
          </section>

          <section className="card">
            <label className="field-label">计分规则</label>
            <div className="rules-preview">
              <span>普胜 +{rules.puSheng}</span>
              <span>小金 +{rules.xiaoJin}</span>
              <span>大金 +{2 * rules.daJin}</span>
              <span>黄金九 +{2 * rules.huangJinJiu}</span>
              <span>黑金 {2 * rules.heiJin}</span>
              <span>犯规 -{rules.fanGui}</span>
            </div>
            <button className="ghost-btn" onClick={() => setShowSettings(true)}>
              自定义分值
            </button>
          </section>

          <button className="primary-btn" onClick={startGame}>
            开始对局
          </button>
        </main>

        {showSettings && (
          <div className="modal-mask" onClick={() => setShowSettings(false)}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
              <h3>自定义分值</h3>
              <RuleInput
                label="普胜（上家赔本家）"
                value={rules.puSheng}
                onChange={(v) => setRules({ ...rules, puSheng: v })}
              />
              <RuleInput
                label="小金（上家赔本家）"
                value={rules.xiaoJin}
                onChange={(v) => setRules({ ...rules, xiaoJin: v })}
              />
              <RuleInput
                label="大金（每人赔本家）"
                value={rules.daJin}
                onChange={(v) => setRules({ ...rules, daJin: v })}
              />
              <RuleInput
                label="黄金九（每人赔本家）"
                value={rules.huangJinJiu}
                onChange={(v) => setRules({ ...rules, huangJinJiu: v })}
              />
              <RuleInput
                label="黑金（本家赔每人）"
                value={rules.heiJin}
                onChange={(v) => setRules({ ...rules, heiJin: v })}
              />
              <RuleInput
                label="犯规（本家给上家）"
                value={rules.fanGui}
                onChange={(v) => setRules({ ...rules, fanGui: v })}
              />
              <div className="modal-actions">
                <button
                  className="ghost-btn"
                  onClick={() => setRules(DEFAULT_RULES)}
                >
                  恢复默认
                </button>
                <button className="primary-btn" onClick={() => setShowSettings(false)}>
                  完成
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ---------- 对局页面 ----------
  return (
    <div className="app">
      <header className="topbar">
        <h1>追分进行中</h1>
        <div className="topbar-actions">
          <button className="icon-btn" onClick={undo} disabled={history.length === 0}>
            撤销
          </button>
          <button className="icon-btn" onClick={() => setShowHistory(true)}>
            记录
          </button>
          <button className="icon-btn" onClick={() => setShowSettings(true)}>
            设置
          </button>
        </div>
      </header>

      {bankrupt >= 0 && (
        <div className="banner">⚠️ {activeNames[bankrupt]} 已破产（分数 ≤ 0）</div>
      )}

      <main className="game">
        <div
          className="scoreboard"
          style={{ gridTemplateColumns: `repeat(${count}, 1fr)` }}
        >
          {activeNames.map((name, i) => {
            const isShooter = i === shooter
            return (
              <button
                key={i}
                className={`player-card${isShooter ? ' active' : ''}${
                  scores[i] <= 0 ? ' out' : ''
                }`}
                onClick={() => setShooter(i)}
              >
                {isShooter && <span className="role-badge">本家</span>}
                <span className="player-name">{name}</span>
                <span className="player-score">{scores[i]}</span>
                <span className="set-shooter">点此设为当前</span>
              </button>
            )
          })}
        </div>

        <p className="turn-hint">
          当前本家：<b>{activeNames[shooter]}</b>（点任意卡片可切换）
        </p>

        <div className="event-grid">
          {EVENT_ORDER.map((ev) => (
            <button
              key={ev}
              className="event-btn"
              style={{ background: EVENT_COLORS[ev] }}
              onClick={() => handleEvent(ev)}
            >
              <span className="event-name">{EVENT_LABELS[ev]}</span>
              <span className="event-desc">{EVENT_DESC[ev]}</span>
            </button>
          ))}
        </div>
      </main>

      <footer className="bottombar">
        <button className="ghost-btn" onClick={newRound}>
          新一局
        </button>
        <button className="ghost-btn" onClick={exitToSetup}>
          退出
        </button>
      </footer>

      {toast && <div className="toast">{toast}</div>}

      {showSettings && (
        <div className="modal-mask" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>设置</h3>
            <div className="modal-actions col">
              <button
                className="ghost-btn"
                onClick={() => {
                  setShowSettings(false)
                  setShowHistory(true)
                }}
              >
                查看记录
              </button>
              <button className="ghost-btn" onClick={newRound}>
                开始新一局
              </button>
              <button
                className="ghost-btn danger"
                onClick={() => {
                  setShowSettings(false)
                  exitToSetup()
                }}
              >
                退出到首页
              </button>
            </div>
            <button className="primary-btn" onClick={() => setShowSettings(false)}>
              关闭
            </button>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="modal-mask" onClick={() => setShowHistory(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>得分记录（{history.length}）</h3>
            <div className="history-list">
              {history.length === 0 && <p className="hint">暂无记录</p>}
              {history
                .slice()
                .reverse()
                .map((h, idx) => {
                  const delta = h.after[h.shooter] - h.before[h.shooter]
                  return (
                    <div className="history-item" key={idx}>
                      <span
                        className="hist-dot"
                        style={{ background: EVENT_COLORS[h.event] }}
                      />
                      <span className="hist-text">
                        {activeNames[h.shooter]} · {EVENT_LABELS[h.event]}
                      </span>
                      <span className={delta >= 0 ? 'hist-up' : 'hist-down'}>
                        {delta >= 0 ? '+' : ''}
                        {delta}
                      </span>
                    </div>
                  )
                })}
            </div>
            <div className="modal-actions">
              <button className="ghost-btn danger" onClick={undo} disabled={history.length === 0}>
                撤销上一步
              </button>
              <button className="primary-btn" onClick={() => setShowHistory(false)}>
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingEvent && (
        <div className="modal-mask" onClick={() => setPendingEvent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>
              {EVENT_LABELS[pendingEvent]} · {EVENT_DESC[pendingEvent]}
            </h3>
            <p className="hint">请选择本次「上家」（另一人自动为下家）</p>
            <div className="modal-actions col">
              {activeNames.map((nm, i) =>
                i !== shooter ? (
                  <button
                    key={i}
                    className="ghost-btn"
                    onClick={() => confirmUp(i)}
                  >
                    {nm}（上家）
                  </button>
                ) : null
              )}
            </div>
            <button
              className="primary-btn"
              onClick={() => setPendingEvent(null)}
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function RuleInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div className="rule-row">
      <span>{label}</span>
      <input
        className="num-input"
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
      />
    </div>
  )
}
