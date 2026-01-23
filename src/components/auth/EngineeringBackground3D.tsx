import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line, OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Gabion cage wireframe
function GabionCage({ position, scale = 1 }: { position: [number, number, number]; scale?: number }) {
  const meshRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  const edges = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1.5 * scale, 1 * scale, 1 * scale);
    return new THREE.EdgesGeometry(geometry);
  }, [scale]);

  // Stone positions inside gabion
  const stones = useMemo(() => {
    const stonePositions: [number, number, number][] = [];
    for (let i = 0; i < 8; i++) {
      stonePositions.push([
        (Math.random() - 0.5) * 1.2 * scale,
        (Math.random() - 0.5) * 0.7 * scale,
        (Math.random() - 0.5) * 0.7 * scale,
      ]);
    }
    return stonePositions;
  }, [scale]);

  return (
    <group ref={meshRef} position={position}>
      {/* Wireframe cage */}
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#f5a524" transparent opacity={0.6} />
      </lineSegments>
      
      {/* Internal grid lines */}
      {[-0.3, 0, 0.3].map((x, i) => (
        <Line
          key={`v-${i}`}
          points={[[x * scale, -0.5 * scale, -0.5 * scale], [x * scale, -0.5 * scale, 0.5 * scale]]}
          color="#f5a524"
          lineWidth={1}
          transparent
          opacity={0.3}
        />
      ))}
      
      {/* Stones inside */}
      {stones.map((pos, i) => (
        <mesh key={i} position={pos}>
          <dodecahedronGeometry args={[0.12 * scale, 0]} />
          <meshBasicMaterial color="#8b7355" wireframe transparent opacity={0.5} />
        </mesh>
      ))}
    </group>
  );
}

// Plant/seedling
function Seedling({ position }: { position: [number, number, number] }) {
  const plantRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (plantRef.current) {
      // Gentle swaying animation
      plantRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + position[0]) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.2} floatIntensity={0.3}>
      <group ref={plantRef} position={position}>
        {/* Stem */}
        <Line
          points={[[0, 0, 0], [0, 0.5, 0]]}
          color="#22c55e"
          lineWidth={2}
        />
        {/* Leaves */}
        <Line
          points={[[0, 0.3, 0], [-0.2, 0.5, 0], [0, 0.4, 0]]}
          color="#22c55e"
          lineWidth={1.5}
        />
        <Line
          points={[[0, 0.35, 0], [0.2, 0.55, 0], [0, 0.45, 0]]}
          color="#22c55e"
          lineWidth={1.5}
        />
        {/* Top leaf */}
        <Line
          points={[[0, 0.5, 0], [0, 0.7, 0.1], [0, 0.5, 0]]}
          color="#4ade80"
          lineWidth={1.5}
        />
      </group>
    </Float>
  );
}

// Retaining wall section
function RetainingWall({ position }: { position: [number, number, number] }) {
  const wallRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (wallRef.current) {
      wallRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.05;
    }
  });

  const blocks = useMemo(() => {
    const blockPositions: { pos: [number, number, number]; size: [number, number, number] }[] = [];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 4; col++) {
        const offset = row % 2 === 0 ? 0 : 0.3;
        blockPositions.push({
          pos: [col * 0.6 - 0.9 + offset, row * 0.3, 0],
          size: [0.55, 0.25, 0.4],
        });
      }
    }
    return blockPositions;
  }, []);

  return (
    <group ref={wallRef} position={position}>
      {blocks.map((block, i) => {
        const geometry = new THREE.BoxGeometry(...block.size);
        const edges = new THREE.EdgesGeometry(geometry);
        return (
          <group key={i} position={block.pos}>
            <lineSegments geometry={edges}>
              <lineBasicMaterial color="#a1a1aa" transparent opacity={0.5} />
            </lineSegments>
          </group>
        );
      })}
    </group>
  );
}

