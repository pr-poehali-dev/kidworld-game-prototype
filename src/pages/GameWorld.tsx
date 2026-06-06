import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect, useCallback, Component, ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import Icon from "@/components/ui/icon";

const THEMES = {
  minecraft: {
    bgColor: "#87CEEB",
    floor: "#5B9E35",
    floorRough: "#8B6340",
    fog: "#a8d5a2",
    playerColor: "#4A90D9",
    enemyColor: "#E74C3C",
    ambientIntensity: 0.6,
    name: "Minecraft",
    sunColor: "#fffbe0",
  },
  roblox: {
    bgColor: "#6EC6F0",
    floor: "#3498DB",
    floorRough: "#2980B9",
    fog: "#87CEEB",
    playerColor: "#E74C3C",
    enemyColor: "#2C3E50",
    ambientIntensity: 0.8,
    name: "Roblox",
    sunColor: "#ffffff",
  },
  toca: {
    bgColor: "#FFD6EC",
    floor: "#FFB3D1",
    floorRough: "#FF69B4",
    fog: "#FFD6EC",
    playerColor: "#FF6BB3",
    enemyColor: "#FF8C42",
    ambientIntensity: 1.0,
    name: "Toca Boca",
    sunColor: "#ffe0f0",
  },
  galaxy: {
    bgColor: "#05051a",
    floor: "#1a0533",
    floorRough: "#0d0020",
    fog: "#0a001a",
    playerColor: "#9B5DE5",
    enemyColor: "#00D4FF",
    ambientIntensity: 0.3,
    name: "Galaxy Wars",
    sunColor: "#C77DFF",
  },
};

type ThemeKey = keyof typeof THEMES;

interface GameCommand {
  action: string;
  type?: string;
  count?: number;
  position?: string;
  effect?: string;
  skin?: string;
  behavior?: string;
  props?: Record<string, unknown>;
}

interface Enemy {
  id: string;
  position: [number, number, number];
  hp: number;
  type: string;
}

interface WorldObject {
  id: string;
  type: string;
  position: [number, number, number];
}

interface Particle {
  id: string;
  position: [number, number, number];
  life: number;
}

interface WorldState {
  enemies: Enemy[];
  objects: WorldObject[];
  particles: Particle[];
  weaponEffect: string;
  playerSkin: string;
}

const keysRef = { w: false, a: false, s: false, d: false, space: false };

function makeDefaultEnemies(themeKey: ThemeKey): Enemy[] {
  const positions: [number, number, number][] = [
    [-8, 0, -8], [8, 0, -10], [0, 0, -12],
  ];
  return positions.map((pos, i) => ({
    id: `default_enemy_${i}`,
    type: themeKey === "galaxy" ? "alien" : themeKey === "minecraft" ? "zombie" : "robot",
    position: pos,
    hp: 3,
  }));
}

