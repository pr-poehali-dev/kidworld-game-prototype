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

interface PartSpec {
  geo: { type: string; w?: number; h?: number; d?: number; r?: number; rt?: number; rb?: number; segments?: number };
  mat: { color: number; emissive?: number; emissiveIntensity?: number; roughness?: number; metalness?: number; transparent?: boolean; opacity?: number; texture?: string };
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number];
  children?: PartSpec[];
}

interface GameCommand {
  action: string; type?: string; count?: number; effect?: string; skin?: string;
  name?: string; parts?: PartSpec[]; preset?: string; mountable?: boolean; mount_offset?: [number, number, number]; speed?: number;
}

interface MountableObj {
  mesh: THREE.Group; speed: number; mountOffset: THREE.Vector3;
}

// Генерация процедурной текстуры по типу
function makeTexture(type: string, baseColor: number): THREE.CanvasTexture {
  const size = 128;
  const c = document.createElement("canvas"); c.width = size; c.height = size;
  const ctx = c.getContext("2d")!;
  const r = (baseColor >> 16) & 0xff, g2 = (baseColor >> 8) & 0xff, b = baseColor & 0xff;
  const hex = `rgb(${r},${g2},${b})`;
  const dark = `rgb(${Math.max(0,r-40)},${Math.max(0,g2-40)},${Math.max(0,b-40)})`;
  const light = `rgb(${Math.min(255,r+40)},${Math.min(255,g2+40)},${Math.min(255,b+40)})`;

  ctx.fillStyle = hex; ctx.fillRect(0, 0, size, size);

  if (type === "grass") {
    ctx.fillStyle = dark;
    for (let i = 0; i < 60; i++) { ctx.fillRect(Math.random()*size, Math.random()*size, 2+Math.random()*4, 1); }
    ctx.fillStyle = light;
    for (let i = 0; i < 30; i++) { ctx.fillRect(Math.random()*size, Math.random()*size, 1, 3+Math.random()*6); }
  } else if (type === "wood" || type === "bark") {
    ctx.fillStyle = dark;
    for (let y = 0; y < size; y += 6+Math.random()*4) { ctx.fillRect(0, y, size, 1+Math.random()*2); }
    ctx.fillStyle = light;
    for (let i = 0; i < 20; i++) { const x=Math.random()*size; ctx.fillRect(x, 0, 1, size); }
  } else if (type === "stone" || type === "rock") {
    ctx.fillStyle = dark;
    for (let i = 0; i < 40; i++) { ctx.beginPath(); ctx.arc(Math.random()*size, Math.random()*size, 2+Math.random()*8, 0, Math.PI*2); ctx.fill(); }
    ctx.fillStyle = light;
    for (let i = 0; i < 20; i++) { ctx.fillRect(Math.random()*size, Math.random()*size, 1+Math.random()*3, 1); }
  } else if (type === "brick") {
    ctx.fillStyle = dark;
    const bh = 16, bw = 32;
    for (let row = 0; row * bh < size; row++) {
      const off = (row % 2) * (bw/2);
      for (let col = -1; col * bw < size; col++) { ctx.fillRect(col*bw+off, row*bh, bw-2, bh-2); }
      ctx.fillRect(0, row*bh+bh-1, size, 1);
    }
  } else if (type === "fur" || type === "skin") {
    for (let i = 0; i < 200; i++) {
      const x = Math.random()*size, y = Math.random()*size;
      ctx.fillStyle = Math.random()>0.5 ? dark : light;
      ctx.fillRect(x, y, 1+Math.random()*2, 1+Math.random()*2);
    }
  } else if (type === "metal") {
    const grad = ctx.createLinearGradient(0,0,size,size);
    grad.addColorStop(0, light); grad.addColorStop(0.5, dark); grad.addColorStop(1, light);
    ctx.fillStyle = grad; ctx.fillRect(0,0,size,size);
    ctx.fillStyle = `rgba(255,255,255,0.15)`;
    for (let i = 0; i < 10; i++) { ctx.fillRect(0, Math.random()*size, size, 1); }
  } else if (type === "leaf" || type === "leaves") {
    ctx.fillStyle = dark;
    for (let i = 0; i < 80; i++) { ctx.beginPath(); ctx.ellipse(Math.random()*size, Math.random()*size, 3+Math.random()*5, 2+Math.random()*3, Math.random()*Math.PI, 0, Math.PI*2); ctx.fill(); }
  } else if (type === "sand") {
    for (let i = 0; i < 300; i++) { ctx.fillStyle = Math.random()>0.5?dark:light; ctx.fillRect(Math.random()*size,Math.random()*size,1,1); }
  } else if (type === "water") {
    const wg = ctx.createLinearGradient(0,0,0,size);
    wg.addColorStop(0,light); wg.addColorStop(1,dark);
    ctx.fillStyle=wg; ctx.fillRect(0,0,size,size);
    ctx.strokeStyle=`rgba(255,255,255,0.3)`; ctx.lineWidth=1;
    for(let y=0;y<size;y+=8){ctx.beginPath();ctx.moveTo(0,y+4*Math.sin(y*0.3));ctx.quadraticCurveTo(size/2,y+6*Math.sin(y*0.5),size,y+4*Math.sin(y*0.7));ctx.stroke();}
  } else if (type === "snow") {
    ctx.fillStyle="#fff"; ctx.fillRect(0,0,size,size);
    ctx.fillStyle="rgba(200,220,255,0.5)";
    for(let i=0;i<60;i++){ctx.beginPath();ctx.arc(Math.random()*size,Math.random()*size,1+Math.random()*4,0,Math.PI*2);ctx.fill();}
  } else if (type === "lava") {
    ctx.fillStyle="#ff4400"; ctx.fillRect(0,0,size,size);
    ctx.fillStyle="#ff8800";
    for(let i=0;i<30;i++){ctx.beginPath();ctx.arc(Math.random()*size,Math.random()*size,5+Math.random()*15,0,Math.PI*2);ctx.fill();}
    ctx.fillStyle="#ffcc00";
    for(let i=0;i<15;i++){ctx.beginPath();ctx.arc(Math.random()*size,Math.random()*size,2+Math.random()*6,0,Math.PI*2);ctx.fill();}
  }

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  return tex;
}

