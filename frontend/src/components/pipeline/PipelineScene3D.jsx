import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';

const STAGE_CONFIGS = [
  { key: 'IF', name: 'Instruction Fetch', color: 0x06b6d4, x: -14, desc: 'Fetches 32-bit RV32I instruction from I-Mem using PC' },
  { key: 'ID', name: 'Instruction Decode', color: 0x3b82f6, x: -7, desc: 'Decodes opcode, reads reg file (rs1, rs2), generates sign-extended imm' },
  { key: 'EX', name: 'Execute / ALU', color: 0x8b5cf6, x: 0, desc: 'ALU computation, branch evaluation, forwarding bypass multiplexers' },
  { key: 'MEM', name: 'Memory Access', color: 0xec4899, x: 7, desc: 'Reads or writes 32-bit data memory (lw/sw)' },
  { key: 'WB', name: 'Write Back', color: 0x10b981, x: 14, desc: 'Commits result to target register rd (x0-x31)' }
];

export default function PipelineScene3D({
  pipelineState,
  hazards = {},
  selectedStage,
  onSelectStage
}) {
  const mountRef = useRef(null);
  const sceneDataRef = useRef(null);
  const onSelectStageRef = useRef(onSelectStage);

  useEffect(() => {
    onSelectStageRef.current = onSelectStage;
  }, [onSelectStage]);

  // ---- Scene setup (runs once) ----
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    const bgHex = 0x070b14;
    scene.background = new THREE.Color(bgHex);
    scene.fog = new THREE.FogExp2(bgHex, 0.015);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 18, 32);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0x38bdf8, 1.2);
    dirLight.position.set(10, 30, 20);
    scene.add(dirLight);
    const purpleSpot = new THREE.PointLight(0xa855f7, 2, 40);
    purpleSpot.position.set(0, 15, -5);
    scene.add(purpleSpot);

    // Ground grid
    const gridHelper = new THREE.GridHelper(60, 40, 0x1e293b, 0x0f172a);
    gridHelper.position.y = -4;
    scene.add(gridHelper);

    // Build pipeline stages
    const stageGroup = new THREE.Group();
    scene.add(stageGroup);
    const stageMeshes = {};
    const particles = [];

    STAGE_CONFIGS.forEach((cfg) => {
      const group = new THREE.Group();
      group.position.x = cfg.x;
      group.userData = { stageKey: cfg.key };

      // Glass chassis
      const geom = new THREE.BoxGeometry(4.8, 4.4, 4.8);
      const mat = new THREE.MeshPhysicalMaterial({
        color: cfg.color,
        transparent: true,
        opacity: 0.25,
        roughness: 0.2,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 1.2,
      });
      const box = new THREE.Mesh(geom, mat);
      group.add(box);

      // Core slab
      const coreGeom = new THREE.CylinderGeometry(1.4, 1.4, 0.8, 16);
      const coreMat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        emissive: cfg.color,
        emissiveIntensity: 0.6,
        metalness: 0.8,
        roughness: 0.2,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      core.position.y = -0.5;
      group.add(core);

      // Corner pillars
      const pillarGeom = new THREE.CylinderGeometry(0.12, 0.12, 4.4, 8);
      const pillarMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      [[-2.3, -2.3], [-2.3, 2.3], [2.3, -2.3], [2.3, 2.3]].forEach(([px, pz]) => {
        const pillar = new THREE.Mesh(pillarGeom, pillarMat);
        pillar.position.set(px, 0, pz);
        group.add(pillar);
      });

      // Beacon ring
      const ringGeom = new THREE.TorusGeometry(1.6, 0.08, 8, 32);
      const ringMat = new THREE.MeshBasicMaterial({ color: cfg.color });
      const ring = new THREE.Mesh(ringGeom, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 2.2;
      group.add(ring);

      stageGroup.add(group);
      stageMeshes[cfg.key] = { group, box, core, ring };
    });

    // Inter-stage buses
    for (let i = 0; i < 4; i++) {
      const x1 = STAGE_CONFIGS[i].x + 2.4;
      const x2 = STAGE_CONFIGS[i + 1].x - 2.4;
      const busGeom = new THREE.CylinderGeometry(0.2, 0.2, x2 - x1, 8);
      const busMat = new THREE.MeshStandardMaterial({
        color: 0x334155,
        emissive: 0x0ea5e9,
        emissiveIntensity: 0.2,
        metalness: 0.9,
        roughness: 0.1,
      });
      const bus = new THREE.Mesh(busGeom, busMat);
      bus.rotation.z = Math.PI / 2;
      bus.position.set((x1 + x2) / 2, 0, 0);
      scene.add(bus);

      // Control rail
      const railGeom = new THREE.CylinderGeometry(0.08, 0.08, x2 - x1, 8);
      const railMat = new THREE.MeshBasicMaterial({ color: 0x1e293b });
      const rail = new THREE.Mesh(railGeom, railMat);
      rail.rotation.z = Math.PI / 2;
      rail.position.set((x1 + x2) / 2, -1.5, 1.2);
      scene.add(rail);
    }

    // Forwarding arc
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(7, -2.5, 0),
      new THREE.Vector3(4, -5.5, -4),
      new THREE.Vector3(0, -2.5, 0),
    ]);
    const fwdGeom = new THREE.TubeGeometry(curve, 32, 0.12, 8, false);
    const fwdMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      transparent: true,
      opacity: 0.7,
    });
    scene.add(new THREE.Mesh(fwdGeom, fwdMat));

    // Particle pulses
    const pulseGroup = new THREE.Group();
    scene.add(pulseGroup);
    const pulseGeom = new THREE.SphereGeometry(0.28, 12, 12);
    for (let i = 0; i < 6; i++) {
      const pMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const p = new THREE.Mesh(pulseGeom, pMat);
      p.userData = { progress: i / 6, speed: 0.008 };
      pulseGroup.add(p);
      particles.push(p);
    }

    // Store references
    sceneDataRef.current = { scene, camera, renderer, stageMeshes, particles, stageGroup, gridHelper };

    // ---- Mouse drag rotation ----
    let isMouseDown = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const handleMouseDown = (e) => {
      isMouseDown = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseMove = (e) => {
      if (!isMouseDown) return;
      const dx = (e.clientX - lastMouseX) * 0.005;
      const dy = (e.clientY - lastMouseY) * 0.005;

      const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
      let angle = Math.atan2(camera.position.z, camera.position.x) + dx;

      camera.position.x = radius * Math.cos(angle);
      camera.position.z = radius * Math.sin(angle);
      camera.position.y = Math.max(5, Math.min(40, camera.position.y + dy * 10));
      camera.lookAt(0, 0, 0);

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const handleMouseUp = () => { isMouseDown = false; };

    // Touch events for mobile/tablet rotation
    let touchStartX = 0;
    let touchStartY = 0;
    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };
    const handleTouchMove = (e) => {
      if (e.touches.length === 1) {
        const dx = (e.touches[0].clientX - touchStartX) * 0.007;
        const dy = (e.touches[0].clientY - touchStartY) * 0.007;

        const radius = Math.sqrt(camera.position.x ** 2 + camera.position.z ** 2);
        let angle = Math.atan2(camera.position.z, camera.position.x) + dx;

        camera.position.x = radius * Math.cos(angle);
        camera.position.z = radius * Math.sin(angle);
        camera.position.y = Math.max(5, Math.min(40, camera.position.y + dy * 10));
        camera.lookAt(0, 0, 0);

        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    };

    // Stage click raycasting
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handleClick = (e) => {
      const rect = container.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(stageGroup.children, true);

      if (intersects.length > 0) {
        let obj = intersects[0].object;
        while (obj && !obj.userData?.stageKey && obj.parent) {
          obj = obj.parent;
        }
        if (obj?.userData?.stageKey) {
          onSelectStageRef.current?.(obj.userData.stageKey);
        }
      }
    };

    // Resize
    const handleResize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('click', handleClick);

    // Animation loop
    const clock = new THREE.Clock();
    let animId;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Bus pulse motion
      particles.forEach((p) => {
        p.userData.progress = (p.userData.progress + p.userData.speed) % 1;
        p.position.x = -14 + p.userData.progress * 28;
        p.position.y = 0.3 * Math.sin(time * 6 + p.userData.progress * 10);
        p.position.z = 0;
      });

      // Stage rotation animations
      STAGE_CONFIGS.forEach((cfg) => {
        const meshObj = stageMeshes[cfg.key];
        if (meshObj) {
          meshObj.core.rotation.y = time * 0.8;
          meshObj.ring.rotation.z = time * 1.2;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('click', handleClick);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Sync 3D visuals with simulation state ----
  useEffect(() => {
    const data = sceneDataRef.current;
    if (!data) return;

    STAGE_CONFIGS.forEach((cfg) => {
      const meshObj = data.stageMeshes[cfg.key];
      if (!meshObj) return;

      const stageData = pipelineState?.[cfg.key];
      const isValid = stageData && stageData.valid;
      const isSelected = selectedStage === cfg.key;

      let targetColor = cfg.color;
      let emissiveInt = isValid ? 0.8 : 0.15;
      let opacity = isValid ? 0.38 : 0.18;

      // Hazard visuals
      if (hazards?.stall && (cfg.key === 'IF' || cfg.key === 'ID')) {
        targetColor = 0xf59e0b;
        emissiveInt = 1.2;
      }
      if (hazards?.flush && cfg.key === 'EX') {
        targetColor = 0xf43f5e;
        emissiveInt = 1.4;
      }

      meshObj.core.material.color.setHex(targetColor);
      meshObj.core.material.emissive.setHex(targetColor);
      meshObj.core.material.emissiveIntensity = emissiveInt;
      meshObj.box.material.opacity = isSelected ? 0.55 : opacity;
      meshObj.box.scale.set(isSelected ? 1.08 : 1, isSelected ? 1.08 : 1, isSelected ? 1.08 : 1);
    });
  }, [pipelineState, hazards, selectedStage]);

  return (
    <div className="relative w-full h-full min-h-[360px] sm:min-h-[420px] bg-slate-950 text-slate-200 selection:bg-sky-500/30 rounded-xl overflow-hidden border border-slate-800">
      <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD */}
      <div className="absolute top-3 left-3 pointer-events-none flex flex-col gap-1.5">
        <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-700/60 shadow-md">
          <span className="text-[11px] sm:text-xs font-bold tracking-wide text-sky-200">
            3D SPATIAL PIPELINE · 60 FPS
          </span>
        </div>
        <p className="text-[9px] sm:text-[10px] text-slate-400 max-w-[200px] sm:max-w-xs drop-shadow hidden xs:block">
          Drag to rotate view · Tap stage enclosure to inspect.
        </p>
      </div>

      {/* Hazards badges */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
        {hazards?.stall && (
          <div className="flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold animate-pulse shadow">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            STALL BUBBLE
          </div>
        )}
        {hazards?.flush && (
          <div className="flex items-center gap-1.5 bg-rose-500/20 text-rose-300 border border-rose-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-bold animate-bounce shadow">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            BRANCH FLUSH
          </div>
        )}
        {(hazards?.forwardA && hazards.forwardA !== 'NONE' || hazards?.forwardB && hazards.forwardB !== 'NONE') && (
          <div className="flex items-center gap-1.5 bg-violet-500/20 text-violet-300 border border-violet-500/50 px-2 py-0.5 rounded text-[10px] font-mono font-semibold shadow">
            FWD: {hazards.forwardA !== 'NONE' ? `RS1←${hazards.forwardA} ` : ''}
            {hazards.forwardB !== 'NONE' ? `RS2←${hazards.forwardB}` : ''}
          </div>
        )}
      </div>

      {/* Stage jump buttons */}
      <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-slate-900/90 backdrop-blur-md px-2.5 py-1 rounded-full border border-slate-700/80 shadow-xl max-w-[90%] overflow-x-auto">
        {STAGE_CONFIGS.map((cfg) => {
          const stageData = pipelineState?.[cfg.key];
          const hasInst = stageData?.valid;
          return (
            <button
              key={cfg.key}
              onClick={() => onSelectStage(cfg.key)}
              className={`px-2.5 py-0.5 rounded-full text-[11px] font-mono font-medium transition-all flex items-center gap-1 shrink-0 ${
                selectedStage === cfg.key
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/30'
                  : 'text-slate-300 hover:bg-slate-800'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${hasInst ? 'bg-emerald-400' : 'bg-slate-500'}`} />
              {cfg.key}
            </button>
          );
        })}
      </div>
    </div>
  );
}