class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function Player({
  themeKey,
  worldState,
  onAttack,
  attackTrigger,
}: {
  themeKey: ThemeKey;
  worldState: WorldState;
  onAttack: (pos: [number, number, number]) => void;
  attackTrigger: number;
}) {
  const theme = THEMES[themeKey];
  const groupRef = useRef<THREE.Group>(null!);
  const posRef = useRef(new THREE.Vector3(0, 0.8, 0));
  const velRef = useRef(new THREE.Vector3());
  const onGround = useRef(true);
  const rotRef = useRef(0);
  const attackRef = useRef(0);
  const prevAttack = useRef(0);
  const { camera } = useThree();

  useEffect(() => {
    if (attackTrigger !== prevAttack.current) {
      prevAttack.current = attackTrigger;
      attackRef.current = 0.3;
      onAttack([posRef.current.x, posRef.current.y, posRef.current.z]);
    }
  }, [attackTrigger, onAttack]);

  useFrame((_, delta) => {
    const speed = 5;
    const direction = new THREE.Vector3();
    if (keysRef.w) direction.z -= 1;
    if (keysRef.s) direction.z += 1;
    if (keysRef.a) direction.x -= 1;
    if (keysRef.d) direction.x += 1;
    if (direction.length() > 0) {
      direction.normalize();
      rotRef.current = Math.atan2(direction.x, direction.z);
    }
    velRef.current.x = direction.x * speed;
    velRef.current.z = direction.z * speed;
    if (keysRef.space && onGround.current) {
      velRef.current.y = 8;
      onGround.current = false;
    }
    velRef.current.y -= 20 * delta;
    posRef.current.add(velRef.current.clone().multiplyScalar(delta));
    if (posRef.current.y <= 0.8) {
      posRef.current.y = 0.8;
      velRef.current.y = 0;
      onGround.current = true;
    }
    posRef.current.x = Math.max(-24, Math.min(24, posRef.current.x));
    posRef.current.z = Math.max(-24, Math.min(24, posRef.current.z));
    if (groupRef.current) {
      groupRef.current.position.copy(posRef.current);
      groupRef.current.rotation.y = rotRef.current;
    }
    if (attackRef.current > 0) attackRef.current -= delta;
    const camTarget = new THREE.Vector3(posRef.current.x, posRef.current.y + 3, posRef.current.z + 8);
    camera.position.lerp(camTarget, 0.08);
    camera.lookAt(posRef.current.x, posRef.current.y + 1, posRef.current.z);
  });

  const weaponGlow = worldState.weaponEffect?.includes("fire")
    ? "#FF6600"
    : worldState.weaponEffect?.includes("ice")
    ? "#00D4FF"
    : theme.playerColor;

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.8, 0.4]} />
        <meshStandardMaterial color={theme.playerColor} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.5]} />
        <meshStandardMaterial color={theme.playerColor} roughness={0.3} />
      </mesh>
      <mesh position={[-0.12, 0.75, 0.26]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[0.12, 0.75, 0.26]}>
        <boxGeometry args={[0.08, 0.08, 0.02]} />
        <meshStandardMaterial color="#000" />
      </mesh>
      <mesh position={[-0.45, 0.05, 0]} castShadow>
        <boxGeometry args={[0.25, 0.6, 0.25]} />
        <meshStandardMaterial color={theme.playerColor} roughness={0.3} />
      </mesh>
      <mesh
        position={[0.45, attackRef.current > 0 ? -0.1 : 0.05, attackRef.current > 0 ? 0.3 : 0]}
        rotation={[attackRef.current > 0 ? -Math.PI / 2 : 0, 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.25, 0.6, 0.25]} />
        <meshStandardMaterial color={theme.playerColor} roughness={0.3} />
      </mesh>
      <mesh position={[-0.15, -0.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.55, 0.25]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.5} />
      </mesh>
      <mesh position={[0.15, -0.7, 0]} castShadow>
        <boxGeometry args={[0.25, 0.55, 0.25]} />
        <meshStandardMaterial color="#2C3E50" roughness={0.5} />
      </mesh>
      <mesh position={[0.7, 0.1, 0.1]} castShadow>
        <boxGeometry args={[0.12, 0.8, 0.12]} />
        <meshStandardMaterial color={weaponGlow} emissive={weaponGlow} emissiveIntensity={0.6} roughness={0.1} />
      </mesh>
      <pointLight position={[0.7, 0.1, 0.1]} color={weaponGlow} intensity={1.5} distance={3} />
    </group>
  );
}

function EnemyMesh({ enemy, themeKey }: { enemy: Enemy; themeKey: ThemeKey }) {
  const theme = THEMES[themeKey];
  const ref = useRef<THREE.Group>(null!);
  const posRef = useRef(new THREE.Vector3(...enemy.position));

  useFrame((state) => {
    const playerPos = state.camera.position.clone();
    const dir = new THREE.Vector3(playerPos.x, 0, playerPos.z - 8).sub(posRef.current).normalize();
    posRef.current.add(dir.multiplyScalar(0.025));
    if (ref.current) {
      ref.current.position.set(posRef.current.x, 0.7, posRef.current.z);
      ref.current.rotation.y = Math.atan2(dir.x, dir.z) + Math.PI;
    }
  });

  return (
    <group ref={ref} position={[enemy.position[0], 0.7, enemy.position[2]]}>
      <mesh position={[0, 0, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.4]} />
        <meshStandardMaterial color={theme.enemyColor} emissive={theme.enemyColor} emissiveIntensity={0.15} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.65, 0]} castShadow>
        <boxGeometry args={[0.55, 0.5, 0.5]} />
        <meshStandardMaterial color={theme.enemyColor} emissive={theme.enemyColor} emissiveIntensity={0.2} roughness={0.4} />
      </mesh>
      <mesh position={[-0.12, 0.7, 0.26]}>
        <boxGeometry args={[0.1, 0.08, 0.02]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={3} />
      </mesh>
      <mesh position={[0.12, 0.7, 0.26]}>
        <boxGeometry args={[0.1, 0.08, 0.02]} />
        <meshStandardMaterial color="#FF0000" emissive="#FF0000" emissiveIntensity={3} />
      </mesh>
      <pointLight position={[0, 0.65, 0]} color={theme.enemyColor} intensity={0.8} distance={2.5} />
    </group>
  );
}

