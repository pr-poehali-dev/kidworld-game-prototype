import { useParams, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect, useCallback } from "react";
import * as THREE from "three";
import Icon from "@/components/ui/icon";

const THEMES = {
  minecraft: {
    bgColor: 0x87CEEB, bgCss: "#87CEEB", floor: 0x5B9E35, floorDetail: 0x8B6340,
    fog: 0xa8d5a2, playerColor: 0x4A90D9, enemyColor: 0xE74C3C,
    ambientIntensity: 0.7, name: "Minecraft", accentCss: "#4A90D9",
  },
  roblox: {
    bgColor: 0x6EC6F0, bgCss: "#6EC6F0", floor: 0x3498DB, floorDetail: 0x2980B9,
    fog: 0x87CEEB, playerColor: 0xE74C3C, enemyColor: 0x2C3E50,
    ambientIntensity: 0.9, name: "Roblox", accentCss: "#E74C3C",
  },
  toca: {
    bgColor: 0xFFD6EC, bgCss: "#FFD6EC", floor: 0xFFB3D1, floorDetail: 0xFF69B4,
    fog: 0xFFD6EC, playerColor: 0xFF6BB3, enemyColor: 0xFF8C42,
    ambientIntensity: 1.0, name: "Toca Boca", accentCss: "#FF6BB3",
  },
  galaxy: {
    bgColor: 0x05051a, bgCss: "#05051a", floor: 0x1a0533, floorDetail: 0x0d0020,
    fog: 0x0a001a, playerColor: 0x9B5DE5, enemyColor: 0x00D4FF,
    ambientIntensity: 0.25, name: "Galaxy Wars", accentCss: "#9B5DE5",
  },
};

type ThemeKey = keyof typeof THEMES;

interface EnemyObj { id: string; mesh: THREE.Group; hp: number; }
interface GameCommand { action: string; type?: string; count?: number; effect?: string; skin?: string; }

function buildHumanoid(bodyColor: number, glowEyes = false): THREE.Group {
  const g = new THREE.Group();
  const mat = (c: number, ei = 0) => new THREE.MeshStandardMaterial({ color: c, emissive: ei ? c : 0, emissiveIntensity: ei, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.4), mat(bodyColor));
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), mat(bodyColor));
  head.position.y = 0.65; g.add(head);
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: glowEyes ? 0xff0000 : 0, emissiveIntensity: glowEyes ? 3 : 0 });
  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.08, 0.02), eyeMat);
  eyeL.position.set(-0.12, 0.68, 0.26); g.add(eyeL);
  const eyeR = eyeL.clone(); eyeR.position.set(0.12, 0.68, 0.26); g.add(eyeR);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.6, 0.25), mat(bodyColor));
  armL.position.set(-0.44, 0.05, 0); g.add(armL);
  const armR = armL.clone(); armR.position.set(0.44, 0.05, 0); g.add(armR);
  const legMat = new THREE.MeshStandardMaterial({ color: 0x2C3E50, roughness: 0.6 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.55, 0.25), legMat);
  legL.position.set(-0.15, -0.68, 0); g.add(legL);
  const legR = legL.clone(); legR.position.set(0.15, -0.68, 0); g.add(legR);
  return g;
}

