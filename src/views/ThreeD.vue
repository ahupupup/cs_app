<template>
  <div ref="container" class="scene-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'

const container = ref<HTMLDivElement | null>(null)
let animationId: number
let composer: EffectComposer

// 场景组件引用
let galaxy: THREE.Points
let torusKnotGroup: THREE.Group
let plasmaBall: THREE.Mesh
let floatingRocks: THREE.Group
let gridHelper: THREE.GridHelper
let portal: THREE.Mesh

// 粒子系统
let particleSystem: THREE.Points

const clock = new THREE.Clock()

onMounted(() => {
  initScene()
  createGalaxy()
  createTorusKnotGroup()
  createPlasmaBall()
  createFloatingRocks()
  createGridFloor()
  createPortal()
  createParticleSystem()
  createLights()
  setupPostProcessing()
  animate()
  window.addEventListener('resize', onResize)
})

onUnmounted(() => {
  window.removeEventListener('resize', onResize)
  cancelAnimationFrame(animationId)
  composer.dispose()
})

// ─────────────────────────────────────────
// 主场景初始化
// ─────────────────────────────────────────
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer

function initScene() {
  scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x000011, 0.008)

  camera = new THREE.PerspectiveCamera(75, container.value!.clientWidth / container.value!.clientHeight, 0.1, 1000)
  camera.position.set(0, 15, 40)

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
  renderer.setSize(container.value!.clientWidth, container.value!.clientHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  container.value!.appendChild(renderer.domElement)
}

// ─────────────────────────────────────────
// 创建银河粒子场
// ─────────────────────────────────────────
function createGalaxy() {
  const geometry = new THREE.BufferGeometry()
  const count = 8000
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  const sizes = new Float32Array(count)

  for (let i = 0; i < count; i++) {
    const r = 60 + Math.random() * 80
    const theta = Math.random() * Math.PI * 2
    const phi = (Math.random() - 0.5) * Math.PI * 0.3

    positions[i * 3] = r * Math.cos(theta) * Math.cos(phi)
    positions[i * 3 + 1] = r * Math.sin(phi) * 0.5
    positions[i * 3 + 2] = r * Math.sin(theta) * Math.cos(phi)

    const color = new THREE.Color()
    color.setHSL(0.55 + Math.random() * 0.2, 0.8, 0.5 + Math.random() * 0.5)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b

    sizes[i] = Math.random() * 3 + 0.5
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

  const material = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
  })

  galaxy = new THREE.Points(geometry, material)
  scene.add(galaxy)
}

// ─────────────────────────────────────────
// 环面结群组
// ─────────────────────────────────────────
function createTorusKnotGroup() {
  torusKnotGroup = new THREE.Group()

  const colors = [0x6366f1, 0x8b5cf6, 0xa855f7, 0xec4899]
  const sizes = [6, 5, 4, 3.5]

  for (let i = 0; i < 4; i++) {
    const geometry = new THREE.TorusKnotGeometry(sizes[i], sizes[i] * 0.3, 128, 16)
    const material = new THREE.MeshPhongMaterial({
      color: colors[i],
      emissive: colors[i],
      emissiveIntensity: 0.3,
      specular: 0xffffff,
      shininess: 150,
      transparent: true,
      opacity: 0.85
    })
    const torusKnot = new THREE.Mesh(geometry, material)
    torusKnot.userData = {
      rotationSpeed: { x: 0.008 - i * 0.001, y: 0.012 + i * 0.002 },
      orbitRadius: 10 + i * 5,
      orbitOffset: i * Math.PI * 0.5
    }
    torusKnotGroup.add(torusKnot)
  }

  torusKnotGroup.position.set(0, 10, 0)
  scene.add(torusKnotGroup)
}

// ─────────────────────────────────────────
// 等离子球体
// ─────────────────────────────────────────
function createPlasmaBall() {
  const geometry = new THREE.SphereGeometry(5, 32, 32)
  const material = new THREE.MeshPhongMaterial({
    color: 0x3b82f6,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.6,
    wireframe: false
  })
  plasmaBall = new THREE.Mesh(geometry, material)
  plasmaBall.position.set(-20, 8, -10)
  scene.add(plasmaBall)

  // 内部核心
  const coreGeo = new THREE.SphereGeometry(3, 16, 16)
  const coreMat = new THREE.MeshBasicMaterial({ color: 0x60a5fa })
  const core = new THREE.Mesh(coreGeo, coreMat)
  plasmaBall.add(core)

  // 电离层
  const ionGeo = new THREE.SphereGeometry(5.5, 32, 32)
  const ionMat = new THREE.MeshBasicMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.15,
    side: THREE.BackSide
  })
  plasmaBall.add(new THREE.Mesh(ionGeo, ionMat))
}

