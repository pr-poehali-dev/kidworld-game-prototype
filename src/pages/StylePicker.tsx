import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";

const STYLES = [
  {
    id: "minecraft",
    name: "Minecraft",
    desc: "Кубический пиксельный мир",
    colors: { primary: "#5B9E35", secondary: "#8B6340", bg: "#1a3d0f", glow: "#7ED321" },
    emoji: "⛏️",
    blocks: ["🟩", "🟫", "🟩", "🟫", "🟩"],
    tag: "ПИКСЕЛИ",
  },
  {
    id: "roblox",
    name: "Roblox",
    desc: "Яркие блочные фигуры",
    colors: { primary: "#E52727", secondary: "#0066FF", bg: "#0d1a3d", glow: "#FF4444" },
    emoji: "🎮",
    blocks: ["🟦", "🟥", "🟦", "🟥", "🟦"],
    tag: "БЛОКИ",
  },
  {
    id: "toca",
    name: "Toca Boca",
    desc: "Мягкий мультяшный стиль",
    colors: { primary: "#FF6BB3", secondary: "#FFD93D", bg: "#3d0d1a", glow: "#FF9ECD" },
    emoji: "🌸",
    blocks: ["🩷", "💛", "🩷", "💛", "🩷"],
    tag: "МУЛЬТ",
  },
  {
    id: "galaxy",
    name: "Galaxy Wars",
    desc: "Космос, неон, sci-fi",
    colors: { primary: "#9B5DE5", secondary: "#00D4FF", bg: "#050520", glow: "#C77DFF" },
    emoji: "🚀",
    blocks: ["🟣", "🔵", "🟣", "🔵", "🟣"],
    tag: "КОСМОС",
  },
];

