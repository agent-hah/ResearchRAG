declare module 'react-draggable' {
  import { ComponentType, ReactElement } from 'react'

  export interface DraggableData {
    node: HTMLElement
    x: number
    y: number
    deltaX: number
    deltaY: number
    lastX: number
    lastY: number
  }

  export interface DraggableProps {
    axis?: 'both' | 'x' | 'y' | 'none'
    bounds?: string | { left?: number; top?: number; right?: number; bottom?: number } | false
    defaultClassName?: string
    defaultClassNameDragging?: string
    defaultClassNameDragged?: string
    defaultPosition?: { x: number; y: number }
    position?: { x: number; y: number }
    positionOffset?: { x: number | string; y: number | string }
    scale?: number
    onStart?: (e: MouseEvent, data: DraggableData) => void | false
    onDrag?: (e: MouseEvent, data: DraggableData) => void | false
    onStop?: (e: MouseEvent, data: DraggableData) => void | false
    onMouseDown?: (e: MouseEvent) => void
    handle?: string
    cancel?: string
    disabled?: boolean
    enableUserSelectHack?: boolean
    offsetParent?: HTMLElement
    grid?: [number, number]
    children?: ReactElement
  }

  const Draggable: ComponentType<DraggableProps>
  export default Draggable
}
