import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/**
 * Учебный контент — это JSX: одна ошибка рендера без boundary уронила бы всё
 * приложение белым экраном (внутри Telegram это выглядит как «игра умерла»).
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error) {
    console.error('ошибка рендера:', error)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="level-done">
        <div className="level-done-emoji">💥</div>
        <h2>Что-то сломалось</h2>
        <p className="mut">Прогресс сохранён — перезапусти приложение.</p>
        <button className="btn primary" onClick={() => location.reload()}>
          Перезагрузить
        </button>
        <details className="mut">
          <summary>Детали для баг-репорта</summary>
          <pre>{this.state.error.message}</pre>
        </details>
      </div>
    )
  }
}
