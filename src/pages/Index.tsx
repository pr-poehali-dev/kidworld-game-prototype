import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const STYLES = [
  { id: "minecraft", name: "Minecraft", emoji: "⛏️", color: "#5B9E35", bg: "#1a3d0f" },
  { id: "roblox", name: "Roblox", emoji: "🎮", color: "#E52727", bg: "#0d1a3d" },
  { id: "toca", name: "Toca Boca", emoji: "🌸", color: "#FF6BB3", bg: "#3d0d1a" },
  { id: "galaxy", name: "Galaxy Wars", emoji: "🚀", color: "#9B5DE5", bg: "#050520" },
];

export default function Index() {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 600);
    return () => clearInterval(id);
  }, []);

  const cursor = tick % 2 === 0 ? "█" : " ";

  return (
    <div className="min-h-screen bg-black font-rubik overflow-hidden flex flex-col relative">
      {/* Stars */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {Array.from({ length: 50 }).map((_, i) => (
          <div key={i} className="absolute rounded-full bg-white animate-star-twinkle"
            style={{ width: "1px", height: "1px", top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`, animationDuration: `${1.5 + Math.random() * 2}s` }} />
        ))}
      </div>

      {/* CRT scanlines */}
      <div className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 4px)" }} />

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 gap-8">

        {/* Logo */}
        <div className="text-center select-none">
          <div className="font-pixel text-3xl md:text-5xl animate-pixel-flicker mb-2"
            style={{ color: "#FFD93D", textShadow: "4px 4px 0 #B8860B, 0 0 30px #FFD93D88" }}>
            KID WORLD
          </div>
          <div className="font-pixel text-[8px] tracking-[0.5em] text-gray-500 mt-3">
            ДЕТСКИЙ ИГРОВОЙ МИР{cursor}
          </div>
        </div>

        {/* Pixel divider */}
        <div className="flex gap-1">
          {["🟨","⬜","🟨","⬜","🟨","⬜","🟨","⬜","🟨","⬜","🟨"].map((b, i) => (
            <span key={i} style={{ fontSize: "8px" }}>{b}</span>
          ))}
        </div>

        {/* Description */}
        <div className="max-w-sm text-center font-rubik text-gray-400 text-sm leading-relaxed px-2">
          Выбери стиль игры, управляй персонажем и меняй мир голосом или текстом через ИИ
        </div>

        {/* Style previews */}
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
          {STYLES.map((s) => (
            <div key={s.id} className="rounded-lg overflow-hidden cursor-pointer"
              style={{ border: `1px solid ${s.color}66`, background: s.bg }}
              onClick={() => navigate(`/game/${s.id}`)}>
              <div className="p-3 flex items-center gap-2">
                <span className="text-xl">{s.emoji}</span>
                <span className="font-pixel text-[7px]" style={{ color: s.color }}>{s.name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <button
          onClick={() => navigate("/game")}
          className="relative px-8 py-4 font-pixel text-[11px] rounded-lg overflow-hidden group transition-all duration-200 hover:scale-105 active:scale-95"
          style={{ background: "#FFD93D", color: "#000", boxShadow: "0 0 20px #FFD93D66, 4px 4px 0 #B8860B" }}
        >
          <span className="relative z-10">▶ НАЧАТЬ ИГРУ</span>
        </button>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 max-w-xs">
          {["3D мир", "ИИ чат-бот", "4 стиля", "Мобильный джойстик"].map((f) => (
            <span key={f} className="font-pixel text-[6px] px-2 py-1 rounded"
              style={{ background: "#ffffff11", border: "1px solid #ffffff22", color: "#888" }}>
              {f}
            </span>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-6">
        <div className="flex items-center justify-center gap-2">
          <Icon name="Gamepad2" size={12} className="text-gray-700" />
          <span className="font-pixel text-[6px] text-gray-700 tracking-widest">KIDWORLD v1.0</span>
          <Icon name="Gamepad2" size={12} className="text-gray-700" />
        </div>
      </footer>
    </div>
  );
}