function ParticleEffect({ particle }: { particle: Particle }) {
  const ref = useRef<THREE.Group>(null!);
  const colors = ["#FF6600", "#FFD700", "#FF4444", "#FFA500"];
  useFrame((_, delta) => {
    if (ref.current) {
      ref.current.children.forEach((child, i) => {
        child.position.x += Math.sin(i * 1.3) * 0.06;
        child.position.y += 0.05 + i * 0.008;
        child.position.z += Math.cos(i * 1.1) * 0.06;
        child.scale.multiplyScalar(0.97);
      });
    }
  });
  return (
    <group ref={ref} position={particle.position}>
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={i} position={[(Math.random() - 0.5) * 0.4, Math.random() * 0.2, (Math.random() - 0.5) * 0.4]}>
          <boxGeometry args={[0.1, 0.1, 0.1]} />
          <meshStandardMaterial color={colors[i % 4]} emissive={colors[i % 4]} emissiveIntensity={1.5} />
        </mesh>
      ))}
    </group>
  );
}

function Floor({ themeKey }: { themeKey: ThemeKey }) {
  const theme = THEMES[themeKey];
  const patches = useRef(
    Array.from({ length: 20 }, () => ({
      x: (Math.random() - 0.5) * 40,
      z: (Math.random() - 0.5) * 40,
      rot: Math.random() * Math.PI,
      w: 2 + Math.random() * 2,
      h: 2 + Math.random() * 2,
    }))
  );
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color={theme.floor} roughness={0.9} />
      </mesh>
      {patches.current.map((p, i) => (
        <mesh key={i} position={[p.x, -0.45, p.z]} rotation={[-Math.PI / 2, 0, p.rot]} receiveShadow>
          <planeGeometry args={[p.w, p.h]} />
          <meshStandardMaterial color={theme.floorRough} roughness={1} />
        </mesh>
      ))}
    </>
  );
}

function WorldObjects({ objects, themeKey }: { objects: WorldObject[]; themeKey: ThemeKey }) {
  const theme = THEMES[themeKey];
  return (
    <>
      {objects.map((obj) => {
        if (obj.type === "tree") {
          return (
            <group key={obj.id} position={obj.position}>
              <mesh position={[0, 0.8, 0]} castShadow>
                <cylinderGeometry args={[0.15, 0.2, 1.5]} />
                <meshStandardMaterial color="#8B6340" roughness={0.9} />
              </mesh>
              <mesh position={[0, 2.2, 0]} castShadow>
                <sphereGeometry args={[0.8, 6, 5]} />
                <meshStandardMaterial color={theme.floor} roughness={0.8} />
              </mesh>
            </group>
          );
        }
        return (
          <mesh key={obj.id} position={obj.position} castShadow>
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshStandardMaterial color={theme.playerColor} emissive={theme.playerColor} emissiveIntensity={0.3} roughness={0.5} />
          </mesh>
        );
      })}
    </>
  );
}

function GalaxyStars() {
  const stars = useRef(
    Array.from({ length: 60 }, () => ({
      x: (Math.random() - 0.5) * 80,
      y: 5 + Math.random() * 25,
      z: (Math.random() - 0.5) * 80,
      r: 0.04 + Math.random() * 0.08,
    }))
  );
  return (
    <>
      {stars.current.map((s, i) => (
        <mesh key={i} position={[s.x, s.y, s.z]}>
          <sphereGeometry args={[s.r, 4, 4]} />
          <meshStandardMaterial color="white" emissive="white" emissiveIntensity={4} />
        </mesh>
      ))}
    </>
  );
}