export default function GameWorld() {
  const { style = "minecraft" } = useParams<{ style: string }>();
  const navigate = useNavigate();
  const themeKey = (THEMES[style as ThemeKey] ? style : "minecraft") as ThemeKey;
  const theme = THEMES[themeKey];

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const playerPosRef = useRef(new THREE.Vector3(0, 0.8, 0));
  const playerVelRef = useRef(new THREE.Vector3());
  const onGroundRef = useRef(true);
  const playerRotRef = useRef(0);
  const weaponRef = useRef<THREE.Mesh | null>(null);
  const attackTimerRef = useRef(0);
  const enemiesRef = useRef<EnemyObj[]>([]);
  const rafRef = useRef<number>(0);
  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false });
  const joystickRef = useRef({ dx: 0, dy: 0, active: false });

  const [enemyCount, setEnemyCount] = useState(3);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Привет! Я могу менять твой мир 🎮 Попробуй: «добавь роботов» или «поставь дерево»!" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [joystick, setJoystick] = useState({ dx: 0, dy: 0, active: false });
  const joystickOrigin = useRef({ x: 0, y: 0 });
  const joystickTouchId = useRef<number | null>(null);
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const spawnEnemy = useCallback((scene: THREE.Scene, pos?: THREE.Vector3) => {
    const position = pos ?? new THREE.Vector3((Math.random() - 0.5) * 20, 0.8, (Math.random() - 0.5) * 20);
    const mesh = buildHumanoid(theme.enemyColor, true);
    mesh.position.copy(position);
    scene.add(mesh);
    const light = new THREE.PointLight(theme.enemyColor, 1, 3);
    light.position.set(0, 0.5, 0);
    mesh.add(light);
    const enemy: EnemyObj = { id: `e_${Date.now()}_${Math.random()}`, mesh, hp: 3 };
    enemiesRef.current.push(enemy);
    setEnemyCount(enemiesRef.current.length);
  }, [theme]);

  const triggerAttack = useCallback(() => {
    attackTimerRef.current = 0.3;
    const scene = sceneRef.current;
    if (!scene) return;
    const pos = playerPosRef.current;
    const surviving: EnemyObj[] = [];
    enemiesRef.current.forEach((e) => {
      const dx = e.mesh.position.x - pos.x;
      const dz = e.mesh.position.z - pos.z;
      if (Math.sqrt(dx * dx + dz * dz) < 3.5) {
        for (let i = 0; i < 8; i++) {
          const p = new THREE.Mesh(
            new THREE.BoxGeometry(0.12, 0.12, 0.12),
            new THREE.MeshStandardMaterial({ color: 0xFF6600, emissive: 0xFF4400, emissiveIntensity: 1.5 })
          );
          p.position.copy(e.mesh.position);
          p.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5);
          p.userData.life = 0.8;
          scene.add(p);
        }
        scene.remove(e.mesh);
      } else {
        surviving.push(e);
      }
    });
    enemiesRef.current = surviving;
    setEnemyCount(surviving.length);
  }, []);

  const applyCommand = useCallback((cmd: GameCommand) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (cmd.action === "add_enemy") {
      const count = Math.min(cmd.count || 1, 5);
      for (let i = 0; i < count; i++) spawnEnemy(scene);
    }
    if (cmd.action === "add_object") {
      const pos = new THREE.Vector3((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 18);
      if (cmd.type === "tree") {
        const g = new THREE.Group();
        const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 1.5), new THREE.MeshStandardMaterial({ color: 0x8B6340 }));
        trunk.position.y = 0.75;
        const top = new THREE.Mesh(new THREE.SphereGeometry(0.8, 6, 5), new THREE.MeshStandardMaterial({ color: theme.floor }));
        top.position.y = 2.1;
        g.add(trunk); g.add(top); g.position.copy(pos); scene.add(g);
      } else {
        const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7),
          new THREE.MeshStandardMaterial({ color: theme.playerColor, emissive: theme.playerColor, emissiveIntensity: 0.4 }));
        box.position.copy(pos).setY(0.35);
        scene.add(box);
      }
    }
    if (cmd.action === "change_weapon" && weaponRef.current) {
      const effect = cmd.effect || "normal";
      const c = effect.includes("fire") ? 0xFF6600 : effect.includes("ice") ? 0x00D4FF : effect.includes("lightning") ? 0xFFFF00 : theme.playerColor;
      (weaponRef.current.material as THREE.MeshStandardMaterial).color.setHex(c);
      (weaponRef.current.material as THREE.MeshStandardMaterial).emissive.setHex(c);
    }
  }, [spawnEnemy, theme]);

  // Three.js init
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(theme.bgColor);
    scene.fog = new THREE.FogExp2(theme.fog, 0.025);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(65, mount.clientWidth / mount.clientHeight, 0.1, 200);
    camera.position.set(0, 4, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    mount.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, theme.ambientIntensity));
    if (themeKey !== "galaxy") {
      const sun = new THREE.DirectionalLight(0xfffbe0, 1.4);
      sun.position.set(10, 15, 10); sun.castShadow = true; scene.add(sun);
      scene.add(new THREE.HemisphereLight(theme.bgColor, theme.floor, 0.3));
    } else {
      const p1 = new THREE.PointLight(0xC77DFF, 4, 60); p1.position.set(0, 12, 0); scene.add(p1);
      const p2 = new THREE.PointLight(0x00D4FF, 2, 40); p2.position.set(10, 5, -10); scene.add(p2);
      for (let i = 0; i < 80; i++) {
        const star = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.07, 4, 4),
          new THREE.MeshStandardMaterial({ emissive: 0xffffff, emissiveIntensity: 4, color: 0xffffff }));
        star.position.set((Math.random() - 0.5) * 100, 5 + Math.random() * 30, (Math.random() - 0.5) * 100);
        scene.add(star);
      }
    }

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.MeshStandardMaterial({ color: theme.floor, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -0.5; floor.receiveShadow = true; scene.add(floor);
    for (let i = 0; i < 25; i++) {
      const patch = new THREE.Mesh(new THREE.PlaneGeometry(2 + Math.random() * 2, 2 + Math.random() * 2),
        new THREE.MeshStandardMaterial({ color: theme.floorDetail, roughness: 1 }));
      patch.rotation.x = -Math.PI / 2;
      patch.position.set((Math.random() - 0.5) * 50, -0.48, (Math.random() - 0.5) * 50);
      scene.add(patch);
    }

    // Player
    const player = buildHumanoid(theme.playerColor, false);
    player.position.copy(playerPosRef.current);
    scene.add(player);
    playerRef.current = player;
    const weapon = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.85, 0.12),
      new THREE.MeshStandardMaterial({ color: theme.playerColor, emissive: theme.playerColor, emissiveIntensity: 0.7, roughness: 0.1 }));
    weapon.position.set(0.7, 0.1, 0.1);
    player.add(weapon);
    weaponRef.current = weapon;
    const wLight = new THREE.PointLight(theme.playerColor, 1.5, 3);
    wLight.position.set(0.7, 0.1, 0.1);
    player.add(wLight);

    // Default enemies
    [new THREE.Vector3(-8, 0.8, -8), new THREE.Vector3(8, 0.8, -10), new THREE.Vector3(0, 0.8, -13)].forEach((p) => spawnEnemy(scene, p));

    // Resize
    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    };
    window.addEventListener("resize", onResize);

    // Game loop
    const clock = new THREE.Clock();
    const camTarget = new THREE.Vector3();
    const moveDir = new THREE.Vector3();

    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const k = keysRef.current;
      const j = joystickRef.current;

      moveDir.set(0, 0, 0);
      if (k.w || (j.active && j.dy < -0.3)) moveDir.z -= 1;
      if (k.s || (j.active && j.dy > 0.3)) moveDir.z += 1;
      if (k.a || (j.active && j.dx < -0.3)) moveDir.x -= 1;
      if (k.d || (j.active && j.dx > 0.3)) moveDir.x += 1;
      if (moveDir.length() > 0) { moveDir.normalize(); playerRotRef.current = Math.atan2(moveDir.x, moveDir.z); }

      playerVelRef.current.x = moveDir.x * 5;
      playerVelRef.current.z = moveDir.z * 5;
      if (k.space && onGroundRef.current) { playerVelRef.current.y = 8; onGroundRef.current = false; k.space = false; }
      playerVelRef.current.y -= 20 * delta;
      playerPosRef.current.addScaledVector(playerVelRef.current, delta);
      if (playerPosRef.current.y <= 0.8) { playerPosRef.current.y = 0.8; playerVelRef.current.y = 0; onGroundRef.current = true; }
      playerPosRef.current.x = Math.max(-24, Math.min(24, playerPosRef.current.x));
      playerPosRef.current.z = Math.max(-24, Math.min(24, playerPosRef.current.z));

      if (player) {
        player.position.copy(playerPosRef.current);
        player.rotation.y = playerRotRef.current;
        const armR = player.children[5] as THREE.Object3D;
        if (armR) {
          if (attackTimerRef.current > 0) { armR.rotation.x = -Math.PI / 2; attackTimerRef.current -= delta; }
          else armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, 0.2);
        }
      }

      camTarget.set(playerPosRef.current.x, playerPosRef.current.y + 3, playerPosRef.current.z + 8);
      camera.position.lerp(camTarget, 0.08);
      camera.lookAt(playerPosRef.current.x, playerPosRef.current.y + 1, playerPosRef.current.z);

      // Enemies
      enemiesRef.current.forEach((e) => {
        const dx = playerPosRef.current.x - e.mesh.position.x;
        const dz = playerPosRef.current.z - e.mesh.position.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        if (dist > 0.5) {
          e.mesh.position.x += (dx / dist) * 0.025;
          e.mesh.position.z += (dz / dist) * 0.025;
          e.mesh.rotation.y = Math.atan2(dx, dz);
        }
      });

      // Particles
      const toRemove: THREE.Object3D[] = [];
      scene.children.forEach((obj) => {
        if (obj.userData.life !== undefined) {
          obj.userData.life -= delta;
          if (obj.userData.vel) obj.position.addScaledVector(obj.userData.vel as THREE.Vector3, delta);
          if (obj.userData.vel) (obj.userData.vel as THREE.Vector3).y -= 8 * delta;
          obj.scale.multiplyScalar(0.97);
          if (obj.userData.life <= 0) toRemove.push(obj);
        }
      });
      toRemove.forEach((o) => scene.remove(o));

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const k = keysRef.current;
      if (e.code === "KeyW") k.w = true;
      if (e.code === "KeyA") k.a = true;
      if (e.code === "KeyS") k.s = true;
      if (e.code === "KeyD") k.d = true;
      if (e.code === "Space") { e.preventDefault(); k.space = true; }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      const k = keysRef.current;
      if (e.code === "KeyW") k.w = false; if (e.code === "KeyA") k.a = false;
      if (e.code === "KeyS") k.s = false; if (e.code === "KeyD") k.d = false;
      if (e.code === "Space") k.space = false;
    };
    const onClick = (e: MouseEvent) => { if ((e.target as HTMLElement).tagName === "CANVAS") triggerAttack(); };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("click", onClick);
    return () => { window.removeEventListener("keydown", onKeyDown); window.removeEventListener("keyup", onKeyUp); window.removeEventListener("click", onClick); };
  }, [triggerAttack]);

  useEffect(() => { joystickRef.current = joystick; }, [joystick]);

  const scrollChatToBottom = () => {
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const handleSendMessage = async (overrideMsg?: string) => {
    const msg = (overrideMsg ?? chatMessage).trim();
    if (!msg || isLoading) return;
    setChatMessage("");
    setChatHistory((h) => [...h, { role: "user", text: msg }]);
    setIsLoading(true);
    scrollChatToBottom();
    try {
      const res = await fetch("https://functions.poehali.dev/97def82a-1abb-45e6-9c01-a082dc689fa8", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg, style: themeKey, world_state: { enemies_count: enemyCount } }),
      });
      const data = await res.json();
      const reply = data.reply || "Готово! 🎮";
      setChatHistory((h) => [...h, { role: "ai", text: reply }]);
      if (data.commands) data.commands.forEach((cmd: GameCommand) => applyCommand(cmd));
    } catch {
      setChatHistory((h) => [...h, { role: "ai", text: "Что-то пошло не так, попробуй ещё раз! 🤖" }]);
    } finally {
      setIsLoading(false);
      scrollChatToBottom();
    }
  };

  const handleVoice = () => {
    const SR = (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition
      || (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition;
    if (!SR) {
      setChatHistory((h) => [...h, { role: "ai", text: "Голосовой ввод не поддерживается в этом браузере 😔" }]);
      return;
    }
    const recognition = new SR();
    recognition.lang = "ru-RU";
    recognition.interimResults = false;
    setIsListening(true);
    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results[0][0].transcript;
      setChatMessage(text);
      setIsListening(false);
      handleSendMessage(text);
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleJoystickStart = (e: React.TouchEvent) => {
    const t = e.changedTouches[0];
    joystickOrigin.current = { x: t.clientX, y: t.clientY };
    joystickTouchId.current = t.identifier;
    setJoystick({ dx: 0, dy: 0, active: true });
  };
  const handleJoystickMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const t = Array.from(e.changedTouches).find((x) => x.identifier === joystickTouchId.current);
    if (!t) return;
    const dx = (t.clientX - joystickOrigin.current.x) / 40;
    const dy = (t.clientY - joystickOrigin.current.y) / 40;
    const len = Math.sqrt(dx * dx + dy * dy);
    setJoystick(len > 1 ? { dx: dx / len, dy: dy / len, active: true } : { dx, dy, active: true });
  };
  const handleJoystickEnd = () => { joystickTouchId.current = null; setJoystick({ dx: 0, dy: 0, active: false }); };

  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: theme.bgCss }}>
      <div ref={mountRef} className="absolute inset-0" />

      {/* HUD top-left */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <button onClick={() => navigate("/game")}
          className="flex items-center gap-1 px-3 py-1.5 rounded font-pixel text-[8px]"
          style={{ background: "#00000099", border: `1px solid ${theme.accentCss}`, color: theme.accentCss, backdropFilter: "blur(4px)" }}>
          <Icon name="ArrowLeft" size={12} /> ВЫЙТИ
        </button>
        <div className="px-3 py-1.5 rounded font-pixel text-[8px]"
          style={{ background: "#00000099", border: `1px solid ${theme.accentCss}`, color: theme.accentCss, backdropFilter: "blur(4px)" }}>
          {theme.name.toUpperCase()}
        </div>
      </div>

      {/* HUD top-right */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 px-3 py-1.5 rounded font-pixel text-[8px]"
        style={{ background: "#00000099", border: "1px solid #ff444488", color: "#ff4444", backdropFilter: "blur(4px)" }}>
        <Icon name="Skull" size={12} /> {enemyCount} ВРАГОВ
      </div>

      {/* Desktop hint */}
      {!isMobile && (
        <div className="absolute bottom-20 right-3 z-10 px-3 py-2 rounded font-pixel text-[7px] leading-relaxed"
          style={{ background: "#00000088", border: "1px solid #ffffff22", color: "#ffffff88", backdropFilter: "blur(4px)" }}>
          WASD — движение<br />ПРОБЕЛ — прыжок<br />ЛКМ — удар
        </div>
      )}

      {/* Mobile controls — над чатом */}
      {isMobile && (
        <>
          <div className="absolute z-10 w-24 h-24 rounded-full flex items-center justify-center select-none"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", left: "24px",
              background: "#00000066", border: `2px solid ${theme.accentCss}55`, backdropFilter: "blur(4px)", touchAction: "none" }}
            onTouchStart={handleJoystickStart} onTouchMove={handleJoystickMove} onTouchEnd={handleJoystickEnd}>
            <div className="w-10 h-10 rounded-full"
              style={{ background: theme.accentCss, opacity: 0.85,
                transform: joystick.active ? `translate(${joystick.dx * 16}px, ${joystick.dy * 16}px)` : "none",
                transition: joystick.active ? "none" : "transform 0.15s ease" }} />
          </div>
          <div className="absolute z-10 flex flex-col gap-2 items-end"
            style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 80px)", right: "24px" }}>
            <button className="w-16 h-16 rounded-full text-2xl flex items-center justify-center select-none"
              style={{ background: `${theme.accentCss}cc`, border: `2px solid ${theme.accentCss}`, touchAction: "manipulation" }}
              onTouchStart={(e) => { e.preventDefault(); triggerAttack(); }}>⚔️</button>
            <button className="w-12 h-12 rounded-full text-xl flex items-center justify-center select-none"
              style={{ background: "#ffffff22", border: "2px solid #ffffff44", touchAction: "manipulation" }}
              onTouchStart={(e) => { e.preventDefault(); keysRef.current.space = true; setTimeout(() => { keysRef.current.space = false; }, 120); }}>🦘</button>
          </div>
        </>
      )}

      {/* AI Chat — раскрывающееся окно + строка ввода */}
      <div className="absolute left-0 right-0 z-20 flex flex-col"
        style={{ bottom: 0, paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>

        {/* История сообщений (видна когда chatOpen) */}
        {chatOpen && (
          <div className="mx-2 mb-1 rounded-xl overflow-hidden flex flex-col"
            style={{ background: "#000000cc", border: `1px solid ${theme.accentCss}44`, backdropFilter: "blur(12px)", maxHeight: "220px" }}>
            <div className="flex items-center justify-between px-3 py-2 border-b" style={{ borderColor: `${theme.accentCss}33` }}>
              <span className="font-pixel text-[7px]" style={{ color: theme.accentCss }}>🤖 ИИ АССИСТЕНТ</span>
              <button onClick={() => setChatOpen(false)} className="text-gray-400 hover:text-white text-xs leading-none">✕</button>
            </div>
            <div className="overflow-y-auto flex-1 px-3 py-2 flex flex-col gap-2" style={{ maxHeight: "160px" }}>
              {chatHistory.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className="font-rubik text-xs px-3 py-1.5 rounded-xl max-w-[80%]"
                    style={msg.role === "user"
                      ? { background: theme.accentCss, color: "#000" }
                      : { background: "#ffffff15", color: "#fff", border: `1px solid ${theme.accentCss}33` }}>
                    {msg.text}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="font-rubik text-xs px-3 py-1.5 rounded-xl" style={{ background: "#ffffff15", color: "#ffffff88" }}>
                    <span className="animate-pulse">думаю...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>
        )}

        {/* Строка ввода — всегда видна */}
        <div className="flex items-center gap-2 px-3 mx-0"
          style={{ height: "60px", background: "#000000ee", borderTop: `2px solid ${theme.accentCss}55` }}>
          {/* Кнопка открыть чат */}
          <button
            onClick={() => setChatOpen((o) => !o)}
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-base relative"
            style={{ background: chatOpen ? theme.accentCss : "#ffffff15", border: `1px solid ${theme.accentCss}66` }}>
            🤖
            {!chatOpen && chatHistory.length > 1 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full font-pixel text-[7px] flex items-center justify-center"
                style={{ background: theme.accentCss, color: "#000" }}>
                {chatHistory.length}
              </span>
            )}
          </button>

          <input
            className="flex-1 outline-none font-rubik text-sm text-white placeholder-gray-500 rounded-lg px-3 py-2"
            style={{ background: "#ffffff10", border: `1px solid ${theme.accentCss}33` }}
            placeholder="Добавь роботов, поставь дерево..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onFocus={() => setChatOpen(true)}
            onKeyDown={(e) => e.key === "Enter" && handleSendMessage()} />

          {/* Микрофон */}
          <button
            onClick={handleVoice}
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center text-base"
            style={{ background: isListening ? "#ff4444" : "#ffffff15", border: `1px solid ${isListening ? "#ff4444" : "#ffffff33"}`,
              animation: isListening ? "pulse 1s infinite" : "none" }}>
            <Icon name="Mic" size={16} className={isListening ? "text-white" : "text-gray-400"} />
          </button>

          {/* Отправить */}
          <button
            onClick={() => handleSendMessage()}
            disabled={isLoading || !chatMessage.trim()}
            className="w-9 h-9 rounded-lg flex-shrink-0 flex items-center justify-center font-pixel text-[10px]"
            style={{ background: chatMessage.trim() && !isLoading ? theme.accentCss : "#333",
              color: chatMessage.trim() && !isLoading ? "#000" : "#555",
              border: `1px solid ${theme.accentCss}44` }}>
            {isLoading ? "…" : "▶"}
          </button>
        </div>
      </div>

      {/* CRT overlay */}
      <div className="pointer-events-none fixed inset-0 z-30 opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)" }} />
    </div>
  );
}