function buildFromSpec(parts: PartSpec[]): THREE.Group {
  const g = new THREE.Group();
  const addParts = (parent: THREE.Object3D, specs: PartSpec[]) => {
    for (const p of specs) {
      let geometry: THREE.BufferGeometry;
      const { geo } = p;
      const segs = geo.segments ?? 12;
      if (geo.type === "box") geometry = new THREE.BoxGeometry(geo.w ?? 1, geo.h ?? 1, geo.d ?? 1);
      else if (geo.type === "sphere") geometry = new THREE.SphereGeometry(geo.r ?? 0.5, segs, segs);
      else if (geo.type === "cylinder") geometry = new THREE.CylinderGeometry(geo.rt ?? 0.5, geo.rb ?? 0.5, geo.h ?? 1, segs);
      else if (geo.type === "cone") geometry = new THREE.ConeGeometry(geo.r ?? 0.5, geo.h ?? 1, segs);
      else if (geo.type === "torus") geometry = new THREE.TorusGeometry(geo.r ?? 0.5, (geo.rt ?? 0.1), segs, segs);
      else geometry = new THREE.BoxGeometry(1, 1, 1);

      const matOpts: THREE.MeshStandardMaterialParameters = {
        color: p.mat.color,
        roughness: p.mat.roughness ?? 0.65,
        metalness: p.mat.metalness ?? 0,
      };
      if (p.mat.texture) { matOpts.map = makeTexture(p.mat.texture, p.mat.color); matOpts.color = 0xffffff; }
      if (p.mat.emissive !== undefined) { matOpts.emissive = new THREE.Color(p.mat.emissive); matOpts.emissiveIntensity = p.mat.emissiveIntensity ?? 1; }
      if (p.mat.transparent) { matOpts.transparent = true; matOpts.opacity = p.mat.opacity ?? 0.7; }

      const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial(matOpts));
      if (p.pos) mesh.position.set(...p.pos);
      if (p.rot) mesh.rotation.set(...p.rot);
      if (p.scale) mesh.scale.set(...p.scale);
      parent.add(mesh);
      if (p.children) addParts(mesh, p.children);
    }
  };
  addParts(g, parts);
  return g;
}