function Scene({
  themeKey,
  worldState,
  onAttack,
  attackTrigger,
}: {
  themeKey: ThemeKey;
  worldState: WorldState;
  onAttack: (pos: [number, number, number]) => void;
  attackTrigger: number;
}) {
  const theme = THEMES[themeKey];
  const isGalaxy = themeKey === "galaxy";

  return (
    <>
      <color attach="background" args={[theme.bgColor]} />
      <fog attach="fog" args={[theme.fog, isGalaxy ? 12 : 20, isGalaxy ? 40 : 60]} />

      {isGalaxy ? (
        <>
          <ambientLight intensity={0.2} color="#9B5DE5" />
          <pointLight position={[0, 12, 0]} color="#C77DFF" intensity={4} distance={50} />
          <pointLight position={[10, 5, -10]} color="#00D4FF" intensity={2} distance={30} />
          <GalaxyStars />
        </>
      ) : (
        <>
          <ambientLight intensity={theme.ambientIntensity} color={theme.sunColor} />
          <directionalLight position={[10, 15, 10]} intensity={1.5} castShadow />
          <hemisphereLight args={[theme.bgColor, theme.floor, 0.4]} />
        </>
      )}

      <Floor themeKey={themeKey} />
      <WorldObjects objects={worldState.objects} themeKey={themeKey} />

      {worldState.enemies.map((enemy) => (
        <EnemyMesh key={enemy.id} enemy={enemy} themeKey={themeKey} />
      ))}

      {worldState.particles.map((p) => (
        <ParticleEffect key={p.id} particle={p} />
      ))}

      <Player
        themeKey={themeKey}
        worldState={worldState}
        onAttack={onAttack}
        attackTrigger={attackTrigger}
      />
    </>
  );
}

