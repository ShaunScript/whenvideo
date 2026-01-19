"use client"

import * as React from "react"
import Link from "next/link"
import { Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function GamePage() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [score, setScore] = React.useState(0)
  const [highScore, setHighScore] = React.useState(0)
  const [highScoreName, setHighScoreName] = React.useState("")
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
  })

  React.useEffect(() => {
    const savedData = localStorage.getItem("flappyHighScoreData")
    if (savedData) {
      const parsed = JSON.parse(savedData)
      setHighScore(parsed.score || 0)
      setHighScoreName(parsed.name || "")
    }
  }, [])

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

  const handleNameSubmit = () => {
    if (tempName.trim()) {
      const highScoreData = {
        score: highScore,
        name: tempName.trim(),
      }
      setHighScoreName(tempName.trim())
      localStorage.setItem("flappyHighScoreData", JSON.stringify(highScoreData))
      setShowNameInput(false)
      setTempName("")
    }
  }

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const GRAVITY = 0.15
    const JUMP_STRENGTH = -5
    const PIPE_WIDTH = 50
    const PIPE_GAP = 180
    const PIPE_SPEED = 2
    const BIRD_SIZE = 30
    const PIPE_SPACING = 350

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
      }
      setScore(0)
      setGameOver(false)
      setExplosionParticles([])
      setShake(false)
    }

    const jump = () => {
      if (!gameStarted) {
        setGameStarted(true)
        resetGame()
      }
      if (gameOver) {
        resetGame()
        setGameStarted(true)
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

    const gameLoop = () => {
      if (!ctx || !canvas) return

      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const bird = gameStateRef.current.bird
      const pipes = gameStateRef.current.pipes

      if (gameStarted && !gameOver) {
        bird.velocity += GRAVITY
        bird.y += bird.velocity

        const lastPipe = pipes[pipes.length - 1]
        if (lastPipe && lastPipe.x < canvas.width - PIPE_SPACING) {
          const gapY = Math.random() * (canvas.height - PIPE_GAP - 100) + 50
          pipes.push({ x: canvas.width, gapY })
        }

        for (let i = pipes.length - 1; i >= 0; i--) {
          const pipe = pipes[i]
          pipe.x -= PIPE_SPEED

          const birdLeft = 100 - BIRD_SIZE / 2
          const birdRight = 100 + BIRD_SIZE / 2
          const birdTop = bird.y - BIRD_SIZE / 2
          const birdBottom = bird.y + BIRD_SIZE / 2

          if (birdRight > pipe.x && birdLeft < pipe.x + PIPE_WIDTH) {
            if (birdTop < pipe.gapY || birdBottom > pipe.gapY + PIPE_GAP) {
              triggerExplosion(100, bird.y)
              setGameOver(true)
              if (gameStateRef.current.score > highScore) {
                setHighScore(gameStateRef.current.score)
                setShowNameInput(true)
              }
              return
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
          triggerExplosion(100, bird.y)
          setGameOver(true)
          if (gameStateRef.current.score > highScore) {
            setHighScore(gameStateRef.current.score)
            setShowNameInput(true)
          }
          return
        }
      }

      if (!gameOver) {
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

      if (gameOver && explosionParticles.length > 0) {
        ctx.fillStyle = "#dc2626"
        for (const particle of explosionParticles) {
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
  }, [gameStarted, gameOver, highScore, explosionParticles])

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

      <div className="flex items-center justify-center gap-8 w-full">
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

        {/* High Score - Right Side */}
        <div className="text-center flex-shrink-0">
          <p className="text-gray-400 text-sm mb-2">High Score</p>
          <p className="text-red-600 text-4xl font-bold">{highScore}</p>
          {highScoreName && <p className="text-white text-lg mt-2">{highScoreName}</p>}
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