// Встроенные детальные пресеты — не зависят от ИИ
function buildPreset(preset: string): THREE.Group | null {
  const g = new THREE.Group();
  if (preset === "cat") {
    const fur = (c: number) => new THREE.MeshStandardMaterial({ map: makeTexture("fur", c), roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), fur(0xD4845A));
    body.scale.set(1, 0.8, 1.3); body.position.y = 0.3; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 8), fur(0xD4845A));
    head.position.set(0, 0.62, 0.3); g.add(head);
    const earL = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), fur(0xD4845A));
    earL.position.set(-0.15, 0.9, 0.3); g.add(earL);
    const earR = earL.clone(); earR.position.set(0.15, 0.9, 0.3); g.add(earR);
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x22cc44, emissive: 0x22cc44, emissiveIntensity: 0.5 });
    const eyeL2 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), eyeM);
    eyeL2.position.set(-0.1, 0.65, 0.55); g.add(eyeL2);
    const eyeR2 = eyeL2.clone(); eyeR2.position.set(0.1, 0.65, 0.55); g.add(eyeR2);
    const noseM = new THREE.MeshStandardMaterial({ color: 0xff6688 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 4, 4), noseM);
    nose.position.set(0, 0.59, 0.57); g.add(nose);
    const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0.3,-0.45), new THREE.Vector3(0.2,0.6,-0.6), new THREE.Vector3(0.3,1.0,-0.5)]);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 8, 0.05, 6, false), fur(0xD4845A));
    g.add(tail);
    [[-.2,0,.2],[.2,0,.2],[-.15,0,-.35],[.15,0,-.35]].forEach(([x,_,z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.07,0.06,0.3,6), fur(0xD4845A));
      leg.position.set(x, 0.04, z ?? 0); g.add(leg);
    });
    return g;
  }
  if (preset === "dog") {
    const fur = (c: number) => new THREE.MeshStandardMaterial({ map: makeTexture("fur", c), roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.4, 10, 8), fur(0xC8882A));
    body.scale.set(1, 0.85, 1.5); body.position.y = 0.38; g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), fur(0xC8882A));
    head.position.set(0, 0.72, 0.45); g.add(head);
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), fur(0xB87020));
    snout.scale.set(1,0.7,1.2); snout.position.set(0, 0.65, 0.72); g.add(snout);
    const earL = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), fur(0xA06010));
    earL.scale.set(0.6,1.2,0.4); earL.position.set(-0.28,0.88,0.4); g.add(earL);
    const earR = earL.clone(); earR.position.set(0.28,0.88,0.4); g.add(earR);
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x3d1a00, emissive: 0x1a0800, emissiveIntensity: 0.3 });
    [-0.11,0.11].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.055,6,6), eyeM); e.position.set(x,0.76,0.73); g.add(e); });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.05,6,6), new THREE.MeshStandardMaterial({color:0x111111}));
    nose.position.set(0,0.67,0.85); g.add(nose);
    [[-.2,0,.3],[.2,0,.3],[-.18,0,-.38],[.18,0,-.38]].forEach(([x,_,z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08,0.07,0.38,7), fur(0xC8882A));
      leg.position.set(x,0.05,z??0); g.add(leg);
    });
    return g;
  }
  if (preset === "tree") {
    const trunkM = new THREE.MeshStandardMaterial({ map: makeTexture("bark", 0x8B6340) });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.28, 1.8, 10), trunkM);
    trunk.position.y = 0.9; g.add(trunk);
    const leafM = new THREE.MeshStandardMaterial({ map: makeTexture("leaves", 0x2d8a2d), roughness: 0.9 });
    [[0,2.6,0,1.1],[0,3.3,0,0.85],[0,3.9,0,0.6]].forEach(([x,y,z,r]) => {
      const s = new THREE.Mesh(new THREE.SphereGeometry(r,9,7), leafM);
      s.position.set(x,y,z); s.scale.y=0.75; g.add(s);
    });
    [[-0.5,1.8,0.3],[0.6,2.0,-0.2],[0,1.6,-0.5],[0.3,2.2,0.5]].forEach(([x,y,z]) => {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.08,0.5,5), trunkM);
      b.position.set(x,y,z); b.rotation.z=x*0.8; b.rotation.x=z*0.8; g.add(b);
    });
    return g;
  }
  if (preset === "house") {
    const wallM = new THREE.MeshStandardMaterial({ map: makeTexture("brick", 0xE8C89A) });
    const roofM = new THREE.MeshStandardMaterial({ map: makeTexture("wood", 0xA0522D) });
    const winM = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.2 });
    const doorM = new THREE.MeshStandardMaterial({ map: makeTexture("wood", 0x8B4513) });
    const walls = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 3), wallM);
    walls.position.y = 1.25; g.add(walls);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.3, 1.5, 4), roofM);
    roof.position.y = 3.25; roof.rotation.y = Math.PI/4; g.add(roof);
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.2, 0.08), doorM);
    door.position.set(0, 0.6, 1.54); g.add(door);
    [[-0.85, 1.4],[ 0.85, 1.4]].forEach(([x,y]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.6,0.6,0.08), winM);
      win.position.set(x, y, 1.54); g.add(win);
    });
    const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.3,0.8,0.3), wallM);
    chimney.position.set(0.8, 3.5, -0.5); g.add(chimney);
    return g;
  }
  if (preset === "castle") {
    const stoneM = new THREE.MeshStandardMaterial({ map: makeTexture("stone", 0x888888) });
    const darkM = new THREE.MeshStandardMaterial({ map: makeTexture("stone", 0x555555) });
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 3, 5), stoneM);
    base.position.y = 1.5; g.add(base);
    [[2.5,0],[-2.5,0],[0,2.5],[0,-2.5]].forEach(([x,z]) => {
      const t = new THREE.Mesh(new THREE.CylinderGeometry(0.7,0.8,4.5,8), darkM);
      t.position.set(x,2.25,z); g.add(t);
      for(let i=0;i<6;i++){ const m=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.4,0.4),stoneM); m.position.set(x+0.5*Math.cos(i*Math.PI/3),4.6,z+0.5*Math.sin(i*Math.PI/3)); g.add(m); }
    });
    const gate = new THREE.Mesh(new THREE.BoxGeometry(1.2,1.8,0.2), darkM);
    gate.position.set(0,0.9,2.6); g.add(gate);
    return g;
  }
  if (preset === "car") {
    const paintM = new THREE.MeshStandardMaterial({ color: 0xcc2222, roughness: 0.3, metalness: 0.6 });
    const wheelM = new THREE.MeshStandardMaterial({ map: makeTexture("rock", 0x222222), roughness: 0.95 });
    const glassM = new THREE.MeshStandardMaterial({ color: 0x88ddff, transparent: true, opacity: 0.6, roughness: 0.05, metalness: 0.2 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.55, 1.0), paintM);
    body.position.y = 0.45; g.add(body);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.45, 0.88), paintM);
    cab.position.set(-0.1, 0.92, 0); g.add(cab);
    const winF = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.38, 0.78), glassM);
    winF.position.set(0.56, 0.92, 0); g.add(winF);
    const winB = winF.clone(); winB.position.set(-0.66, 0.92, 0); g.add(winB);
    [[0.85,0.22,0.55],[0.85,0.22,-0.55],[-0.75,0.22,0.55],[-0.75,0.22,-0.55]].forEach(([x,y,z]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.22,0.22,0.18,12), wheelM);
      wheel.rotation.z = Math.PI/2; wheel.position.set(x,y,z); g.add(wheel);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.12,0.2,6), new THREE.MeshStandardMaterial({color:0xbbbbbb,metalness:0.8,roughness:0.2}));
      rim.rotation.z = Math.PI/2; rim.position.set(x,y,z); g.add(rim);
    });
    return g;
  }
  if (preset === "person" || preset === "friend" || preset === "human") {
    const skinM = new THREE.MeshStandardMaterial({ map: makeTexture("skin", 0xF5CBA7), roughness: 0.7 });
    const shirtM = new THREE.MeshStandardMaterial({ map: makeTexture("fur", 0x4A90D9), roughness: 0.85 });
    const pantsM = new THREE.MeshStandardMaterial({ map: makeTexture("fur", 0x1a3a6a), roughness: 0.85 });
    const hairM = new THREE.MeshStandardMaterial({ map: makeTexture("fur", 0x3d1c00), roughness: 0.9 });
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), skinM);
    head.scale.set(1, 1.1, 0.95); head.position.y = 1.55; g.add(head);
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), hairM);
    hair.scale.set(1.05, 0.6, 1.05); hair.position.set(0, 1.73, -0.03); g.add(hair);
    const eyeM = new THREE.MeshStandardMaterial({ color: 0x1a4a8a, roughness: 0.2 });
    const pupilM = new THREE.MeshStandardMaterial({ color: 0x050505 });
    [-0.1,0.1].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055,7,7), eyeM);
      eye.position.set(x, 1.57, 0.26); g.add(eye);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.025,5,5), pupilM);
      pupil.position.set(x, 1.57, 0.31); g.add(pupil);
    });
    const noseM = new THREE.MeshStandardMaterial({ map: makeTexture("skin", 0xE8B090), roughness: 0.8 });
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04,6,5), noseM);
    nose.scale.set(0.7,0.6,1.2); nose.position.set(0, 1.52, 0.29); g.add(nose);
    const mouthM = new THREE.MeshStandardMaterial({ color: 0xcc6655 });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.025, 0.02), mouthM);
    mouth.position.set(0, 1.46, 0.28); g.add(mouth);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.1,0.15,8), skinM);
    neck.position.y = 1.32; g.add(neck);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.7, 0.3), shirtM);
    torso.position.y = 0.9; g.add(torso);
    const shoulder = (side: number) => {
      const sh = new THREE.Mesh(new THREE.SphereGeometry(0.12,7,6), shirtM);
      sh.position.set(side*0.34, 1.18, 0); g.add(sh);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.08,0.45,8), shirtM);
      arm.position.set(side*0.4, 0.9, 0); g.add(arm);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.065,0.38,8), skinM);
      forearm.position.set(side*0.43, 0.58, 0); g.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075,7,6), skinM);
      hand.scale.set(0.9,0.8,1.1); hand.position.set(side*0.45, 0.37, 0); g.add(hand);
    };
    shoulder(-1); shoulder(1);
    const hips = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.22, 0.28), pantsM);
    hips.position.y = 0.51; g.add(hips);
    [-0.14, 0.14].forEach(x => {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.1,0.42,8), pantsM);
      thigh.position.set(x, 0.22, 0); g.add(thigh);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.08,0.4,8), pantsM);
      shin.position.set(x, -0.1, 0); g.add(shin);
      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2,0.1,0.32), new THREE.MeshStandardMaterial({color:0x2a1a0a,roughness:0.8}));
      shoe.position.set(x, -0.32, 0.04); g.add(shoe);
    });
    return g;
  }
  if (preset === "dragon") {
    const scaleM = new THREE.MeshStandardMaterial({ map: makeTexture("rock", 0x1a6622), roughness: 0.7, metalness: 0.2 });
    const darkScaleM = new THREE.MeshStandardMaterial({ map: makeTexture("rock", 0x0d3311), roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.7, 10, 8), scaleM);
    body.scale.set(1, 0.85, 1.6); body.position.y = 0.8; g.add(body);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2,0.35,0.8,8), scaleM);
    neck.rotation.x = -0.4; neck.position.set(0, 1.3, 0.65); g.add(neck);
    const head2 = new THREE.Mesh(new THREE.SphereGeometry(0.35, 10, 8), scaleM);
    head2.scale.set(1,0.85,1.3); head2.position.set(0, 1.6, 1.1); g.add(head2);
    const snout2 = new THREE.Mesh(new THREE.BoxGeometry(0.25,0.18,0.4), scaleM);
    snout2.position.set(0,1.55,1.4); g.add(snout2);
    const eyeGlow = new THREE.MeshStandardMaterial({ color: 0xff4400, emissive: 0xff4400, emissiveIntensity: 2 });
    [-0.15,0.15].forEach(x => { const e = new THREE.Mesh(new THREE.SphereGeometry(0.07,6,6), eyeGlow); e.position.set(x,1.68,1.28); g.add(e); });
    const hornM = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4 });
    [-0.15,0.15].forEach(x => { const h = new THREE.Mesh(new THREE.ConeGeometry(0.06,0.35,5), hornM); h.position.set(x,1.97,1.06); g.add(h); });
    [[-.5,0.5,.7],[.5,0.5,.7],[-.4,0.5,-.5],[.4,0.5,-.5]].forEach(([x,y,z]) => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.12,0.1,0.55,7), scaleM);
      leg.position.set(x,y,z??0); g.add(leg);
    });
    const wingCurve = (side: number) => {
      const wg = new THREE.Group();
      const bone = new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.06,1.2,6), darkScaleM);
      bone.rotation.z = side*(-Math.PI/3); bone.position.set(side*0.8, 1.2, 0); wg.add(bone);
      const membrane = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.7), new THREE.MeshStandardMaterial({color:0x1a4411,side:THREE.DoubleSide,transparent:true,opacity:0.85}));
      membrane.rotation.z = side*(Math.PI/4); membrane.position.set(side*1.0,1.0,0); wg.add(membrane);
      return wg;
    };
    g.add(wingCurve(-1)); g.add(wingCurve(1));
    const tailC = new THREE.CatmullRomCurve3([new THREE.Vector3(0,0.6,-1),new THREE.Vector3(0.3,0.4,-1.6),new THREE.Vector3(0.6,0.2,-2.2),new THREE.Vector3(0.4,0.1,-2.8)]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(tailC,10,0.12,7,false), scaleM));
    return g;
  }
  if (preset === "robot") {
    const metalM = new THREE.MeshStandardMaterial({ map: makeTexture("metal", 0x888899), roughness: 0.3, metalness: 0.9 });
    const darkM2 = new THREE.MeshStandardMaterial({ color: 0x222233, roughness: 0.4, metalness: 0.7 });
    const glowM = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 1.5 });
    const torso2 = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.45), metalM);
    torso2.position.y = 0.85; g.add(torso2);
    for(let i=0;i<3;i++){const d=new THREE.Mesh(new THREE.CylinderGeometry(0.04,0.04,0.05,6),glowM);d.rotation.x=Math.PI/2;d.position.set(-0.15+i*0.15,0.95,0.23);g.add(d);}
    const head3 = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.48, 0.48), metalM);
    head3.position.y = 1.55; g.add(head3);
    [-0.12,0.12].forEach(x=>{const v=new THREE.Mesh(new THREE.BoxGeometry(0.12,0.08,0.06),glowM);v.position.set(x,1.58,0.25);g.add(v);});
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.02,0.02,0.3,4), darkM2);
    ant.position.set(0,1.86,0); g.add(ant);
    const antTop = new THREE.Mesh(new THREE.SphereGeometry(0.04,5,5), glowM);
    antTop.position.set(0,2.02,0); g.add(antTop);
    [-1,1].forEach(side=>{
      const shoulder2=new THREE.Mesh(new THREE.SphereGeometry(0.15,7,6),metalM);shoulder2.position.set(side*0.48,1.18,0);g.add(shoulder2);
      const arm2=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.55,0.2),metalM);arm2.position.set(side*0.55,0.88,0);g.add(arm2);
      const claw=new THREE.Mesh(new THREE.BoxGeometry(0.25,0.2,0.25),darkM2);claw.position.set(side*0.57,0.55,0);g.add(claw);
    });
    [-0.16,0.16].forEach(x=>{
      const thigh2=new THREE.Mesh(new THREE.BoxGeometry(0.24,0.42,0.24),metalM);thigh2.position.set(x,0.28,0);g.add(thigh2);
      const shin2=new THREE.Mesh(new THREE.BoxGeometry(0.2,0.4,0.2),darkM2);shin2.position.set(x,-0.08,0);g.add(shin2);
      const foot=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.1,0.38),metalM);foot.position.set(x,-0.34,0.05);g.add(foot);
    });
    return g;
  }
  return null;
}