export default function GameWorld() {
  const { style = "minecraft" } = useParams<{ style: string }>();
  const navigate = useNavigate();
  const themeKey = (THEMES[style as ThemeKey] ? style : "minecraft") as ThemeKey;
  const theme = THEMES[themeKey];

  const [worldState, setWorldState] = useState<WorldState>(() => ({
    enemies: makeDefaultEnemies(themeKey),
    objects: [],
    particles: [],
    weaponEffect: "",
    playerSkin: "default",
  }));
  const [attackTrigger, setAttackTrigger] = useState(0);
  const [chatMessage, setChatMessage] = useState("");
  const [aiReply, setAiReply] = useState("Привет! Напиши что добавить в мир 🎮");
  const [isLoading, setIsLoading] = useState(false);
  const [joystick, setJoystick] = useState({ dx: 0, dy: 0, active: false });
  const joystickOrigin = useRef({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keysRef.w = true;
      if (e.code === "KeyA") keysRef.a = true;
      if (e.code === "KeyS") keysRef.s = true;
      if (e.code === "KeyD") keysRef.d = true;
      if (e.code === "Space") { e.preventDefault(); keysRef.space = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "KeyW") keysRef.w = false;
      if (e.code === "KeyA") keysRef.a = false;
      if (e.code === "KeyS") keysRef.s = false;
      if (e.code === "KeyD") keysRef.d = false;
      if (e.code === "Space") keysRef.space = false;
    };
    const onClick = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName === "CANVAS") setAttackTrigger((t) => t + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("click", onClick);
      keysRef.w = keysRef.a = keysRef.s = keysRef.d = keysRef.space = false;
    };
  }, []);

  useEffect(() => {
    if (joystick.active) {
      keysRef.w = joystick.dy < -0.3;
      keysRef.s = joystick.dy > 0.3;
      keysRef.a = joystick.dx < -0.3;
      keysRef.d = joystick.dx > 0.3;
    } else {
      keysRef.w = keysRef.s = keysRef.a = keysRef.d = false;
    }
  }, [joystick]);

  const applyCommand = useCallback((cmd: GameCommand) => {
    setWorldState((prev) => {
      const next = { ...prev };
      if (cmd.action === "add_enemy") {
        const count = Math.min(cmd.count || 1, 5);
        const newEnemies = Array.from({ length: count }, (_, i) => ({
          id: `enemy_${Date.now()}_${i}`,
          type: cmd.type || "robot",
          position: [(Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20] as [number, number, number],
          hp: 3,
        }));
        next.enemies = [...prev.enemies, ...newEnemies];
      }
      if (cmd.action === "add_object") {
        next.objects = [...prev.objects, {
          id: `obj_${Date.now()}`,
          type: cmd.type || "tree",
          position: [(Math.random() - 0.5) * 20, 0, (Math.random() - 0.5) * 20],
        }];
      }
      if (cmd.action === "change_weapon") next.weaponEffect = cmd.effect || "";
      if (cmd.action === "change_player") next.playerSkin = cmd.skin || "default";
      if (cmd.action === "add_effect") {
        next.particles = [...prev.particles, { id: `p_${Date.now()}`, position: [0, 1, 0], life: 1.5 }];
      }
      return next;
    });
  }, []);

  const handleAttack = useCallback((pos: [number, number, number]) => {
    setWorldState((prev) => {
      const surviving = prev.enemies.filter((e) => {
        const dx = e.position[0] - pos[0];
        const dz = e.position[2] - pos[2];
        return Math.sqrt(dx * dx + dz * dz) > 3;
      });
      if (surviving.length < prev.enemies.length) {
        return {
          ...prev,
          enemies: surviving,
          particles: [...prev.particles, { id: `p_${Date.now()}`, position: pos, life: 1.2 }],
        };
      }
      return prev;
    });
    setTimeout(() => setWorldState((p) => ({ ...p, particles: [] })), 1500);
  }, []);

  const handleSendMessage = async () => {
    if (!chatMessage.trim() || isLoading) return;
    const msg = chatMessage.trim();
    setChatMessage("");
    setIsLoading(true);
    setAiReply("Думаю...");
    try {
      const res = await fetch("https://functions.poehali.dev/97def82a-1abb-45e6-9c01-a082dc689fa8", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          style: themeKey,
          world_state: { enemies_count: worldState.enemies.length, objects_count: worldState.objects.length },
        }),
      });
      const data = await res.json();
      setAiReply(data.reply || "Готово!");
      if (data.commands) data.commands.forEach((cmd: GameCommand) => applyCommand(cmd));
    } catch {
      setAiReply("Что-то пошло не так, попробуй ещё раз! 🤖");
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoystickStart = (e: React.TouchEvent) => {
    const touch = e.changedTouches[0];
    joystickOrigin.current = { x: touch.clientX, y: touch.clientY };
    joystickTouchId.current = touch.identifier;
    setJoystick({ dx: 0, dy: 0, active: true });
  };
  const handleJoystickMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = Array.from(e.changedTouches).find((t) => t.identifier === joystickTouchId.current);
    if (!touch) return;
    const dx = (touch.clientX - joystickOrigin.current.x) / 40;
    const dy = (touch.clientY - joystickOrigin.current.y) / 40;
    const len = Math.sqrt(dx * dx + dy * dy);
    setJoystick(len > 1 ? { dx: dx / len, dy: dy / len, active: true } : { dx, dy, active: true });
  };
  const handleJoystickEnd = () => {
    joystickTouchId.current = null;
    setJoystick({ dx: 0, dy: 0, active: false });
  };

  const canvasFallback = (
    <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ background: theme.bgColor }}>
      <div className="font-pixel text-[10px] mb-4" style={{ color: theme.playerColor }}>3D НЕ ПОДДЕРЖИВАЕТСЯ</div>
      <div className="text-white font-rubik text-sm opacity-60">Обнови браузер или попробуй на другом устройстве</div>
    </div>
  );

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: theme.bgColor }}>
      <ErrorBoundary fallback={canvasFallback}>
        <Canvas
          camera={{ position: [0, 4, 10], fov: 65 }}
          shadows
          gl={{ antialias: false, powerPreference: "high-performance" }}
          style={{ position: "absolute", inset: 0 }}
        >
          <Scene
            themeKey={themeKey}
            worldState={worldState}
            onAttack={handleAttack}
            attackTrigger={attackTrigger}
          />
        </Canvas>
      </ErrorBoundary>

      {/* HUD top-left */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button
          onClick={() => navigate("/game")}
          className="flex items-center gap-1 px-3 py-1.5 rounded font-pixel text-[8px]"
          style={{ background: "#00000099", border: `1px solid ${theme.playerColor}`, color: theme.playerColor, backdropFilter: "blur(4px)" }}
        >
          <Icon name="ArrowLeft" size={12} />
          ВЫЙТИ
        </button>
        <div
          className="px-3 py-1.5 rounded font-pixel text-[8px]"
          style={{ background: "#00000099", border: `1px solid ${theme.playerColor}`, color: theme.playerColor, backdropFilter: "blur(4px)" }}
        >
          {theme.name.toUpperCase()}
        </div>
      </div>

      {/* HUD top-right */}
      <div
        className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded font-pixel text-[8px]"
        style={{ background: "#00000099", border: "1px solid #ff444488", color: "#ff4444", backdropFilter: "blur(4px)" }}
      >
        <Icon name="Skull" size={12} />
        {worldState.enemies.length} ВРАГОВ
      </div>

      {/* Desktop hint */}
      {!isMobile && (
        <div
          className="absolute bottom-20 right-3 z-10 px-3 py-2 rounded font-pixel text-[7px] leading-relaxed"
          style={{ background: "#00000077", border: "1px solid #ffffff22", color: "#ffffff66", backdropFilter: "blur(4px)" }}
        >
          WASD — движение<br />
          ПРОБЕЛ — прыжок<br />
          ЛКМ — удар
        </div>
      )}

      {/* Mobile controls */}
      {isMobile && (
        <>
          <div
            className="absolute bottom-24 left-6 z-10 w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: "#00000066", border: `2px solid ${theme.playerColor}55`, backdropFilter: "blur(4px)" }}
            onTouchStart={handleJoystickStart}
            onTouchMove={handleJoystickMove}
            onTouchEnd={handleJoystickEnd}
          >
            <div
              className="w-10 h-10 rounded-full"
              style={{
                background: theme.playerColor,
                opacity: 0.85,
                transform: joystick.active ? `translate(${joystick.dx * 16}px, ${joystick.dy * 16}px)` : "none",
                transition: joystick.active ? "none" : "transform 0.15s ease",
              }}
            />
          </div>
          <div className="absolute bottom-24 right-6 z-10 flex flex-col gap-2 items-end">
            <button
              className="w-14 h-14 rounded-full font-pixel text-lg flex items-center justify-center"
              style={{ background: `${theme.playerColor}cc`, border: `2px solid ${theme.playerColor}` }}
              onTouchStart={() => setAttackTrigger((t) => t + 1)}
            >
              ⚔️
            </button>
            <button
              className="w-12 h-12 rounded-full font-pixel text-lg flex items-center justify-center"
              style={{ background: "#ffffff22", border: "2px solid #ffffff44" }}
              onTouchStart={() => { keysRef.space = true; setTimeout(() => { keysRef.space = false; }, 120); }}
            >
              🦘
            </button>
          </div>
        </>
      )}

      {/* AI Chat bar */}
      <div
        className="absolute bottom-0 left-0 right-0 z-20 flex items-center gap-2 px-3"
        style={{ height: "60px", background: "#000000dd", borderTop: `2px solid ${theme.playerColor}44`, backdropFilter: "blur(8px)" }}
      >
        <div
          className="w-8 h-8 rounded flex-shrink-0 flex items-center justify-center text-base"
          style={{ background: theme.playerColor }}
        >
          🤖
        </div>
        <div
          className="hidden md:block text-[10px] font-rubik px-2 flex-shrink-0 max-w-[200px] truncate"
          style={{ color: theme.playerColor }}
        >
          {aiReply}
        </div>
        <input
          className="flex-1 bg-transparent outline-none font-rubik text-sm text-white placeholder-gray-500"
          placeholder="Напиши что добавить в мир..."
          value={chatMessage}
          onChange={(e) => setChatMessage(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
        />
        <button
          onClick={handleSendMessage}
          disabled={isLoading || !chatMessage.trim()}
          className="px-3 py-1.5 rounded font-pixel text-[8px] flex-shrink-0 transition-all"
          style={{
            background: chatMessage.trim() && !isLoading ? theme.playerColor : "#333",
            color: chatMessage.trim() && !isLoading ? "#000" : "#666",
            border: `1px solid ${theme.playerColor}44`,
          }}
        >
          {isLoading ? "..." : "▶"}
        </button>
      </div>

      {/* CRT overlay */}
      <div
        className="pointer-events-none fixed inset-0 z-30 opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)" }}
      />
    </div>
  );
}
