

import {PropsWithChildren, useEffect, useRef, useState, FunctionComponent, RefObject, MutableRefObject} from "react"

interface MasonryLayoutRefType {
  layout: () => void
}
interface MasonryLayoutProps {
  justifyContainer?: 'flex-start' | 'center' | 'flex-end'
  animate?: string
  layoutThrottle?: number
  gap?: number
  forwardedRef?: MutableRefObject<any>
}
interface StylesStateType {
  visibility: 'hidden' | 'visible'
  containerWidth: null | number
  containerHeight: null | number
}
type SettingsType = Required<Omit<MasonryLayoutProps, 'forwardedRef' | 'animate'>> & {animate: MasonryLayoutProps['animate']}

export type {MasonryLayoutRefType}

const style = (node: HTMLElement, styles: {[key: string]: string}) => Object.keys(styles).forEach(style => node.style[style as any] = styles[style])
const px = (str: string) => str + 'px'
const getNodeWidth = (node: HTMLElement) => node.offsetWidth
const getNodeHeight = (node: HTMLElement) => node.offsetHeight

const place = (lowestNode: ReturnType<typeof getLowestNode>, node: HTMLElement, gap: number) => {
  const {left, bottom} = lowestNode.node.dataset
  const nodeHeight = getNodeHeight(node)
  const nodeTop = Number(bottom) + gap
  node.dataset.left = String(left)
  node.dataset.bottom = String(nodeTop + nodeHeight)
  style(node, {top: px(String(nodeTop)), left: px(left!)})
}

const redefineBottomElements = (bottomNodes: HTMLElement[], lowestNode: ReturnType<typeof getLowestNode>, placeNode: HTMLElement) => {
  return bottomNodes.splice(lowestNode.lowestIndex, 1, placeNode)
}

const getLowestNode = (nodes: HTMLElement[]) => {
  let lowest = nodes[0] as HTMLElement
  let lowestIndex = 0
  for (let i = 0; i < nodes.length - 1; i++) {
    const nextNodeIndex = i + 1
    const nextNode = nodes[nextNodeIndex] as HTMLElement
    if (Number(nextNode.dataset.bottom) < Number(lowest.dataset.bottom)) {
      lowest = nextNode
      lowestIndex = nextNodeIndex
    }
  }
  return {node: lowest, lowestIndex}
}

const getHightestNode = (nodes: HTMLElement[]) => {
  let highest = nodes[0] as HTMLElement
  let highestIndex = 0
  for (let i = 0; i < nodes.length - 1; i++) {
    const nextNodeIndex = i + 1
    const nextNode = nodes[nextNodeIndex] as HTMLElement
    if (Number(nextNode.dataset.bottom) > Number(highest.dataset.bottom)) {
      highest = nextNode
      highestIndex = nextNodeIndex
    }
  }
  return {node: highest, highestIndex}
}

const layoutElements = function(settings: SettingsType, wrapperRef: RefObject<HTMLDivElement>, containerRef: RefObject<HTMLDivElement>, setStyles: (fn: (styles: StylesStateType) => StylesStateType) => any) {
  const gap = settings.gap
  const [wrapper, container] = [wrapperRef.current!, containerRef.current!]
  const children = container.children
  const replaceList = []
  let bottomElements = []
  let accumulatedOffset = 0
  let containerWidth = 0
  for (let i = 0; i < children.length; i++) {
    const child = children.item(i) as HTMLElement
    const childWidth = getNodeWidth(child)
    const childHeight = getNodeHeight(child)
    const offset = childWidth + gap
    if (child.dataset.masonry !== 'masonry') {
      style(child, {position: 'absolute', transition: settings.animate ? 'all ' + settings.animate : 'unset'})
    }
    child.dataset.left = String(accumulatedOffset)
    child.dataset.bottom = String(childHeight)
    child.dataset.masonry = 'masonry'
    accumulatedOffset = accumulatedOffset + offset
    if (accumulatedOffset - gap > getNodeWidth(wrapper)) {
      if (i === 0) {
        bottomElements[bottomElements.length] = child
        containerWidth = childWidth
        continue
      }
      replaceList[replaceList.length] = child
    }
    else {
      style(child, {top: px('0'), left: px(String(accumulatedOffset - offset))})
      bottomElements[bottomElements.length] = child
      containerWidth = accumulatedOffset - gap
    }
  }
  let shiftedNode = undefined
  while (shiftedNode = replaceList.shift()) {
    const lowest = getLowestNode(bottomElements)
    place(lowest, shiftedNode, gap)
    redefineBottomElements(bottomElements, lowest, shiftedNode)
  }
  const {node} = getHightestNode(bottomElements)
  setStyles(styles => ({
    visibility: 'visible',
    containerWidth: containerWidth,
    containerHeight: Number(node.dataset.bottom)
  }))
}

const defineContainerStyle = (styles: StylesStateType, settings: SettingsType) => {
  const hasContainerSize = typeof styles.containerWidth === 'number' && typeof styles.containerHeight === 'number'
  return {
    position: 'relative' as const,
    width: hasContainerSize ? px(String(styles.containerWidth)) : 'auto',
    height: hasContainerSize ? px(String(styles.containerHeight)) : 'auto',
    transition: settings.animate ? 'all ' + settings.animate : 'unset'
  }
}
const defineWrapperStyle = (styles: StylesStateType, settings: SettingsType) => {
  return {
    visibility: styles.visibility,
    display: 'flex',
    justifyContent: settings.justifyContainer
  }
}


const assignResizeEventHandler = function (layout: Function, throttle: number) {
  let timeoutId: Parameters<typeof clearTimeout>[0] = undefined
  let resizeFn: any = undefined
  window.addEventListener('resize', resizeFn = () => {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(layout, throttle)
  })
  return () => {
    clearTimeout(timeoutId)
    window.removeEventListener('resize', resizeFn)
  }
}

const MasonryLayout: FunctionComponent<PropsWithChildren<MasonryLayoutProps>> = ({children, forwardedRef, ...props}) => {
  const wrapperRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [styles, setStyles] = useState<StylesStateType>({
    visibility: 'hidden',
    containerWidth: null,
    containerHeight: null
  })
  const settings = useRef<SettingsType>({
    justifyContainer: props.justifyContainer ?? 'flex-start',
    gap: props.gap ?? 10,
    layoutThrottle: props.layoutThrottle ?? 250,
    animate: props.animate
  })
  const layout = layoutElements.bind(null, settings.current, wrapperRef, containerRef, setStyles)

  if (forwardedRef) forwardedRef.current = {layout}
  
  useEffect(layout, [children])
  useEffect(assignResizeEventHandler.bind(null, layout, settings.current.layoutThrottle), [])

  return (
    <div ref={wrapperRef} style={defineWrapperStyle(styles, settings.current)}>
      <div ref={containerRef} style={defineContainerStyle(styles, settings.current)}>
        {children}
      </div>
    </div>
  )
}

export default MasonryLayout