// AutoCAD-style grid
function CADGrid() {
  const gridRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (gridRef.current) {
      gridRef.current.rotation.x = Math.PI / 2 + Math.sin(state.clock.elapsedTime * 0.1) * 0.02;
    }
  });

  const lines = useMemo(() => {
    const lineData: { start: [number, number, number]; end: [number, number, number] }[] = [];
    const size = 20;
    const divisions = 20;
    const step = size / divisions;
    
    for (let i = -divisions / 2; i <= divisions / 2; i++) {
      const pos = i * step;
      // Horizontal lines
      lineData.push({ start: [-size / 2, 0, pos], end: [size / 2, 0, pos] });
      // Vertical lines
      lineData.push({ start: [pos, 0, -size / 2], end: [pos, 0, size / 2] });
    }
    return lineData;
  }, []);

  return (
    <group ref={gridRef} position={[0, -3, 0]}>
      {lines.map((line, i) => (
        <Line
          key={i}
          points={[line.start, line.end]}
          color="#f5a524"
          lineWidth={0.5}
          transparent
          opacity={0.15}
        />
      ))}
    </group>
  );
}

// Floating blueprint wireframe building
function BlueprintBuilding({ position }: { position: [number, number, number] }) {
  const buildingRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (buildingRef.current) {
      buildingRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }
  });

  return (
    <Float speed={1} rotationIntensity={0.1} floatIntensity={0.5}>
      <group ref={buildingRef} position={position}>
        {/* Main structure */}
        <mesh>
          <boxGeometry args={[2, 3, 2]} />
          <meshBasicMaterial color="#f5a524" wireframe transparent opacity={0.3} />
        </mesh>
        
        {/* Floors */}
        {[0, 1, 2].map((floor) => (
          <mesh key={floor} position={[0, -1 + floor, 0]}>
            <boxGeometry args={[1.9, 0.05, 1.9]} />
            <meshBasicMaterial color="#3b82f6" wireframe transparent opacity={0.2} />
          </mesh>
        ))}
        
        {/* Columns */}
        {[[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0, z]}>
            <cylinderGeometry args={[0.05, 0.05, 3, 8]} />
            <meshBasicMaterial color="#22c55e" wireframe transparent opacity={0.4} />
          </mesh>
        ))}
      </group>
    </Float>
  );
}

// Garden bed with plants
function GardenBed({ position }: { position: [number, number, number] }) {
  const seedlingPositions = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let i = 0; i < 6; i++) {
      positions.push([
        (Math.random() - 0.5) * 2,
        0,
        (Math.random() - 0.5) * 1.5,
      ]);
    }
    return positions;
  }, []);

  return (
    <group position={position}>
      {/* Bed outline */}
      <Line
        points={[
          [-1.2, 0, -0.8],
          [1.2, 0, -0.8],
          [1.2, 0, 0.8],
          [-1.2, 0, 0.8],
          [-1.2, 0, -0.8],
        ]}
        color="#8b4513"
        lineWidth={2}
        transparent
        opacity={0.5}
      />
      
      {/* Seedlings */}
      {seedlingPositions.map((pos, i) => (
        <Seedling key={i} position={pos} />
      ))}
    </group>
  );
}

// Main scene
function Scene() {
  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
      {/* CAD Grid */}
      <CADGrid />
      
      {/* Blueprint building */}
      <BlueprintBuilding position={[0, 1, -5]} />
      
      {/* Gabion cages */}
      <GabionCage position={[-4, -1, -2]} scale={1.2} />
      <GabionCage position={[-2.5, -1, -2]} scale={1} />
      <GabionCage position={[4, -1.5, -3]} scale={0.8} />
      <GabionCage position={[3, -1.5, -3]} scale={0.8} />
      
      {/* Retaining walls */}
      <RetainingWall position={[-3, -2, 0]} />
      <RetainingWall position={[3, -2, 1]} />
      
      {/* Garden beds with seedlings */}
      <GardenBed position={[0, -2.5, 2]} />
      <GardenBed position={[-3, -2.5, 3]} />
      <GardenBed position={[3, -2.5, 3]} />
      
      {/* Additional floating seedlings */}
      <Seedling position={[-5, 0, 0]} />
      <Seedling position={[5, 0.5, -1]} />
      <Seedling position={[2, 1, 2]} />
      <Seedling position={[-2, 1.5, 1]} />
      
      {/* Camera controls - subtle auto-rotation */}
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        enableRotate={false}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </>
  );
}

export function EngineeringBackground3D() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 2, 10], fov: 60 }}
        style={{ background: "transparent" }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene />
      </Canvas>
    </div>
  );
}