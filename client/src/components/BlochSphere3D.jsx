import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

const BlochSphere3D = ({ qubitState, qubitIndex = 0, isInteractive = true }) => {
  const mountRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const sphereRef = useRef(null);
  const arrowRef = useRef(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f9fa);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      300 / 300,
      0.1,
      1000
    );
    camera.position.set(2, 2, 2);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(300, 300);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Controls for interaction
    let controls;
    if (isInteractive) {
      import('three/examples/jsm/controls/OrbitControls').then(({ OrbitControls }) => {
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.enableZoom = true;
        controls.enablePan = false;
      });
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create Bloch sphere
    const sphereGeometry = new THREE.SphereGeometry(1, 32, 32);
    const sphereMaterial = new THREE.MeshPhongMaterial({
      color: 0x646cff,
      opacity: 0.3,
      transparent: true,
      wireframe: false
    });
    const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
    sphere.receiveShadow = true;
    scene.add(sphere);
    sphereRef.current = sphere;

    // Add wireframe overlay
    const wireframeGeometry = new THREE.SphereGeometry(1.01, 16, 16);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
      color: 0x2ecc71,
      wireframe: true,
      opacity: 0.2,
      transparent: true
    });
    const wireframe = new THREE.Mesh(wireframeGeometry, wireframeMaterial);
    scene.add(wireframe);

    // Add coordinate axes
    const axesHelper = new THREE.AxesHelper(1.5);
    scene.add(axesHelper);

    // Add axis labels (simplified - using spheres instead of text for now)
    const addAxisLabel = (position, color) => {
      const labelGeometry = new THREE.SphereGeometry(0.03);
      const labelMaterial = new THREE.MeshBasicMaterial({ color });
      const labelMesh = new THREE.Mesh(labelGeometry, labelMaterial);
      labelMesh.position.copy(position);
      scene.add(labelMesh);
    };

    // Add state vector arrow
    const arrowGeometry = new THREE.ConeGeometry(0.05, 0.2, 8);
    const arrowMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      emissive: 0x330000
    });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.castShadow = true;
    scene.add(arrow);
    arrowRef.current = arrow;

    // Add arrow shaft
    const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.8);
    const shaftMaterial = new THREE.MeshPhongMaterial({
      color: 0xff6b6b,
      emissive: 0x330000
    });
    const shaft = new THREE.Mesh(shaftGeometry, shaftMaterial);
    shaft.castShadow = true;
    arrow.add(shaft);
    shaft.position.y = -0.5;

    // Add equator circle
    const equatorGeometry = new THREE.RingGeometry(0.99, 1.01, 64);
    const equatorMaterial = new THREE.MeshBasicMaterial({
      color: 0x666666,
      side: THREE.DoubleSide,
      opacity: 0.5,
      transparent: true
    });
    const equator = new THREE.Mesh(equatorGeometry, equatorMaterial);
    equator.rotation.x = Math.PI / 2;
    scene.add(equator);

    // Add meridian circles
    for (let i = 0; i < 4; i++) {
      const meridianGeometry = new THREE.RingGeometry(0.99, 1.01, 64, 1, 0, Math.PI);
      const meridian = new THREE.Mesh(meridianGeometry, equatorMaterial);
      meridian.rotation.y = (i * Math.PI) / 2;
      scene.add(meridian);
    }

    mountRef.current.appendChild(renderer.domElement);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controls) {
        controls.update();
      }
      
      // Subtle sphere rotation
      if (sphereRef.current && !isAnimating) {
        sphereRef.current.rotation.y += 0.002;
      }
      
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (controls) {
        controls.dispose();
      }
      renderer.dispose();
    };
  }, [isInteractive]);

  // Update qubit state visualization
  useEffect(() => {
    if (!qubitState || !arrowRef.current) return;

    setIsAnimating(true);

    // Parse qubit state (assuming it's in the format [alpha, beta])
    // For now, we'll use dummy coordinates
    const theta = Math.PI / 3; // Polar angle
    const phi = Math.PI / 4;   // Azimuthal angle

    // Convert spherical to Cartesian coordinates
    const x = Math.sin(theta) * Math.cos(phi);
    const y = Math.sin(theta) * Math.sin(phi);
    const z = Math.cos(theta);

    // Animate arrow to new position
    const arrow = arrowRef.current;
    const startPosition = arrow.position.clone();
    const endPosition = new THREE.Vector3(x, z, y); // Note: Y and Z swapped for proper orientation
    
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animateArrow = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth easing
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      
      // Interpolate position
      arrow.position.lerpVectors(startPosition, endPosition, easedProgress);
      
      // Orient arrow to point outward from center
      arrow.lookAt(arrow.position.clone().multiplyScalar(2));
      arrow.rotateX(Math.PI / 2); // Adjust orientation
      
      if (progress < 1) {
        requestAnimationFrame(animateArrow);
      } else {
        setIsAnimating(false);
      }
    };

    animateArrow();
  }, [qubitState]);

  return (
    <div className="bloch-sphere-3d">
      <div className="bloch-header">
        <h4>Qubit {qubitIndex} - 3D Bloch Sphere</h4>
        <div className="bloch-controls">
          {isInteractive && (
            <div className="interaction-hint">
              <span>🖱️ Drag to rotate • 🔍 Scroll to zoom</span>
            </div>
          )}
        </div>
      </div>
      <div 
        ref={mountRef} 
        className="bloch-mount"
        style={{ 
          width: '300px', 
          height: '300px', 
          margin: '0 auto',
          border: '2px solid #e1e5e9',
          borderRadius: '8px',
          overflow: 'hidden'
        }}
      />
      <div className="bloch-info">
        <div className="state-info">
          <span className="state-label">|ψ⟩ = α|0⟩ + β|1⟩</span>
        </div>
        <div className="bloch-legend">
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#ff6b6b' }}></div>
            <span>State Vector</span>
          </div>
          <div className="legend-item">
            <div className="legend-color" style={{ backgroundColor: '#2ecc71' }}></div>
            <span>Bloch Sphere</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlochSphere3D;