// ─────────────────────────────────────────
// 漂浮岩石群
// ─────────────────────────────────────────
function createFloatingRocks() {
  floatingRocks = new THREE.Group()

  for (let i = 0; i < 25; i++) {
    const size = Math.random() * 3 + 1
    const geometry = new THREE.IcosahedronGeometry(size, 0)

    // 随机变形
    const posAttr = geometry.getAttribute('position')
    for (let j = 0; j < posAttr.count; j++) {
      const x = posAttr.getX(j)
      const y = posAttr.getY(j)
      const z = posAttr.getZ(j)
      posAttr.setXYZ(j, x * (0.8 + Math.random() * 0.4), y * (0.8 + Math.random() * 0.4), z * (0.8 + Math.random() * 0.4))
    }
    geometry.computeVertexNormals()

    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(0.6, 0.2, 0.3 + Math.random() * 0.2),
      flatShading: true,
      transparent: true,
      opacity: 0.9
    })

    const rock = new THREE.Mesh(geometry, material)
    rock.position.set(
      (Math.random() - 0.5) * 80,
      Math.random() * 30 + 5,
      (Math.random() - 0.5) * 80
    )
    rock.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI)
    rock.userData = {
      rotationSpeed: {
        x: (Math.random() - 0.5) * 0.01,
        y: (Math.random() - 0.5) * 0.01,
        z: (Math.random() - 0.5) * 0.01
      },
      floatOffset: Math.random() * Math.PI * 2,
      floatSpeed: 0.5 + Math.random() * 0.5,
      floatRange: 0.5 + Math.random() * 1.5,
      baseY: rock.position.y
    }
    floatingRocks.add(rock)
  }

  scene.add(floatingRocks)
}

// ─────────────────────────────────────────
// 网格地板
// ─────────────────────────────────────────
function createGridFloor() {
  const size = 100
  const divisions = 50
  gridHelper = new THREE.GridHelper(size, divisions, 0x1e3a5f, 0x0f172a)
  gridHelper.position.y = 0
  gridHelper.material.opacity = 0.3
  gridHelper.material.transparent = true
  scene.add(gridHelper)

  // 发光线条
  const glowGeo = new THREE.PlaneGeometry(size, size)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x1e40af,
    transparent: true,
    opacity: 0.05,
    side: THREE.DoubleSide
  })
  const glowPlane = new THREE.Mesh(glowGeo, glowMat)
  glowPlane.rotation.x = -Math.PI / 2
  glowPlane.position.y = 0.01
  scene.add(glowPlane)
}

// ─────────────────────────────────────────
// 传送门
// ─────────────────────────────────────────
function createPortal() {
  const geometry = new THREE.TorusGeometry(8, 0.5, 16, 100)
  const material = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.8
  })
  portal = new THREE.Mesh(geometry, material)
  portal.position.set(25, 8, 5)
  portal.rotation.x = Math.PI * 0.1
  scene.add(portal)

  // 内圈光环
  const innerGeo = new THREE.TorusGeometry(6, 0.3, 16, 100)
  const innerMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 })
  const innerRing = new THREE.Mesh(innerGeo, innerMat)
  portal.add(innerRing)

  // 背景光晕
  const glowGeo = new THREE.CircleGeometry(9, 64)
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0x22d3ee,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide
  })
  const glow = new THREE.Mesh(glowGeo, glowMat)
  portal.add(glow)
}

// ─────────────────────────────────────────
// 粒子喷射系统
// ─────────────────────────────────────────
function createParticleSystem() {
  const geometry = new THREE.BufferGeometry()
  const count = 2000
  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 3
    positions[i * 3] = Math.cos(angle) * radius
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10
    positions[i * 3 + 2] = Math.sin(angle) * radius

    velocities[i * 3] = (Math.random() - 0.5) * 0.1
    velocities[i * 3 + 1] = Math.random() * 0.2 + 0.05
    velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.1

    const color = new THREE.Color()
    color.setHSL(0.5 + Math.random() * 0.3, 1, 0.6)
    colors[i * 3] = color.r
    colors[i * 3 + 1] = color.g
    colors[i * 3 + 2] = color.b
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.userData = { velocities }

  const material = new THREE.PointsMaterial({
    size: 0.3,
    vertexColors: true,
    transparent: true,
    opacity: 0.8,
    blending: THREE.AdditiveBlending
  })

  particleSystem = new THREE.Points(geometry, material)
  particleSystem.position.copy(plasmaBall.position)
  scene.add(particleSystem)
}

