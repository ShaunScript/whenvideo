"use client"

import * as React from "react"
import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function GamePage() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const explosionParticlesRef = React.useRef<{ x: number; y: number; vx: number; vy: number; life: number }[]>([])
  const gameStartedRef = React.useRef(false)
  const gameOverRef = React.useRef(false)
  const handleGameOverRef = React.useRef<(finalScore: number) => void>(() => {})
  const [score, setScore] = React.useState(0)
  const [highScore, setHighScore] = React.useState(0)
  const [highScoreName, setHighScoreName] = React.useState("")
  const [leaderboard, setLeaderboard] = React.useState<{ name: string; score: number }[]>([])
  const [pendingLeaderboardScore, setPendingLeaderboardScore] = React.useState<number | null>(null)
  const [savedPlayerName, setSavedPlayerName] = React.useState("")
  const [isEditingName, setIsEditingName] = React.useState(false)
  const [editNameValue, setEditNameValue] = React.useState("")
  const [showNameInput, setShowNameInput] = React.useState(false)
  const [tempName, setTempName] = React.useState("")
  const [gameStarted, setGameStarted] = React.useState(false)
  const [gameOver, setGameOver] = React.useState(false)
  const [shake, setShake] = React.useState(false)
  const [explosionParticles, setExplosionParticles] = React.useState<
    { x: number; y: number; vx: number; vy: number; life: number }[]
  >([])
  const gameStateRef = React.useRef({
    bird: { y: 250, velocity: 0 },
    pipes: [] as { x: number; gapY: number; scored?: boolean }[],
    score: 0,
    animationId: 0,
    lastTime: 0,
  })

  const loadHighScore = React.useCallback(async () => {
    try {
      const savedData = localStorage.getItem("flappyHighScoreData")
      if (savedData) {
        const parsed = JSON.parse(savedData)
        setHighScore(parsed.score || 0)
        setHighScoreName(parsed.name || "")
      }
    } catch (err) {
      console.error("Failed to load high score from localStorage:", err)
    }
  }, [])

  const loadLeaderboard = React.useCallback(async () => {
    try {
      const res = await fetch("/api/game/leaderboard", { cache: "no-store" })
      if (res.ok) {
        const json = await res.json()
        const data = Array.isArray(json?.data) ? json.data : []
        setLeaderboard(data)
        try {
          localStorage.setItem("flappyLeaderboardLocal", JSON.stringify(data))
        } catch {
          // ignore storage errors
        }
        return
      }
    } catch (err) {
      console.error("Failed to load leaderboard from API:", err)
    }
    try {
      const cached = localStorage.getItem("flappyLeaderboardLocal")
      if (cached) {
        const parsed = JSON.parse(cached)
        if (Array.isArray(parsed)) {
          setLeaderboard(parsed)
          return
        }
      }
    } catch {
      // ignore storage errors
    }
    setLeaderboard([])
  }, [])

  React.useEffect(() => {
    loadHighScore()
    loadLeaderboard()
  }, [loadHighScore, loadLeaderboard])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    const stored = window.localStorage.getItem("flappyPlayerName")
    if (stored) {
      setSavedPlayerName(stored)
      setEditNameValue(stored)
    }
  }, [])

  React.useEffect(() => {
    explosionParticlesRef.current = explosionParticles
  }, [explosionParticles])

  React.useEffect(() => {
    gameStartedRef.current = gameStarted
  }, [gameStarted])

  React.useEffect(() => {
    gameOverRef.current = gameOver
  }, [gameOver])

  const persistHighScore = async (score: number, name: string) => {
    const payload = { score, name }
    try {
      localStorage.setItem("flappyHighScoreData", JSON.stringify(payload))
    } catch {
      // ignore storage errors
    }
  }

  const submitLeaderboardScore = React.useCallback(
    async (scoreValue: number, name: string) => {
      if (scoreValue <= 0) return
      try {
        const res = await fetch("/api/game/leaderboard", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ score: scoreValue, name }),
        })
        if (res.ok) {
          const json = await res.json()
          const data = Array.isArray(json?.data) ? json.data : []
          if (data.length > 0) {
            setLeaderboard(data)
            try {
              localStorage.setItem("flappyLeaderboardLocal", JSON.stringify(data))
            } catch {
              // ignore storage errors
            }
            return
          }
        }
        await loadLeaderboard()
      } catch (err) {
        console.error("Failed to submit leaderboard score:", err)
        const entry = { name, score: scoreValue, ts: Date.now() }
        setLeaderboard((prev) => {
          const merged = [entry, ...prev]
            .filter((item) => Number.isFinite(item.score) && item.score > 0)
            .sort((a, b) => b.score - a.score || b.ts - a.ts)
            .slice(0, 10)
          try {
            localStorage.setItem("flappyLeaderboardLocal", JSON.stringify(merged))
          } catch {
            // ignore storage errors
          }
          return merged
        })
      }
    },
    [loadLeaderboard],
  )

  const triggerExplosion = (x: number, y: number) => {
    const particles = []
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20
      particles.push({
        x,
        y,
        vx: Math.cos(angle) * (3 + Math.random() * 2),
        vy: Math.sin(angle) * (3 + Math.random() * 2),
        life: 1,
      })
    }
    setExplosionParticles(particles)
    setShake(true)
    setTimeout(() => setShake(false), 300)
  }

  const handleNameSubmit = async () => {
    if (tempName.trim()) {
      const name = tempName.trim()
      const highScoreData = {
        score: highScore,
        name,
      }
      setHighScoreName(name)
      await persistHighScore(highScoreData.score, highScoreData.name)
      const scoreToSubmit = pendingLeaderboardScore ?? highScoreData.score
      await submitLeaderboardScore(scoreToSubmit, name)
      if (typeof window !== "undefined") {
        window.localStorage.setItem("flappyPlayerName", name)
      }
      setSavedPlayerName(name)
      setEditNameValue(name)
      setPendingLeaderboardScore(null)
      setShowNameInput(false)
      setTempName("")
    }
  }

  const handleSavePreferredName = () => {
    const name = editNameValue.trim().slice(0, 20)
    if (!name) return
    if (typeof window !== "undefined") {
      window.localStorage.setItem("flappyPlayerName", name)
    }
    setSavedPlayerName(name)
    setHighScoreName(name)
    setIsEditingName(false)
  }

  const handleGameOver = React.useCallback(
    (finalScore: number) => {
      setGameOver(true)
      if (finalScore > highScore) {
        setHighScore(finalScore)
        setShowNameInput(true)
        setPendingLeaderboardScore(finalScore)
      } else {
        submitLeaderboardScore(finalScore, savedPlayerName || highScoreName || "Anonymous")
      }
    },
    [highScore, highScoreName, savedPlayerName, submitLeaderboardScore],
  )

  React.useEffect(() => {
    handleGameOverRef.current = handleGameOver
  }, [handleGameOver])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const GRAVITY = 620
    const JUMP_STRENGTH = -340
    const PIPE_WIDTH = 50
    const PIPE_GAP = 170
    const PIPE_SPEED = 170
    const SPEED_INCREMENT = 10
    const MAX_SPEED = 480
    const BIRD_SIZE = 30
    const PIPE_SPACING = 300

    const resetGame = () => {
      const gapY1 = Math.random() * (canvas.height - PIPE_GAP - 100) + 50
      const gapY2 = Math.random() * (canvas.height - PIPE_GAP - 100) + 50
      gameStateRef.current = {
        bird: { y: 250, velocity: 0 },
        pipes: [
          { x: 700, gapY: gapY1 },
          { x: 700 + PIPE_SPACING, gapY: gapY2 },
        ],
        score: 0,
        animationId: 0,
        lastTime: performance.now(),
      }
      setScore(0)
      setGameOver(false)
      gameOverRef.current = false
      setShowNameInput(false)
      setPendingLeaderboardScore(null)
      setExplosionParticles([])
      setShake(false)
    }

    const jump = () => {
      if (!gameStartedRef.current) {
        setGameStarted(true)
        gameStartedRef.current = true
        resetGame()
      }
      if (gameOverRef.current) {
        resetGame()
        setGameStarted(true)
        gameStartedRef.current = true
        return
      }
      gameStateRef.current.bird.velocity = JUMP_STRENGTH
    }

    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault()
        jump()
      }
    }

    const handleClick = (e: MouseEvent) => {
      e.preventDefault()
      jump()
    }

    const gameLoop = (timestamp: number) => {
      if (!ctx || !canvas) return

      const lastTime = gameStateRef.current.lastTime || timestamp
      const deltaMs = Math.min(50, Math.max(0, timestamp - lastTime))
      const dt = deltaMs / 1000
      gameStateRef.current.lastTime = timestamp

      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const bird = gameStateRef.current.bird
      const pipes = gameStateRef.current.pipes

      if (gameStartedRef.current && !gameOverRef.current) {
        bird.velocity += GRAVITY * dt
        bird.y += bird.velocity * dt

        const lastPipe = pipes[pipes.length - 1]
        if (lastPipe && lastPipe.x < canvas.width - PIPE_SPACING) {
          const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50
          pipes.push({ x: canvas.width, gapY })
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
          const pipe = pipes[i]
          const speed = Math.min(MAX_SPEED, PIPE_SPEED + gameStateRef.current.score * SPEED_INCREMENT)
          pipe.x -= speed * dt

          const birdLeft = 100 - BIRD_SIZE / 2
          const birdRight = 100 + BIRD_SIZE / 2
          const birdTop = bird.y - BIRD_SIZE / 2
          const birdBottom = bird.y + BIRD_SIZE / 2

          if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
            if (birdTop < pipe.gapY || birdBottom > pipe.gapY + PIPE_GAP) {
              if (!gameOverRef.current) {
                triggerExplosion(100, bird.y)
                handleGameOverRef.current(gameStateRef.current.score)
              }
            }
          }

          if (pipe.x + PIPE_WIDTH < 100 && !pipe.scored) {
            pipe.scored = true
            gameStateRef.current.score++
            setScore(gameStateRef.current.score)
          }

          if (pipe.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1)
          }
        }

        if (bird.y - BIRD_SIZE / 2 < 0 || bird.y + BIRD_SIZE / 2 > canvas.height) {
          if (!gameOverRef.current) {
            triggerExplosion(100, bird.y)
            handleGameOverRef.current(gameStateRef.current.score)
          }
        }
      }

      if (!gameOverRef.current) {
        ctx.fillStyle = "#dc2626"
        ctx.beginPath()
        ctx.arc(100, bird.y, BIRD_SIZE / 2, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.fillStyle = "#ffffff"
      for (const pipe of pipes) {
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.gapY)
        ctx.fillRect(pipe.x, pipe.gapY + PIPE_GAP, PIPE_WIDTH, canvas.height - (pipe.gapY + PIPE_GAP))
      }

      const currentParticles = explosionParticlesRef.current
      if (gameOverRef.current && currentParticles.length > 0) {
        ctx.fillStyle = "#dc2626"
        for (const particle of currentParticles) {
          ctx.globalAlpha = particle.life
          ctx.beginPath()
          ctx.arc(particle.x, particle.y, 3, 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }

      gameStateRef.current.animationId = requestAnimationFrame(gameLoop)
    }

    window.addEventListener("keydown", handleKeyPress)
    canvas.addEventListener("click", handleClick)

    gameStateRef.current.animationId = requestAnimationFrame(gameLoop)

    return () => {
      window.removeEventListener("keydown", handleKeyPress)
      canvas.removeEventListener("click", handleClick)
      if (gameStateRef.current.animationId) {
        cancelAnimationFrame(gameStateRef.current.animationId)
      }
    }
  }, [])

  React.useEffect(() => {
    if (explosionParticles.length === 0) return

    const interval = setInterval(() => {
      setExplosionParticles((prev) =>
        prev
          .map((p) => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
            vy: p.vy + 0.2,
            life: p.life - 0.02,
          }))
          .filter((p) => p.life > 0),
      )
    }, 16)

    return () => clearInterval(interval)
  }, [explosionParticles.length])

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 relative">
      <div className="absolute top-4 left-4">
        <Link href="/">
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10">
            <Home className="h-5 w-5" />
          </Button>
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row items-center justify-center gap-8 w-full">
        {/* Current Score - Left Side */}
        <div className="text-center flex-shrink-0">
          <p className="text-gray-400 text-sm mb-2">Score</p>
          <p className="text-white text-4xl font-bold">{score}</p>
        </div>

        {/* Game Canvas - Center */}
        <div className={`relative ${shake ? "animate-shake" : ""}`}>
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="border-2 border-gray-700 rounded-lg max-w-full cursor-pointer"
            style={{ maxWidth: "100%", height: "auto" }}
          />

          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg pointer-events-none">
              <div className="text-center">
                <p className="text-white text-2xl mb-4">Click or Press SPACE</p>
                <p className="text-gray-400">to start playing</p>
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 rounded-lg pointer-events-none">
              <div className="text-center">
                <p className="text-red-600 text-5xl font-bold mb-4">GAME OVER</p>
                <p className="text-white text-xl">Click or press SPACE to restart</p>
              </div>
            </div>
          )}
        </div>

        {/* Leaderboard - Right Side */}
        <div className="w-full max-w-xs flex-shrink-0">
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-lg p-4 shadow-lg">
            <div className="flex items-center justify-between mb-3">
              <p className="text-gray-300 text-sm font-semibold">Leaderboard</p>
              <div className="text-right">
                <p className="text-[11px] text-gray-500">Your Best</p>
                <p className="text-red-500 text-sm font-semibold">
                  {highScoreName ? `${highScoreName} — ${highScore}` : highScore}
                </p>
              </div>
            </div>
            <div className="mb-3 rounded-md border border-zinc-800 bg-black/40 p-2">
              <p className="text-[11px] text-gray-500 mb-1">Your username</p>
              {isEditingName ? (
                <div className="flex gap-2">
                  <Input
                    value={editNameValue}
                    onChange={(e) => setEditNameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleSavePreferredName()
                    }}
                    className="bg-black border-zinc-700 text-white text-sm h-8"
                    placeholder="Enter name"
                    maxLength={20}
                  />
                  <Button onClick={handleSavePreferredName} className="bg-red-600 hover:bg-red-700 h-8 px-3 text-xs">
                    Save
                  </Button>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-white truncate">{savedPlayerName || "Anonymous"}</p>
                  <Button
                    onClick={() => setIsEditingName(true)}
                    variant="secondary"
                    className="h-7 px-2 text-[11px]"
                  >
                    Edit
                  </Button>
                </div>
              )}
            </div>
            {leaderboard.length === 0 ? (
              <p className="text-gray-400 text-sm">No scores yet.</p>
            ) : (
              <ol className="space-y-2">
                {leaderboard.map((entry, index) => (
                  <li
                    key={`${entry.name}-${entry.score}-${index}`}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-400 w-5">{index + 1}.</span>
                    <span className="text-white truncate flex-1 ml-2">{entry.name}</span>
                    <span className="text-red-500 font-semibold ml-3">{entry.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </div>
      </div>

      {showNameInput && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-900 p-6 rounded-lg border border-gray-700 z-10">
          <p className="text-white text-lg mb-3 text-center">New High Score!</p>
          <p className="text-gray-400 text-sm mb-4 text-center">Enter your name:</p>
          <div className="flex gap-2">
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleNameSubmit()
                }
              }}
              placeholder="Your name"
              className="bg-gray-800 border-gray-700 text-white"
              maxLength={20}
              autoFocus
            />
            <Button onClick={handleNameSubmit} className="bg-red-600 hover:bg-red-700">
              Save
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes shake {
          0%,
          100% {
            transform: translate(0, 0);
          }
          10%,
          30%,
          50%,
          70%,
          90% {
            transform: translate(-5px, 0);
          }
          20%,
          40%,
          60%,
          80% {
            transform: translate(5px, 0);
          }
        }
        .animate-shake {
          animation: shake 0.3s;
        }
      `}</style>
    </div>
  )
}