function PixelPreview({ style, active }: { style: typeof STYLES[0]; active: boolean }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setFrame((f) => (f + 1) % 4), 400);
    return () => clearInterval(id);
  }, []);

  const sprites = {
    minecraft: [
      ["⬜","🟩","⬜","🟩","⬜"],
      ["🟩","🟫","🟩","🟫","🟩"],
      ["⬜","🟩","🌳","🟩","⬜"],
      ["🟩","⬜","🟩","⬜","🟩"],
    ],
    roblox: [
      ["⬜","🟦","🟥","🟦","⬜"],
      ["🟥","⬜","🟦","⬜","🟥"],
      ["⬜","🟥","🟦","🟥","⬜"],
      ["🟦","🟥","⬜","🟥","🟦"],
    ],
    toca: [
      ["⬜","🩷","💛","🩷","⬜"],
      ["🩷","💛","🌸","💛","🩷"],
      ["⬜","🌸","🩷","🌸","⬜"],
      ["💛","🩷","💛","🩷","💛"],
    ],
    galaxy: [
      ["⭐","🟣","⬛","🔵","⭐"],
      ["⬛","✨","🟣","✨","⬛"],
      ["🔵","⬛","⭐","⬛","🔵"],
      ["⬛","🔵","🟣","🔵","⬛"],
    ],
  };

  const grid = sprites[style.id as keyof typeof sprites] || sprites.minecraft;
  const row = grid[frame % grid.length];

  return (
    <div
      className="w-full h-20 flex flex-col items-center justify-center gap-1 rounded-t-none rounded-b-none overflow-hidden relative"
      style={{ background: `linear-gradient(135deg, ${style.colors.bg}, #000)` }}
    >
      <div
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 7px, rgba(255,255,255,0.05) 8px), repeating-linear-gradient(90deg, transparent, transparent 7px, rgba(255,255,255,0.05) 8px)`,
        }}
      />
      <div className={`text-xl flex gap-0.5 ${active ? "animate-bounce-pixel" : ""}`}>
        {row.map((cell, i) => (
          <span key={i} style={{ fontSize: "14px", lineHeight: 1 }}>{cell}</span>
        ))}
      </div>
      <div
        className="text-[8px] font-pixel tracking-widest px-2 py-0.5 rounded"
        style={{ color: style.colors.primary, border: `1px solid ${style.colors.primary}`, background: `${style.colors.bg}cc` }}
      >
        {style.tag}
      </div>
    </div>
  );
}

export default function StylePicker() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<string | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const handlePlay = (styleId: string) => {
    setSelected(styleId);
    setTimeout(() => navigate(`/game/${styleId}`), 300);
  };

  return (
    <div className="min-h-screen bg-black font-rubik overflow-hidden relative flex flex-col">
      {/* CRT scanline overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-50 opacity-[0.03]"
        style={{
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.8) 2px, rgba(255,255,255,0.8) 4px)",
        }}
      />

      {/* Stars background */}
      <div className="fixed inset-0 z-0">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white animate-star-twinkle"
            style={{
              width: Math.random() > 0.8 ? "2px" : "1px",
              height: Math.random() > 0.8 ? "2px" : "1px",
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${1.5 + Math.random() * 2}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header className="relative z-10 pt-8 pb-4 text-center select-none">
        <div className="inline-block relative">
          <h1
            className="font-pixel text-2xl md:text-4xl tracking-wider animate-pixel-flicker"
            style={{
              color: "#FFD93D",
              textShadow: "4px 4px 0px #B8860B, 0 0 20px #FFD93D88, 0 0 40px #FFD93D44",
            }}
          >
            KID WORLD
          </h1>
          <div
            className="font-pixel text-[8px] text-center mt-2 tracking-[0.4em]"
            style={{ color: "#888", textShadow: "none" }}
          >
            ВЫБЕРИ СТИЛЬ ИГРЫ
          </div>
        </div>

        {/* Pixel decoration line */}
        <div className="flex items-center justify-center gap-1 mt-4">
          {["🟨","⬜","🟨","⬜","🟨","⬜","🟨","⬜","🟨","⬜","🟨","⬜","🟨"].map((b, i) => (
            <span key={i} style={{ fontSize: "8px" }}>{b}</span>
          ))}
        </div>
      </header>

      {/* Cards grid */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
          {STYLES.map((style, idx) => {
            const isHovered = hovered === style.id;
            const isSelected = selected === style.id;
            return (
              <div
                key={style.id}
                className="group relative cursor-pointer"
                style={{
                  animationDelay: `${idx * 0.1}s`,
                  animation: "fade-in 0.5s ease-out forwards",
                  opacity: 0,
                }}
                onMouseEnter={() => setHovered(style.id)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => handlePlay(style.id)}
              >
                {/* Card glow */}
                <div
                  className="absolute -inset-0.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-sm"
                  style={{ background: style.colors.primary }}
                />

                {/* Card body */}
                <div
                  className="relative rounded-lg overflow-hidden flex flex-col"
                  style={{
                    background: "#0a0a0a",
                    border: `2px solid ${isHovered || isSelected ? style.colors.primary : "#333"}`,
                    boxShadow: isHovered ? `0 0 20px ${style.colors.primary}66, inset 0 0 20px ${style.colors.bg}` : "none",
                    transform: isSelected ? "scale(0.95)" : isHovered ? "scale(1.03)" : "scale(1)",
                    transition: "all 0.2s ease",
                  }}
                >
                  {/* Preview area */}
                  <PixelPreview style={style} active={isHovered} />

                  {/* Content */}
                  <div className="p-3 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{style.emoji}</span>
                      <span
                        className="font-pixel text-[9px] leading-tight"
                        style={{ color: style.colors.primary }}
                      >
                        {style.name}
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 leading-tight font-rubik">
                      {style.desc}
                    </p>

                    {/* Play button */}
                    <button
                      className="w-full mt-1 py-2 font-pixel text-[8px] rounded relative overflow-hidden group/btn"
                      style={{
                        background: isHovered ? style.colors.primary : "transparent",
                        border: `2px solid ${style.colors.primary}`,
                        color: isHovered ? "#000" : style.colors.primary,
                        transition: "all 0.15s ease",
                        textShadow: "none",
                      }}
                    >
                      <span className="relative z-10">▶ ИГРАТЬ</span>
                    </button>
                  </div>

                  {/* Corner pixel decorations */}
                  <div
                    className="absolute top-1 right-1 w-1.5 h-1.5"
                    style={{ background: style.colors.primary, opacity: isHovered ? 1 : 0.3 }}
                  />
                  <div
                    className="absolute bottom-1 left-1 w-1.5 h-1.5"
                    style={{ background: style.colors.secondary, opacity: isHovered ? 1 : 0.3 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Footer hint */}
      <footer className="relative z-10 text-center pb-6 pt-2">
        <div className="flex items-center justify-center gap-2">
          <Icon name="Gamepad2" size={14} className="text-gray-600" />
          <span className="font-pixel text-[7px] text-gray-600 tracking-widest">
            НАЖМИ НА КАРТОЧКУ ЧТОБЫ НАЧАТЬ
          </span>
          <Icon name="Gamepad2" size={14} className="text-gray-600" />
        </div>
      </footer>
    </div>
  );
}
