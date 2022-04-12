import type { NextPage } from 'next'
import { useCallback, useEffect, useRef, useState } from 'react'
import styles from '../styles/Home.module.css'

interface PointData {
  x: number
  y: number
  dragrable?: boolean
  selected?: boolean
}

const Home: NextPage = () => {
  const radius = 5
  const [history, setHistory] = useState<PointData[]>([])
  const [historyPosition, setHistoryPosition] = useState(2)
  const [points, setPoints] = useState<PointData[]>([])

  const CanvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    console.log(history)

    setHistoryPosition(history.length)
  }, [history])

  const onUndo = useCallback(() => {
    if (historyPosition > 0) {
      setPoints([
        points[0],
        ...history
          .slice(0, historyPosition - 1)
          .sort((a, b) => (a.x > b.x ? 1 : -1)),
        points[points.length - 1]
      ])

      setHistoryPosition(historyPosition - 1)
    }
  }, [history, historyPosition, points])

  const onRedo = useCallback(() => {
    if (historyPosition + 1 <= history.length) {
      setPoints([
        points[0],
        ...history
          .slice(0, historyPosition + 1)
          .sort((a, b) => (a.x > b.x ? 1 : -1)),
        points[points.length - 1]
      ])

      setHistoryPosition(historyPosition + 1)
    }
  }, [history, historyPosition, points])

  useEffect(() => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement

    setPoints([
      {
        x: 0,
        y: canvas.height / 2
      },
      {
        x: canvas.width,
        y: canvas.height / 2
      }
    ])
  }, [])

  useEffect(() => {
    const canvas = document.getElementById('canvas') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')

    drawPoints()
    drawSpline()

    function clear() {
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }

    function drawPoints() {
      if (!ctx) return
      points.forEach(({ x, y }, i) => {
        if (i !== 0 && i !== points.length - 1) {
          ctx.beginPath()
          ctx.arc(x, y, radius, 0, 2 * Math.PI)
          ctx.fillStyle = '#335B89'
          ctx.fill()
          ctx.closePath()
        }
      })
    }

    function addPoint(x: number, y: number, isDragrable?: boolean) {
      if (!ctx) return
      if (points.length === 7) return
      const newPoints = [...points]
      const ei = newPoints.findIndex(({ x: px, y: py }) => px > x)

      newPoints.splice(ei, 0, { x, y, dragrable: isDragrable })

      setHistory([
        ...history.slice(0, historyPosition),
        { x, y, dragrable: isDragrable }
      ])
      setPoints(newPoints)
    }

    function dista(arr: IArguments, i: number, j: number) {
      return Math.sqrt(
        Math.pow(arr[2 * i] - arr[2 * j], 2) +
          Math.pow(arr[2 * i + 1] - arr[2 * j + 1], 2)
      )
    }

    // return vector from i to j where i and j are indexes pointing into an array of points.
    function va(arr: IArguments, i: number, j: number) {
      return [arr[2 * j] - arr[2 * i], arr[2 * j + 1] - arr[2 * i + 1]]
    }

    function ctlpts(
      x1: number,
      y1: number,
      x2: number,
      y2: number,
      x3: number,
      y3: number
    ) {
      var t = 0.4
      var v = va(arguments, 0, 2)
      var d01 = dista(arguments, 0, 1)
      var d12 = dista(arguments, 1, 2)
      var d012 = d01 + d12

      return [
        x2 - (v[0] * t * d01) / d012,
        y2 - (v[1] * t * d01) / d012,
        x2 + (v[0] * t * d12) / d012,
        y2 + (v[1] * t * d12) / d012
      ]
    }

    function drawCurvedPath(cps: number[], pts: typeof points) {
      if (!ctx) return

      var len = pts.length // number of points

      if (len <= 1) return
      if (len == 2) {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        ctx.lineTo(pts[1].x, pts[1].y)
        ctx.strokeStyle = '#335B89'
        ctx.stroke()
      } else {
        ctx.beginPath()
        ctx.moveTo(pts[0].x, pts[0].y)
        // from point 0 to point 1 is a quadratic
        ctx.quadraticCurveTo(cps[0], cps[1], pts[1].x, pts[1].y)
        // for all middle points, connect with bezier

        for (var i = 2; i < len - 1; i += 1) {
          ctx.bezierCurveTo(
            cps[(2 * (i - 1) - 1) * 2],
            cps[(2 * (i - 1) - 1) * 2 + 1],
            cps[2 * (i - 1) * 2],
            cps[2 * (i - 1) * 2 + 1],
            pts[i].x,
            pts[i].y
          )
        }

        ctx.quadraticCurveTo(
          cps[(2 * (i - 1) - 1) * 2],
          cps[(2 * (i - 1) - 1) * 2 + 1],
          pts[i].x,
          pts[i].y
        )
        ctx.stroke()
      }
    }

    function drawSpline() {
      var cps: number[] = []

      for (var i = 0; i < points.length - 1; i++) {
        var j = 0
        for (var _ in points[i]) {
          cps = cps.concat(
            ctlpts(
              points[2 * i + j]?.x,
              points[2 * i + j]?.y,
              points[2 * i + 1 + j]?.x,
              points[2 * i + 1 + j]?.y,
              points[2 * i + 2 + j]?.x,
              points[2 * i + 2 + j]?.y
            )
          )

          j++
        }
      }

      clear()
      drawCurvedPath(cps, points)
      drawPoints()
    }

    function mousedown(e: MouseEvent) {
      let check = false
      points.forEach(({ x, y }, i) => {
        if (
          e.offsetX > x - radius * 2 &&
          e.offsetX < x + radius * 2 &&
          e.offsetY > y - radius * 2 &&
          e.offsetY < y + radius * 2
        ) {
          points[i].selected = true
          points[i].dragrable = true
          points[i].x = e.offsetX
          points[i].y = e.offsetY
          check = true
        }
      })

      if (!check) {
        drawPoints()
        addPoint(e.offsetX, e.offsetY, true)
        drawSpline()
      }
    }

    function mousemove(e: MouseEvent) {
      points.forEach((_, i) => {
        if (points[i].dragrable) {
          points[i].x = e.offsetX
          points[i].y = e.offsetY

          drawSpline()
        }
      })
    }

    function mouseup(e: MouseEvent) {
      points.forEach(({ x, y }, i) => {
        if (points[i].dragrable) {
          points[i].dragrable = false
          points[i].x = e.offsetX
          points[i].y = e.offsetY

          drawSpline()
        }
      })
    }

    canvas.addEventListener('mouseup', mouseup)
    canvas.addEventListener('mousemove', mousemove)
    canvas.addEventListener('mousedown', mousedown)

    return () => {
      canvas.removeEventListener('mouseup', mouseup)
      canvas.removeEventListener('mousemove', mousemove)
      canvas.removeEventListener('mousedown', mousedown)
    }
  }, [history, historyPosition, points])

  return (
    <>
      <button>Delete</button>
      <button disabled={historyPosition === 0} onClick={onUndo}>
        Undo
      </button>
      <button disabled={historyPosition === history.length} onClick={onRedo}>
        Redo
      </button>
      <canvas ref={CanvasRef} id="canvas" className={styles.canvas}></canvas>
    </>
  )
}

export default Home
