import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { FontLoader } from 'three/addons/loaders/FontLoader.js';
import { TextGeometry } from 'three/addons/geometries/TextGeometry.js';
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { HandTrackingResult } from '../types';
import { ChevronDown, ChevronUp, Music, Pause, GripHorizontal } from 'lucide-react';

interface ChristmasTreeProps {
  trackingResult: HandTrackingResult;
}

interface TreeConfig {
  glowRatio: number;      // 0-100
  glowStrength: number;   // 0-300
  particleSize: number;   // 10-200 (Controls globalScale)
  reflection: number;     // 0-100
  colors: {
    gold: string;
    red: string;
    green: string;
  }
}

const ChristmasTree: React.FC<ChristmasTreeProps> = ({ trackingResult }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  
  // Three.js Instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const particlesRef = useRef<any[]>([]);
  const meshRefs = useRef<{ sphere?: THREE.InstancedMesh, cube?: THREE.InstancedMesh }>({});
  const materialRef = useRef<THREE.MeshStandardMaterial | null>(null); 
  const topStarRef = useRef<THREE.Mesh | null>(null);
  
  // Logic Refs
  const stateRef = useRef<number>(0); // 0: Tree, 1: Explode, 2: Text
  const lastSpreadRef = useRef<number>(0);
  const lastSwitchTimeRef = useRef<number>(0);
  const lastVelocityTimeRef = useRef<number>(Date.now());
  const globalScaleRef = useRef<number>(1.0); 
  
  // Config Ref
  const configRef = useRef<TreeConfig>({
    glowRatio: 36,       
    glowStrength: 30,   
    particleSize: 50,
    reflection: 50,
    colors: { gold: '#f0a70a', red: '#aa0000', green: '#004400' }
  });

  // UI State
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const [config, setConfig] = useState<TreeConfig>(configRef.current);
  const [isLoading, setIsLoading] = useState(true);
  const [started, setStarted] = useState(false);

  // === Dragging Logic ===
  const [position, setPosition] = useState({ x: 0, y: 0 }); 
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const startPosRef = useRef({ x: 0, y: 0 });
  const isInitializedRef = useRef(false);

  // === Music Logic ===
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize Position
  useEffect(() => {
    if (containerRef.current && !isInitializedRef.current) {
        const cw = containerRef.current.clientWidth;
        const ch = containerRef.current.clientHeight;
        setPosition({ x: cw - 280, y: ch - 120 }); 
        isInitializedRef.current = true;
    }
  }, []);

    // Music Setup
  useEffect(() => {
    // 指向 public 目录下的文件
    audioRef.current = new Audio('/music.mp3'); 
    audioRef.current.loop = true;
    audioRef.current.volume = 0.5;

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // 新增：点击 Start 时的处理函数
  const handleStart = () => {
    if (audioRef.current) {
        audioRef.current.play().catch(e => console.error(e));
        setIsPlaying(true);
    }
    setStarted(true); // 显示主界面
  };

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) audioRef.current.pause();
    else audioRef.current.play().catch(e => console.log(e));
    setIsPlaying(!isPlaying);
  };

  // Sync Config
  useEffect(() => {
    configRef.current = config;
    globalScaleRef.current = config.particleSize / 100.0;
  }, [config]);

  // === Drag Handlers ===
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
    startPosRef.current = { ...position };
  };

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
        if (!isDragging || !containerRef.current || !panelRef.current) return;
        if (e.cancelable) e.preventDefault();

        const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
        const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
        
        const deltaX = clientX - dragStartRef.current.x;
        const deltaY = clientY - dragStartRef.current.y;
        
        let newX = startPosRef.current.x + deltaX;
        let newY = startPosRef.current.y + deltaY;

        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;
        const panelW = panelRef.current.clientWidth;
        const panelH = panelRef.current.clientHeight;
        const SAFE_MARGIN = 40;
        
        const minX = -panelW + SAFE_MARGIN;
        const maxX = containerW - SAFE_MARGIN;
        const minY = -panelH + SAFE_MARGIN;
        const maxY = containerH - SAFE_MARGIN;

        newX = Math.max(minX, Math.min(newX, maxX));
        newY = Math.max(minY, Math.min(newY, maxY));
        
        setPosition({ x: newX, y: newY });
    };

    const handleDragEnd = () => setIsDragging(false);

    if (isDragging) {
        window.addEventListener('mousemove', handleDragMove);
        window.addEventListener('touchmove', handleDragMove, { passive: false });
        window.addEventListener('mouseup', handleDragEnd);
        window.addEventListener('touchend', handleDragEnd);
    }

    return () => {
        window.removeEventListener('mousemove', handleDragMove);
        window.removeEventListener('touchmove', handleDragMove);
        window.removeEventListener('mouseup', handleDragEnd);
        window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging]);


  // === THREE.JS INITIALIZATION ===
  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 20, 90);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.setClearColor(0x000000, 0); 
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 2. Post Processing
    const renderScene = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 1.5, 0.4, 0.85);
    
    // CRITICAL: Threshold > 1.0 ensures ONLY boosted emissive materials glow.
    // Standard reflections (max ~1.0) will NOT glow.
    bloomPass.threshold = 1.1; 
    bloomPass.strength = 1.0; 
    bloomPass.radius = 0.2;
    
    const composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // 3. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.8;
    controls.enablePan = false;
    controls.maxDistance = 150;
    controls.minDistance = 10;
    controlsRef.current = controls;

    // 4. Lights
    scene.add(new THREE.AmbientLight(0xffffff, 0.8)); 
    // Lowered slightly to ensure regular highlights don't exceed threshold 1.1
    const dirLight = new THREE.DirectionalLight(0xffd700, 1.0); 
    dirLight.position.set(30, 60, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048; dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.left = -60; dirLight.shadow.camera.right = 60;
    dirLight.shadow.camera.top = 60; dirLight.shadow.camera.bottom = -60;
    dirLight.shadow.bias = -0.0001; 
    scene.add(dirLight);

    const blueLight = new THREE.PointLight(0x4444ff, 500, 100);
    blueLight.position.set(-50, 20, -20);
    scene.add(blueLight);

    const camLight = new THREE.DirectionalLight(0xffffff, 0.8);
    camera.add(camLight);
    scene.add(camera);

    // 5. Material & Shader
    const params = {
        particleCount: 4500,
        treeHeight: 40,
        treeRadius: 16,
    };

    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff, 
        roughness: 0.35, 
        metalness: 0.9, 
        emissive: 0x000000, // Black by default
        emissiveIntensity: 0.0, // Control via shader
        envMapIntensity: 0.5 
    });
    materialRef.current = material;

    material.onBeforeCompile = (shader) => {
        // Initial values
        shader.uniforms.uGlowRatio = { value: configRef.current.glowRatio / 100.0 };
        shader.uniforms.uGlobalGlowStrength = { value: configRef.current.glowStrength / 100.0 };
        material.userData.shader = shader;
        
        shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
            #include <common>
            attribute float aGlowStrength;
            attribute float aGlowIndex;
            uniform float uGlowRatio;
            uniform float uGlobalGlowStrength;
            varying float vFinalIntensity;
            `
        );
        
        shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            // step(edge, x) -> if x < edge return 0.0, else 1.0
            // Here: if uGlowRatio (0..1) < aGlowIndex (0..1) return 0.0
            // So if uGlowRatio is 0.0, it will almost certainly be 0.0
            float isActive = step(aGlowIndex, uGlowRatio);
            
            // Calculate final intensity passed to fragment
            vFinalIntensity = isActive * aGlowStrength * uGlobalGlowStrength;
            `
        );

        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            varying float vFinalIntensity;
            `
        );
        
        shader.fragmentShader = shader.fragmentShader.replace(
            '#include <emissivemap_fragment>',
            `
            #include <emissivemap_fragment>
            
            // Boost factor must be high enough so that (Color * Strength * Boost) > Threshold (1.1)
            float boost = 0.5; 
            
            float maxChan = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
            vec3 normalizedColor = diffuseColor.rgb / max(maxChan, 0.001);

            // If vFinalIntensity is 0, this is absolutely 0.
            totalEmissiveRadiance = normalizedColor * vFinalIntensity * boost;
            `
        );
    };

    // 6. Geometry & Particles
    const sphereGeo = new THREE.SphereGeometry(0.4, 32, 32);
    const cubeGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
    const sphereCount = Math.floor(params.particleCount * 0.7);
    const cubeCount = params.particleCount - sphereCount;
    
    const sStr = new Float32Array(sphereCount); const sIdx = new Float32Array(sphereCount);
    const cStr = new Float32Array(cubeCount); const cIdx = new Float32Array(cubeCount);

    const sphereMesh = new THREE.InstancedMesh(sphereGeo, material, sphereCount);
    const cubeMesh = new THREE.InstancedMesh(cubeGeo, material, cubeCount);
    sphereMesh.castShadow = sphereMesh.receiveShadow = cubeMesh.castShadow = cubeMesh.receiveShadow = true;
    sphereMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    cubeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    meshRefs.current = { sphere: sphereMesh, cube: cubeMesh };

    const dummy = new THREE.Object3D();
    const particles: any[] = [];
    let sI = 0, cI = 0;

    for (let i = 0; i < params.particleCount; i++) {
        // === Weighted Random Color Distribution ===
        const rVal = Math.random();
        let cType = 0; // Default Gold
        if (rVal < 0.7) {
            cType = 0; // 60% Gold
        } else if (rVal < 0.9) {
            cType = 1; // 20% Red
        } else {
            cType = 2; // 20% Green
        }

        const p: any = {
            id: i, type: Math.random() < 0.7 ? 'sphere' : 'cube', 
            colorType: cType, 
            currentPos: new THREE.Vector3(), targetPos: new THREE.Vector3(),
            treePos: new THREE.Vector3(), explodePos: new THREE.Vector3(), textPos: new THREE.Vector3(),
            baseScale: 0.4 + Math.random() * 0.8,
            rotSpeed: new THREE.Vector3((Math.random()-0.5)*0.01,(Math.random()-0.5)*0.01,(Math.random()-0.5)*0.01),
            rotation: new THREE.Euler(Math.random()*Math.PI,Math.random()*Math.PI,0),
            meshIndex: 0
        };

        // Tree Logic
        const y = (i / params.particleCount) * params.treeHeight;
        const lp = y / params.treeHeight;
        const rad = (1 - lp) * params.treeRadius;
        const ang = i * 2.3999;
        p.treePos.set(Math.cos(ang)*rad+(Math.random()-0.5)*1.5, y-params.treeHeight/2+2+(Math.random()-0.5), Math.sin(ang)*rad+(Math.random()-0.5)*1.5);
        p.currentPos.copy(p.treePos); p.targetPos.copy(p.treePos);

        // Explode Logic
        const u = Math.random(), v = Math.random();
        const theta = 2 * Math.PI * u, phi = Math.acos(2 * v - 1);
        const r = 25 + (Math.random()*70) + (Math.pow(Math.random(),3)*60);
        p.explodePos.set(r*Math.sin(phi)*Math.cos(theta), r*Math.sin(phi)*Math.sin(theta), r*Math.cos(phi));
        p.textPos.copy(p.treePos); 

        dummy.position.copy(p.currentPos); dummy.rotation.copy(p.rotation); dummy.scale.setScalar(p.baseScale); dummy.updateMatrix();

        // Random Glow Strength (variation between particles)
        // Fixed to 1.0 to eliminate random flickering
        const rndStr = 1.0; 
        // Random Index for Ratio Cutoff
        const rndIdx = Math.random();

        if (p.type === 'sphere') {
            sphereMesh.setMatrixAt(sI, dummy.matrix);
            sStr[sI] = rndStr; sIdx[sI] = rndIdx; p.meshIndex = sI; sI++;
        } else {
            cubeMesh.setMatrixAt(cI, dummy.matrix);
            cStr[cI] = rndStr; cIdx[cI] = rndIdx; p.meshIndex = cI; cI++;
        }
        particles.push(p);
    }
    sphereGeo.setAttribute('aGlowStrength', new THREE.InstancedBufferAttribute(sStr, 1));
    sphereGeo.setAttribute('aGlowIndex', new THREE.InstancedBufferAttribute(sIdx, 1));
    cubeGeo.setAttribute('aGlowStrength', new THREE.InstancedBufferAttribute(cStr, 1));
    cubeGeo.setAttribute('aGlowIndex', new THREE.InstancedBufferAttribute(cIdx, 1));
    scene.add(sphereMesh); scene.add(cubeMesh);
    particlesRef.current = particles;

    // 7. Top Decoration
    const shp = new THREE.Shape(); const pts = 5, or = 1.8, ir = 0.9;
    for(let i=0;i<pts*2;i++){ const a=(i/(pts*2))*Math.PI*2; const r=(i%2===0)?or:ir; const x=Math.cos(a-Math.PI/2)*r; const y=Math.sin(a-Math.PI/2)*r; if(i===0)shp.moveTo(x,y);else shp.lineTo(x,y); }
    shp.closePath();
    const starGeo = new THREE.ExtrudeGeometry(shp, {depth:0.5,bevelEnabled:true,bevelThickness:0.2,bevelSize:0.1,bevelSegments:2}); starGeo.center();
    
    // Explicit material for star, separate from particles
    const starMaterial = new THREE.MeshStandardMaterial({
        color:0x000000,
        emissive:0xffaa00,
        emissiveIntensity:1.0,
        metalness:0.5,
        roughness:0.5,
        envMapIntensity:0.5
    });
    const starMesh = new THREE.Mesh(starGeo, starMaterial);
    starMesh.position.set(0,params.treeHeight/2+2.5,0); 
    starMesh.add(new THREE.PointLight(0xffaa00,300,30));
    scene.add(starMesh);
    topStarRef.current = starMesh;

    // 8. Font (Gentilis Bold)
    const loader = new FontLoader();
    loader.load('https://unpkg.com/three@0.160.0/examples/fonts/gentilis_bold.typeface.json', (font) => {
        const sz = 6.0; 
        const ht = 0; 
        const ls = 0.6; 
        const lns = 12;

        const createLine = (txt: string, yp: number) => {
            const arr: THREE.BufferGeometry[] = []; let cx = 0;
            Array.from(txt).forEach(l => { 
                if(l===' '){cx+=sz*0.5;return;} 
                
                // create text geometry
                const g = new TextGeometry(l, {
                    font: font,
                    size: sz,
                    height: ht, // 0 for flat text
                    curveSegments: 4,
                    bevelEnabled: false
                }); 
                
                g.computeBoundingBox(); 
                const w = g.boundingBox ? g.boundingBox.max.x-g.boundingBox.min.x : 0; 
                g.translate(cx,yp,0); 
                arr.push(g); 
                cx+=w+ls; 
            });
            if(arr.length===0) return null; 
            
            const mg=mergeGeometries(arr); 
            mg.computeBoundingBox(); 
            if(mg.boundingBox) mg.translate(-0.5*(mg.boundingBox.max.x-mg.boundingBox.min.x),0,0); 
            return mg;
        };
        
        const g1 = createLine("MERRY", lns/2);
        const g2 = createLine("CHRISTMAS", -lns/2);
        
        if (g1 && g2) {
             const mg = mergeGeometries([g1, g2]);
             mg.rotateY(Math.PI); 
             
             const smp = new MeshSurfaceSampler(new THREE.Mesh(mg)).build(); 
             const tmp = new THREE.Vector3();
             
             particlesRef.current.forEach(p => { 
                 smp.sample(tmp); 
                 tmp.z = 0; // Flat Z
                 p.textPos.copy(tmp); 
             });
             setIsLoading(false);
        }
    });

    const handleResize = () => {
        if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
        const newWidth = containerRef.current.clientWidth;
        const newHeight = containerRef.current.clientHeight;
        cameraRef.current.aspect = newWidth / newHeight;
        cameraRef.current.updateProjectionMatrix();
        rendererRef.current.setSize(newWidth, newHeight);
        composer.setSize(newWidth, newHeight);
    };
    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(containerRef.current);

    // 9. Animation Loop
    let reqId: number;
    const animate = () => {
        reqId = requestAnimationFrame(animate);
        const time = Date.now() * 0.001;
        
        const cfg = configRef.current;
        if (materialRef.current) {
            materialRef.current.envMapIntensity = cfg.reflection / 100.0;
            if (materialRef.current.userData.shader) {
                // Update Uniforms
                materialRef.current.userData.shader.uniforms.uGlowRatio.value = cfg.glowRatio / 100.0;
                materialRef.current.userData.shader.uniforms.uGlobalGlowStrength.value = cfg.glowStrength / 100.0;
            }
        }
        
        const globalScale = globalScaleRef.current;
        if (topStarRef.current) { 
            topStarRef.current.visible = stateRef.current === 0; 
            if (topStarRef.current.visible) {
                 topStarRef.current.rotation.y = time; 
                 topStarRef.current.rotation.z = Math.sin(time*2)*0.1;
                 topStarRef.current.position.y = (params.treeHeight/2+2.5)+Math.sin(time*1.5)*0.2;
                 
                 // Update Star Glow
                 const intensityFactor = cfg.glowStrength / 100.0; // 0 to 3.0
                 const baseEmissive = intensityFactor > 0.05 ? 0.3 : 0.0;
                 
                 const starMat = topStarRef.current.material as THREE.MeshStandardMaterial;
                 starMat.emissiveIntensity = baseEmissive + (intensityFactor * 0.5);
                 
                 if (topStarRef.current.children[0] instanceof THREE.PointLight) {
                     topStarRef.current.children[0].intensity = intensityFactor * 300; 
                 }
            }
        }

        const sphereM = meshRefs.current.sphere;
        const cubeM = meshRefs.current.cube;
        let sUpdate = false, cUpdate = false;
        
        const lerpSpeed = 0.03;

        for(let i=0; i<particlesRef.current.length; i++) {
            const p = particlesRef.current[i];
            let target = p.treePos;
            if (stateRef.current === 1) target = p.explodePos; else if (stateRef.current === 2) target = p.textPos;
            
            p.currentPos.lerp(target, lerpSpeed);
            p.rotation.x += p.rotSpeed.x; p.rotation.y += p.rotSpeed.y;
            dummy.position.copy(p.currentPos); dummy.rotation.copy(p.rotation);
            
            let s = p.baseScale * globalScale; 
            if(stateRef.current === 1) dummy.position.addScalar(Math.sin(time + i) * 0.1);
            
            dummy.scale.set(s,s,s); 
            dummy.updateMatrix();
            if (p.type === 'sphere' && sphereM) { sphereM.setMatrixAt(p.meshIndex, dummy.matrix); sUpdate = true; } 
            else if (cubeM) { cubeM.setMatrixAt(p.meshIndex, dummy.matrix); cUpdate = true; }
        }
        if(sUpdate && sphereM) sphereM.instanceMatrix.needsUpdate = true;
        if(cUpdate && cubeM) cubeM.instanceMatrix.needsUpdate = true;

        controls.update();
        composer.render();
    };
    
    animate();

    return () => {
        cancelAnimationFrame(reqId);
        resizeObserver.disconnect();
        if (containerRef.current) containerRef.current.innerHTML = '';
        renderer.dispose();
    };
  }, []);

  // === Color Update Effect ===
  useEffect(() => {
    const { sphere, cube } = meshRefs.current;
    if (sphere && cube && particlesRef.current.length > 0) {
        const cGold = new THREE.Color(config.colors.gold);
        const cRed = new THREE.Color(config.colors.red);
        const cGreen = new THREE.Color(config.colors.green);
        
        let sUp = false, cUp = false;
        particlesRef.current.forEach(p => {
            let color;
            if (p.colorType === 0) color = cGold;
            else if (p.colorType === 1) color = cRed;
            else if (p.colorType === 2) color = cGreen;
            else color = cGold; 
            
            if (p.type === 'sphere') { sphere.setColorAt(p.meshIndex, color); sUp = true; } 
            else { cube.setColorAt(p.meshIndex, color); cUp = true; }
        });
        if (sUp && sphere.instanceColor) sphere.instanceColor.needsUpdate = true;
        if (cUp && cube.instanceColor) cube.instanceColor.needsUpdate = true;
    }
  }, [config.colors]);

  // === Gesture Logic ===
  useEffect(() => {
    if (!controlsRef.current || !cameraRef.current) return;

    let spread = trackingResult.handSpread || 0;
    spread = Math.max(0, Math.min(1, (spread - 0.35) / 0.65));
    
    // Zoom logic
    const targetRadius = 200 - (spread * 145); 
    const currentPos = cameraRef.current.position;
    const currentLen = currentPos.length();
    const newLen = currentLen + (targetRadius - currentLen) * 0.1;
    currentPos.setLength(newLen);

    // Velocity Switch Logic
    const now = Date.now();
    const timeDelta = (now - lastVelocityTimeRef.current) / 1000;
    
    // Increase delta threshold slightly to 0.1s to reduce noise in velocity calculation
    if (timeDelta > 0.1) { 
        const velocity = (spread - lastSpreadRef.current) / timeDelta;
        
        const EXPANSION_SPEED_THRESHOLD = 2; // Fast open speed
        const CONTRACTION_SPEED_THRESHOLD = -1; // Fast close speed
        const COOLDOWN_MS = 800;

        if (now - lastSwitchTimeRef.current > COOLDOWN_MS) {
            let nextState = stateRef.current;
            
            // 1. Trigger: Fast Expansion (Open hand quickly)
            // Logic: Tree -> Explode OR Text -> Tree
            if (velocity > EXPANSION_SPEED_THRESHOLD) {
                if (stateRef.current === 0) { 
                    // From Tree -> Explode
                    nextState = 1; 
                    if (controlsRef.current) controlsRef.current.autoRotate = false; 
                }
                else if (stateRef.current === 2) { 
                    // From Text -> Tree
                    nextState = 0; 
                    if (controlsRef.current) controlsRef.current.autoRotate = true; 
                }
            }
            // 2. Trigger: Fast Contraction (Close hand quickly)
            // Logic: Explode -> Text
            else if (velocity < CONTRACTION_SPEED_THRESHOLD) {
                if (stateRef.current === 1) { 
                    // From Explode -> Text
                    nextState = 2; 
                    if (controlsRef.current) controlsRef.current.autoRotate = false; 
                }
            }

            if (nextState !== stateRef.current) {
                stateRef.current = nextState;
                lastSwitchTimeRef.current = now;
            }
        }
        lastSpreadRef.current = spread;
        lastVelocityTimeRef.current = now;
    }

    if (trackingResult.gesture === 'POINTING' && trackingResult.isDetected) {
        controlsRef.current.autoRotate = false;
        const targetAzimuth = -(trackingResult.x - 0.5) * Math.PI * 4;
        const targetPolar = trackingResult.y * Math.PI;
        const radius = cameraRef.current.position.distanceTo(controlsRef.current.target);
        const x = radius * Math.sin(targetPolar) * Math.sin(targetAzimuth);
        const y = radius * Math.cos(targetPolar);
        const z = radius * Math.sin(targetPolar) * Math.cos(targetAzimuth);
        cameraRef.current.position.x += (x - cameraRef.current.position.x) * 0.1;
        cameraRef.current.position.y += (y - cameraRef.current.position.y) * 0.1;
        cameraRef.current.position.z += (z - cameraRef.current.position.z) * 0.1;
        cameraRef.current.lookAt(0,0,0);
    } 
    else {
    // 【修复点】：当手势不再是 POINTING 时，恢复自转
    // 只要你的逻辑是“三个状态下都要自转”，这里直接设为 true 即可
    if (controlsRef.current) {
        controlsRef.current.autoRotate = true;
        }
    }
  }, [trackingResult]);

return (
    <div className="relative w-full h-full bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 shadow-2xl">
        
        {/* 1. 背景和 3D 场景 */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,#101015_0%,#000000_100%)]" />
        <div ref={containerRef} className="absolute inset-0 z-0" />
        
        {/* 2. Loading 提示 */}
        {isLoading && (
             <div className="absolute inset-0 flex items-center justify-center text-amber-400 z-10 pointer-events-none">
                 Loading Assets...
             </div>
        )}

        {/* 3. Start 按钮遮罩层 */}
        {!started && !isLoading && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-all duration-500">
                <button 
                    onClick={handleStart}
                    className="px-10 py-4 bg-amber-500 text-black font-bold font-serif text-xl rounded-full 
                               hover:bg-amber-400 hover:scale-105 transition-all duration-300 
                               shadow-[0_0_30px_rgba(245,158,11,0.6)] cursor-pointer border-2 border-amber-300"
                >
                    CLICK TO START
                </button>
            </div>
        )}
        
        {/* 4. 原有的 UI 控件 (只在 started=true 时显示) */}
        {started && (
            <>
                {/* 音乐开关按钮 */}
                <button
                    onClick={toggleMusic}
                    className="absolute bottom-4 left-4 z-10 flex items-center gap-2 p-3 
                            bg-black/40 backdrop-blur-md border border-amber-500/50 
                            hover:bg-amber-500 text-amber-400 hover:text-black rounded-full 
                            transition-all shadow-[0_0_20px_rgba(255,215,0,0.2)]"
                >
                    {isPlaying ? <Pause size={20} /> : <Music size={20} />}
                    <span className="text-sm font-bold font-serif hidden sm:inline">
                        {isPlaying ? 'Pause Music' : 'Play Music'}
                    </span>
                </button>

                {/* 状态指示器 */}
                <div className="absolute top-4 right-4 z-10 text-xs font-serif text-amber-500/80 pointer-events-none bg-black/50 px-3 py-1 rounded border border-amber-500/20">
                    STATE: {stateRef.current === 0 ? 'TREE' : stateRef.current === 1 ? 'EXPLODE' : 'TEXT'}
                </div>

                {/* 设置面板 (Settings) */}
                <div 
                    ref={panelRef}
                    style={{ 
                        top: 0, left: 0,
                        transform: `translate(${position.x}px, ${position.y}px)`,
                        touchAction: 'none' 
                    }}
                    className="absolute z-20 w-[260px] flex-shrink-0 font-serif"
                >
                    <div className={`
                            bg-black/75 backdrop-blur-md 
                            border border-amber-500/30 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] overflow-hidden
                            text-amber-400 transition-all duration-300
                    `}>
                        {/* Settings Header */}
                        <div 
                            onMouseDown={handleDragStart}
                            onTouchStart={handleDragStart}
                            className="w-full flex items-center justify-between p-4 bg-amber-500/10 cursor-grab active:cursor-grabbing border-b border-amber-500/10 select-none"
                        >
                            <div className="flex items-center gap-2">
                                <GripHorizontal size={16} className="opacity-70" />
                                <span className="font-bold">⚙️ Settings</span>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setIsPanelOpen(!isPanelOpen); }}
                                className="p-1 hover:text-white transition-transform duration-300"
                                style={{ transform: isPanelOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}
                                onMouseDown={(e) => e.stopPropagation()} 
                                onTouchStart={(e) => e.stopPropagation()}
                            >
                                <ChevronDown size={16} />
                            </button>
                        </div>

                        {/* Settings Content */}
                        {isPanelOpen && (
                            <div className="p-5 space-y-4 text-xs">
                                {/* 颜色选择 */}
                                <div className="flex justify-between items-center gap-2">
                                    <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                                        <input type="color" className="w-6 h-6 bg-transparent border-0 cursor-pointer" value={config.colors.gold} 
                                            onChange={(e) => setConfig({...config, colors: {...config.colors, gold: e.target.value}})} />
                                        Gold
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                                        <input type="color" className="w-6 h-6 bg-transparent border-0 cursor-pointer" value={config.colors.red} 
                                            onChange={(e) => setConfig({...config, colors: {...config.colors, red: e.target.value}})} />
                                        Red
                                    </label>
                                    <label className="flex items-center gap-1 cursor-pointer hover:text-white">
                                        <input type="color" className="w-6 h-6 bg-transparent border-0 cursor-pointer" value={config.colors.green} 
                                            onChange={(e) => setConfig({...config, colors: {...config.colors, green: e.target.value}})} />
                                        Green
                                    </label>
                                </div>

                                <div className="border-t border-amber-500/20"></div>

                                {/* 滑动条区域 */}
                                <div className="space-y-3">
                                    <div className="space-y-1">
                                        <div className="flex justify-between font-bold">
                                            <span>Glow Ratio</span>
                                            <span>{config.glowRatio}%</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="100" value={config.glowRatio} 
                                            onChange={(e) => setConfig({...config, glowRatio: parseInt(e.target.value)})}
                                            className="w-full accent-amber-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between font-bold">
                                            <span>Glow Intensity</span>
                                            <span>{(config.glowStrength/100).toFixed(1)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="300" value={config.glowStrength} 
                                            onChange={(e) => setConfig({...config, glowStrength: parseInt(e.target.value)})}
                                            className="w-full accent-amber-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between font-bold">
                                            <span>Particle Size</span>
                                            <span>{(config.particleSize/100).toFixed(1)}</span>
                                        </div>
                                        <input 
                                            type="range" min="10" max="200" value={config.particleSize} 
                                            onChange={(e) => setConfig({...config, particleSize: parseInt(e.target.value)})}
                                            className="w-full accent-amber-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <div className="flex justify-between font-bold">
                                            <span>Reflection</span>
                                            <span>{(config.reflection/100).toFixed(2)}</span>
                                        </div>
                                        <input 
                                            type="range" min="0" max="100" value={config.reflection} 
                                            onChange={(e) => setConfig({...config, reflection: parseInt(e.target.value)})}
                                            className="w-full accent-amber-500 h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div> 
                </div> 
            </>
        )}
    </div>
  );
  }; 

export default ChristmasTree;