// ─────────────────────────────────────────
// 灯光设置
// ─────────────────────────────────────────
function createLights() {
  const ambientLight = new THREE.AmbientLight(0x404080, 0.5)
  scene.add(ambientLight)

  const pointLight1 = new THREE.PointLight(0x6366f1, 2, 100)
  pointLight1.position.set(0, 20, 0)
  scene.add(pointLight1)

  const pointLight2 = new THREE.PointLight(0x22d3ee, 1.5, 80)
  pointLight2.position.set(25, 10, 5)
  scene.add(pointLight2)

  const pointLight3 = new THREE.PointLight(0xec4899, 1, 60)
  pointLight3.position.set(-20, 10, -10)
  scene.add(pointLight3)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.3)
  directionalLight.position.set(10, 30, 10)
  scene.add(directionalLight)
}

// ─────────────────────────────────────────
// 后处理：Bloom 效果
// ─────────────────────────────────────────
function setupPostProcessing() {
  composer = new EffectComposer(renderer)

  const renderPass = new RenderPass(scene, camera)
  composer.addPass(renderPass)

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(container.value!.clientWidth, container.value!.clientHeight),
    0.8,   // strength
    0.4,   // radius
    0.2    // threshold
  )
  composer.addPass(bloomPass)
}

// ─────────────────────────────────────────
// 动画循环
// ─────────────────────────────────────────
function animate() {
  animationId = requestAnimationFrame(animate)

  const time = clock.getElapsedTime()

  // 银河旋转
  if (galaxy) {
    galaxy.rotation.y += 0.0003
    galaxy.rotation.x += 0.0001
  }

  // 环面结群组公转 + 自转
  if (torusKnotGroup) {
    torusKnotGroup.rotation.y += 0.005
    torusKnotGroup.children.forEach((child) => {
      const ud = child.userData
      child.rotation.x += ud.rotationSpeed.x
      child.rotation.y += ud.rotationSpeed.y

      // 轨道运动
      const angle = time * 0.3 + ud.orbitOffset
      child.position.x = Math.cos(angle) * ud.orbitRadius * 0.3
      child.position.z = Math.sin(angle) * ud.orbitRadius * 0.3
    })
  }

  // 等离子球脉动
  if (plasmaBall) {
    const scale = 1 + Math.sin(time * 2) * 0.05
    plasmaBall.scale.set(scale, scale, scale)
    plasmaBall.rotation.y += 0.01
    plasmaBall.children.forEach((c, i) => {
      if (i === 1) c.rotation.y += 0.02 // 核心
    })
  }

  // 粒子喷射
  if (particleSystem) {
    const positions = particleSystem.geometry.attributes.position.array as Float32Array
    const velocities = particleSystem.geometry.userData.velocities as Float32Array

    for (let i = 0; i < positions.length / 3; i++) {
      positions[i * 3] += velocities[i * 3]
      positions[i * 3 + 1] += velocities[i * 3 + 1]
      positions[i * 3 + 2] += velocities[i * 3 + 2]

      // 重置落出范围的粒子
      if (positions[i * 3 + 1] > 15) {
        const angle = Math.random() * Math.PI * 2
        const radius = Math.random() * 3
        positions[i * 3] = Math.cos(angle) * radius
        positions[i * 3 + 1] = -5
        positions[i * 3 + 2] = Math.sin(angle) * radius
      }
    }
    particleSystem.geometry.attributes.position.needsUpdate = true
    particleSystem.rotation.y += 0.01
  }

  // 漂浮岩石
  if (floatingRocks) {
    floatingRocks.children.forEach(rock => {
      const ud = rock.userData
      rock.rotation.x += ud.rotationSpeed.x
      rock.rotation.y += ud.rotationSpeed.y
      rock.rotation.z += ud.rotationSpeed.z
      rock.position.y = ud.baseY + Math.sin(time * ud.floatSpeed + ud.floatOffset) * ud.floatRange
    })
  }

  // 传送门旋转
  if (portal) {
    portal.rotation.z += 0.01
    portal.rotation.x = Math.PI * 0.1 + Math.sin(time) * 0.05
  }

  // 网格地板发光
  if (gridHelper) {
    const mat = gridHelper.material as THREE.LineBasicMaterial
    mat.opacity = 0.2 + Math.sin(time) * 0.1
  }

  // 相机轨道运动
  const camRadius = 50
  const camSpeed = 0.1
  camera.position.x = Math.cos(time * camSpeed) * camRadius * 0.5
  camera.position.z = Math.sin(time * camSpeed) * camRadius
  camera.position.y = 15 + Math.sin(time * 0.2) * 5
  camera.lookAt(0, 10, 0)

  composer.render()
}

function onResize() {
  if (!container.value) return
  camera.aspect = container.value.clientWidth / container.value.clientHeight
  camera.updateProjectionMatrix()
  renderer.setSize(container.value.clientWidth, container.value.clientHeight)
  composer.setSize(container.value.clientWidth, container.value.clientHeight)
}
</script>

<style scoped>
.scene-container {
  width: 100%;
  height: calc(100vh - 80px);
  overflow: hidden;
  background: #000011;
  position: relative;
}
</style>