function buildHumanoid(bodyColor: number, glowEyes = false): THREE.Group {
  const g = new THREE.Group();
  const skinTex = makeTexture("skin", bodyColor);
  const mat = (c: number, tex?: THREE.CanvasTexture) => new THREE.MeshStandardMaterial({ color: tex ? 0xffffff : c, map: tex, roughness: 0.6 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.35), mat(bodyColor, skinTex));
  body.position.y = 0.05; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 9), mat(bodyColor, skinTex));
  head.scale.set(1.05, 1.1, 1.0); head.position.y = 0.72; g.add(head);
  const hairTex = makeTexture("fur", 0x2a1000);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.3, 9, 7), mat(0x2a1000, hairTex));
  hair.scale.set(1.05, 0.55, 1.05); hair.position.set(0, 0.92, -0.02); g.add(hair);
  const eyeM = new THREE.MeshStandardMaterial({ color: glowEyes ? 0xff2200 : 0x1144aa, emissive: glowEyes ? 0xff2200 : 0, emissiveIntensity: glowEyes ? 3 : 0 });
  const pupilM = new THREE.MeshStandardMaterial({ color: 0x050505 });
  [-0.1, 0.1].forEach(x => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 7), eyeM);
    eye.position.set(x, 0.75, 0.26); g.add(eye);
    if (!glowEyes) { const p = new THREE.Mesh(new THREE.SphereGeometry(0.025,5,5), pupilM); p.position.set(x,0.75,0.31); g.add(p); }
  });
  const armTex = makeTexture("skin", bodyColor);
  const armL = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.65, 7), mat(bodyColor, armTex));
  armL.position.set(-0.42, 0.05, 0); g.add(armL);
  const armR = armL.clone(); armR.position.set(0.42, 0.05, 0); g.add(armR);
  const legTex = makeTexture("fur", 0x1a2a4a);
  const legL = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.09, 0.6, 7), mat(0x1a2a4a, legTex));
  legL.position.set(-0.15, -0.68, 0); g.add(legL);
  const legR = legL.clone(); legR.position.set(0.15, -0.68, 0); g.add(legR);
  const shoeM = new THREE.MeshStandardMaterial({ color: 0x2a1000, roughness: 0.9 });
  [-0.15, 0.15].forEach(x => { const s = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.3), shoeM); s.position.set(x, -1.02, 0.04); g.add(s); });
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
  const keysRef = useRef({ w: false, a: false, s: false, d: false, space: false, q: false, e2: false });
  const joystickRef = useRef({ dx: 0, dy: 0, active: false });
  const camYawRef = useRef(0); // угол камеры вокруг игрока
  const camPitchRef = useRef(0.45); // наклон камеры
  const camDist = 9;
  const isDraggingCamRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const collidersRef = useRef<THREE.Box3[]>([]); // коллизии объектов
  const mountablesRef = useRef<MountableObj[]>([]);
  const mountedRef = useRef<MountableObj | null>(null);
  const [mountHint, setMountHint] = useState<string | null>(null);

  const [placementMode, setPlacementMode] = useState<{ cmd: GameCommand; scale: number } | null>(null);
  const placementModeRef = useRef<{ cmd: GameCommand; scale: number } | null>(null);
  const ghostRef = useRef<THREE.Group | null>(null);
  const raycasterRef = useRef(new THREE.Raycaster());
  const floorPlaneRef = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [enemyCount, setEnemyCount] = useState(3);
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "Привет! Я строю всё что ты скажешь прямо в игре 🎮\n\nПопробуй:\n• «Добавь горы»\n• «Поставь красный автомобиль»\n• «Построй замок»\n• «Добавь 5 зомби»\n• «Поставь волшебное дерево со светящимися плодами»" }
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

  const confirmPlacement = useCallback((position: THREE.Vector3, scale: number) => {
    const scene = sceneRef.current;
    const mode = placementModeRef.current;
    if (!scene || !mode) return;

    if (ghostRef.current) { scene.remove(ghostRef.current); ghostRef.current = null; }

    const cmd = mode.cmd;
    const copies = Math.min(cmd.count || 1, 6);
    for (let c = 0; c < copies; c++) {
      let obj: THREE.Group | null = null;
      if (cmd.preset) obj = buildPreset(cmd.preset);
      if (!obj && cmd.parts && cmd.parts.length > 0) obj = buildFromSpec(cmd.parts);
      if (!obj) continue;
      const angle = (c / copies) * Math.PI * 2;
      const offset = copies > 1 ? 3 : 0;
      obj.position.set(position.x + Math.sin(angle) * offset, 0, position.z + Math.cos(angle) * offset);
      obj.scale.setScalar(scale);
      scene.add(obj);
      setTimeout(() => {
        const box = new THREE.Box3().setFromObject(obj!);
        if (!box.isEmpty()) collidersRef.current.push(box);
      }, 100);
      if (cmd.mountable) {
        mountablesRef.current.push({
          mesh: obj,
          speed: cmd.speed ?? 8,
          mountOffset: new THREE.Vector3(...(cmd.mount_offset ?? [0, 1.2, 0])).multiplyScalar(scale),
        });
      }
    }
    setPlacementMode(null);
  }, []);

  const applyCommand = useCallback((cmd: GameCommand) => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Добавить врагов
    if (cmd.action === "add_enemy") {
      const count = Math.min(cmd.count || 1, 8);
      for (let i = 0; i < count; i++) spawnEnemy(scene);
    }

    // Процедурная генерация — входим в режим размещения (поддержка и пресетов и proc_build)
    if (cmd.action === "proc_build" && (cmd.preset || (cmd.parts && cmd.parts.length > 0))) {
      setPlacementMode({ cmd, scale: 1.0 });
      if (ghostRef.current) scene.remove(ghostRef.current);
      let ghost: THREE.Group | null = null;
      if (cmd.preset) ghost = buildPreset(cmd.preset);
      if (!ghost && cmd.parts) ghost = buildFromSpec(cmd.parts);
      if (ghost) {
        ghost.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material = new THREE.MeshStandardMaterial({ color: 0xaaddff, transparent: true, opacity: 0.45 });
          }
        });
        ghost.position.set(playerPosRef.current.x, 0, playerPosRef.current.z - 5);
        scene.add(ghost);
        ghostRef.current = ghost;
      }
      return;
    }

    // Старый add_object — оставляем для совместимости
    if (cmd.action === "add_object") {
      const pos = new THREE.Vector3(
        playerPosRef.current.x + (Math.random() - 0.5) * 14,
        0,
        playerPosRef.current.z + (Math.random() - 0.5) * 14
      );
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

    // Изменить оружие
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
    cameraRef.current = camera;

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

      // Поворот камеры клавишами Q/E (на ПК)
      if (k.q) camYawRef.current -= 1.5 * delta;
      if (k.e2) camYawRef.current += 1.5 * delta;

      // Движение относительно направления камеры
      const yaw = camYawRef.current;
      const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      moveDir.set(0, 0, 0);
      if (k.w || (j.active && j.dy < -0.3)) moveDir.addScaledVector(forward, 1);
      if (k.s || (j.active && j.dy > 0.3)) moveDir.addScaledVector(forward, -1);
      if (k.a || (j.active && j.dx < -0.3)) moveDir.addScaledVector(right, -1);
      if (k.d || (j.active && j.dx > 0.3)) moveDir.addScaledVector(right, 1);
      if (moveDir.length() > 0) { moveDir.normalize(); playerRotRef.current = Math.atan2(moveDir.x, moveDir.z); }

      const mounted = mountedRef.current;
      if (mounted) {
        const spd = mounted.speed;
        mounted.mesh.position.x += moveDir.x * spd * delta;
        mounted.mesh.position.z += moveDir.z * spd * delta;
        mounted.mesh.position.x = Math.max(-24, Math.min(24, mounted.mesh.position.x));
        mounted.mesh.position.z = Math.max(-24, Math.min(24, mounted.mesh.position.z));
        if (moveDir.length() > 0) mounted.mesh.rotation.y = playerRotRef.current;
        playerPosRef.current.copy(mounted.mesh.position).add(mounted.mountOffset);
      } else {
        // Пешком — с коллизиями
        const spd = 5;
        const nextX = playerPosRef.current.x + moveDir.x * spd * delta;
        const nextZ = playerPosRef.current.z + moveDir.z * spd * delta;
        const pBox = new THREE.Box3(
          new THREE.Vector3(nextX - 0.3, playerPosRef.current.y - 0.8, nextZ - 0.3),
          new THREE.Vector3(nextX + 0.3, playerPosRef.current.y + 1.2, nextZ + 0.3)
        );
        let blocked = false;
        for (const col of collidersRef.current) {
          if (col.intersectsBox(pBox)) { blocked = true; break; }
        }
        if (!blocked) {
          playerVelRef.current.x = moveDir.x * spd;
          playerVelRef.current.z = moveDir.z * spd;
        } else {
          playerVelRef.current.x = 0;
          playerVelRef.current.z = 0;
        }
        if (k.space && onGroundRef.current) { playerVelRef.current.y = 8; onGroundRef.current = false; k.space = false; }
        playerVelRef.current.y -= 20 * delta;
        playerPosRef.current.addScaledVector(playerVelRef.current, delta);
        if (playerPosRef.current.y <= 0.8) { playerPosRef.current.y = 0.8; playerVelRef.current.y = 0; onGroundRef.current = true; }
        playerPosRef.current.x = Math.max(-24, Math.min(24, playerPosRef.current.x));
        playerPosRef.current.z = Math.max(-24, Math.min(24, playerPosRef.current.z));
      }

      if (player) {
        player.position.copy(playerPosRef.current);
        player.rotation.y = playerRotRef.current;
        const armR = player.children[5] as THREE.Object3D;
        if (armR) {
          if (attackTimerRef.current > 0) { armR.rotation.x = -Math.PI / 2; attackTimerRef.current -= delta; }
          else armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0, 0.2);
        }
      }

      // Камера вращается вокруг игрока
      const camX = playerPosRef.current.x + Math.sin(camYawRef.current) * camDist * Math.cos(camPitchRef.current);
      const camY = playerPosRef.current.y + Math.sin(camPitchRef.current) * camDist + 2;
      const camZ = playerPosRef.current.z + Math.cos(camYawRef.current) * camDist * Math.cos(camPitchRef.current);
      camTarget.set(camX, camY, camZ);
      camera.position.lerp(camTarget, 0.1);
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
    const isTyping = () => {
      const el = document.activeElement;
      return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const k = keysRef.current;
      if (e.code === "KeyW") k.w = true;
      if (e.code === "KeyA") k.a = true;
      if (e.code === "KeyS") k.s = true;
      if (e.code === "KeyD") k.d = true;
      if (e.code === "Space") { e.preventDefault(); k.space = true; }
      if (e.code === "KeyE") handleMount();
      if (e.code === "KeyQ") k.q = true;
      if (e.code === "KeyR") k.e2 = true;
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (isTyping()) return;
      const k = keysRef.current;
      if (e.code === "KeyW") k.w = false; if (e.code === "KeyA") k.a = false;
      if (e.code === "KeyS") k.s = false; if (e.code === "KeyD") k.d = false;
      if (e.code === "Space") k.space = false;
      if (e.code === "KeyQ") k.q = false;
      if (e.code === "KeyR") k.e2 = false;
    };
    const getCanvasNDC = (clientX: number, clientY: number) => {
      const canvas = mountRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return new THREE.Vector2(
        ((clientX - rect.left) / rect.width) * 2 - 1,
        -((clientY - rect.top) / rect.height) * 2 + 1
      );
    };

    const getRayFloorHit = (ndc: THREE.Vector2): THREE.Vector3 | null => {
      if (!cameraRef.current) return null;
      raycasterRef.current.setFromCamera(ndc, cameraRef.current);
      const target = new THREE.Vector3();
      const hit = raycasterRef.current.ray.intersectPlane(floorPlaneRef.current, target);
      return hit ? target : null;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!ghostRef.current || !cameraRef.current) return;
      const ndc = getCanvasNDC(e.clientX, e.clientY);
      if (!ndc) return;
      const target = getRayFloorHit(ndc);
      if (target) ghostRef.current.position.set(target.x, 0, target.z);
    };

    const onClickPlace = (e: MouseEvent) => {
      if (!placementModeRef.current || !cameraRef.current) return;
      if ((e.target as HTMLElement).tagName !== "CANVAS") return;
      const ndc = getCanvasNDC(e.clientX, e.clientY);
      if (!ndc) return;
      const target = getRayFloorHit(ndc);
      if (target) confirmPlacement(target, placementModeRef.current.scale);
    };

    const onTouchMovePlacement = (e: TouchEvent) => {
      if (!ghostRef.current || !cameraRef.current) return;
      const t = e.touches[0];
      if (!t) return;
      const ndc = getCanvasNDC(t.clientX, t.clientY);
      if (!ndc) return;
      const target = getRayFloorHit(ndc);
      if (target) ghostRef.current.position.set(target.x, 0, target.z);
    };

    const onTouchEndPlacement = (e: TouchEvent) => {
      if (!placementModeRef.current || !cameraRef.current) return;
      if ((e.target as HTMLElement).tagName !== "CANVAS") return;
      const t = e.changedTouches[0];
      if (!t) return;
      const ndc = getCanvasNDC(t.clientX, t.clientY);
      if (!ndc) return;
      const target = getRayFloorHit(ndc);
      if (target) confirmPlacement(target, placementModeRef.current.scale);
    };

    const onClick = (e: MouseEvent) => {
      if (placementModeRef.current) return;
      if ((e.target as HTMLElement).tagName === "CANVAS") triggerAttack();
    };

    // Вращение камеры мышью (ПК) — правая кнопка или просто drag по канвасу
    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).tagName !== "CANVAS") return;
      if (placementModeRef.current) return;
      isDraggingCamRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseDrag = (e: MouseEvent) => {
      if (!isDraggingCamRef.current) return;
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      camYawRef.current -= dx * 0.005;
      camPitchRef.current = Math.max(0.1, Math.min(1.2, camPitchRef.current + dy * 0.005));
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => { isDraggingCamRef.current = false; };

    // Вращение камеры тачем двумя пальцами или правым джойстиком — второй тач
    let camTouchId: number | null = null;
    let lastCamTouch = { x: 0, y: 0 };
    const onCamTouchStart = (e: TouchEvent) => {
      if (placementModeRef.current) return;
      if (e.touches.length === 2) {
        const t = e.touches[1];
        camTouchId = t.identifier;
        lastCamTouch = { x: t.clientX, y: t.clientY };
      }
    };
    const onCamTouchMove = (e: TouchEvent) => {
      if (camTouchId === null) return;
      const t = Array.from(e.touches).find(x => x.identifier === camTouchId);
      if (!t) return;
      const dx = t.clientX - lastCamTouch.x;
      const dy = t.clientY - lastCamTouch.y;
      camYawRef.current -= dx * 0.008;
      camPitchRef.current = Math.max(0.1, Math.min(1.2, camPitchRef.current + dy * 0.008));
      lastCamTouch = { x: t.clientX, y: t.clientY };
    };
    const onCamTouchEnd = (e: TouchEvent) => {
      if (Array.from(e.touches).every(t => t.identifier !== camTouchId)) camTouchId = null;
    };

    const canvas = mountRef.current;
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("click", onClick);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("click", onClickPlace);
    window.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseDrag);
    window.addEventListener("mouseup", onMouseUp);
    if (canvas) {
      canvas.addEventListener("touchmove", onTouchMovePlacement, { passive: true });
      canvas.addEventListener("touchend", onTouchEndPlacement);
      canvas.addEventListener("touchstart", onCamTouchStart, { passive: true });
      canvas.addEventListener("touchmove", onCamTouchMove, { passive: true });
      canvas.addEventListener("touchend", onCamTouchEnd);
    }
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("click", onClick);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("click", onClickPlace);
      window.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseDrag);
      window.removeEventListener("mouseup", onMouseUp);
      if (canvas) {
        canvas.removeEventListener("touchmove", onTouchMovePlacement);
        canvas.removeEventListener("touchend", onTouchEndPlacement);
        canvas.removeEventListener("touchstart", onCamTouchStart);
        canvas.removeEventListener("touchmove", onCamTouchMove);
        canvas.removeEventListener("touchend", onCamTouchEnd);
      }
    };
  }, [triggerAttack, confirmPlacement]);

  useEffect(() => { joystickRef.current = joystick; }, [joystick]);
  useEffect(() => { placementModeRef.current = placementMode; }, [placementMode]);

  const handleMount = useCallback(() => {
    if (mountedRef.current) {
      // Высадка
      mountedRef.current = null;
      playerPosRef.current.y = 0.8;
      setMountHint(null);
      return;
    }
    // Ищем ближайший транспорт
    const pp = playerPosRef.current;
    const nearest = mountablesRef.current.find((mo) => {
      const dx = mo.mesh.position.x - pp.x;
      const dz = mo.mesh.position.z - pp.z;
      return Math.sqrt(dx * dx + dz * dz) < 3.5;
    });
    if (nearest) {
      mountedRef.current = nearest;
      setMountHint(null);
    }
  }, []);

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
      setChatHistory((h) => [...h, { role: "ai", text: "Ошибка соединения 😔 Проверь API ключ в настройках проекта." }]);
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
          WASD — движение<br />ПРОБЕЛ — прыжок<br />ЛКМ — удар<br />Q/R — поворот камеры<br />DRAG мышью — вращение<br />E — сесть/выйти
        </div>
      )}

      {/* Подсказка транспорта */}
      {mountHint && (
        <div className="absolute top-16 left-1/2 z-20 px-4 py-2 rounded-xl font-rubik text-sm text-center"
          style={{ transform: "translateX(-50%)", background: "#000000cc", border: `1px solid ${theme.accentCss}`, color: theme.accentCss, backdropFilter: "blur(8px)" }}>
          {mountHint}
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
            <button className="w-12 h-12 rounded-full text-lg flex items-center justify-center select-none"
              style={{ background: mountedRef.current ? `${theme.accentCss}cc` : "#ffffff22", border: `2px solid ${mountedRef.current ? theme.accentCss : "#ffffff44"}`, touchAction: "manipulation" }}
              onTouchStart={(e) => { e.preventDefault(); handleMount(); }}>🚗</button>
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

      {/* Placement mode panel */}
      {placementMode && (
        <div className="absolute bottom-20 left-1/2 z-30 flex flex-col items-center gap-3 px-4 py-3 rounded-2xl"
          style={{ transform: "translateX(-50%)", background: "#000000dd", border: "1px solid #ffffff33", backdropFilter: "blur(12px)", minWidth: "280px" }}>
          <div className="font-rubik text-white text-sm">
            📍 Кликни на поле чтобы поставить <b>{placementMode.cmd.name}</b>
          </div>
          <div className="flex items-center gap-3 w-full">
            <span className="font-rubik text-gray-400 text-xs">Размер</span>
            <input type="range" min="0.3" max="5" step="0.1"
              value={placementMode.scale}
              onChange={(e) => {
                const s = parseFloat(e.target.value);
                setPlacementMode(p => p ? { ...p, scale: s } : null);
                if (ghostRef.current) ghostRef.current.scale.setScalar(s);
              }}
              className="flex-1 accent-white" />
            <span className="font-rubik text-white text-xs w-8">{placementMode.scale.toFixed(1)}x</span>
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              if (ghostRef.current && sceneRef.current) sceneRef.current.remove(ghostRef.current);
              ghostRef.current = null;
              setPlacementMode(null);
            }} className="px-3 py-1 rounded-lg font-rubik text-sm" style={{ background: "#ffffff22", color: "#fff" }}>
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* CRT overlay */}
      <div className="pointer-events-none fixed inset-0 z-30 opacity-[0.025]"
        style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.5) 2px, rgba(255,255,255,0.5) 4px)" }} />
    </div>
  );
}