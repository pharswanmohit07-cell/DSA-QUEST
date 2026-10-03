import { useEffect } from 'react'
import type { PointerEvent } from 'react'
import type { TouchDirection } from './scenes/MainScene'
import './touchControls.css'

type TouchControlsProps = {
  onDirectionChange: (direction: TouchDirection, isDown: boolean) => void
  onInteract: () => void
}

const directions: Array<{ direction: TouchDirection; label: string; symbol: string }> = [
  { direction: 'up', label: 'Move up', symbol: '▲' },
  { direction: 'left', label: 'Move left', symbol: '◀' },
  { direction: 'down', label: 'Move down', symbol: '▼' },
  { direction: 'right', label: 'Move right', symbol: '▶' },
]

export function TouchControls({ onDirectionChange, onInteract }: TouchControlsProps) {
  useEffect(
    () => () => {
      for (const { direction } of directions) {
        onDirectionChange(direction, false)
      }
    },
    [onDirectionChange],
  )

  const beginPress = (direction: TouchDirection) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    onDirectionChange(direction, true)
  }

  const endPress = (direction: TouchDirection) => (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onDirectionChange(direction, false)
  }

  const renderDirectionButton = ({
    direction,
    label,
    symbol,
  }: (typeof directions)[number]) => (
    <button
      key={direction}
      type="button"
      className={`touch-dpad-button is-${direction}`}
      aria-label={label}
      onPointerDown={beginPress(direction)}
      onPointerUp={endPress(direction)}
      onPointerCancel={endPress(direction)}
      onLostPointerCapture={() => onDirectionChange(direction, false)}
    >
      {symbol}
    </button>
  )

  return (
    <div className="touch-controls-container" aria-label="Touch controls">
      <div className="touch-dpad" role="group" aria-label="Movement">
        {renderDirectionButton(directions[0])}
        <div className="touch-dpad-row">
          {directions.slice(1).map(renderDirectionButton)}
        </div>
      </div>
      <button
        type="button"
        className="touch-action-button"
        aria-label="Interact or continue dialogue"
        onPointerDown={(event) => {
          event.preventDefault()
          onInteract()
        }}
        onClick={(event) => {
          if (event.detail === 0) {
            onInteract()
          }
        }}
      >
        E
      </button>
    </div>
  )
}
