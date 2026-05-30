<template>
  <div class="map-page">
    <el-card class="toolbar-card">
      <div class="toolbar">
        <el-button type="primary" @click="flyToCity('北京')" plain>
          <el-icon><Location /></el-icon> 北京
        </el-button>
        <el-button type="primary" @click="flyToCity('上海')" plain>
          <el-icon><Location /></el-icon> 上海
        </el-button>
        <el-button type="primary" @click="flyToCity('深圳')" plain>
          <el-icon><Location /></el-icon> 深圳
        </el-button>
        <el-button type="primary" @click="flyToCity('成都')" plain>
          <el-icon><Location /></el-icon> 成都
        </el-button>
        <el-button type="primary" @click="flyToCity('杭州')" plain>
          <el-icon><Location /></el-icon> 杭州
        </el-button>
        <el-divider direction="vertical" />
        <el-button :icon="isDark ? 'Sunny' : 'Moon'" @click="toggleDark">
          {{ isDark ? '白天' : '夜间' }}
        </el-button>
        <el-button @click="addRandomMarker">+ 添加标记</el-button>
        <el-button @click="clearMarkers">清空标记</el-button>
        <el-switch
          v-model="showTraffic"
          active-text="路况"
          inactive-text=""
          style="margin-left: 12px"
        />
      </div>
    </el-card>

    <div ref="mapContainer" class="map-container"></div>

    <!-- 弹窗详情 -->
    <el-drawer v-model="drawerVisible" title="地点详情" size="400px" direction="rtl">
      <div v-if="selectedMarker" class="drawer-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="地点名称">
            <el-tag type="primary">{{ selectedMarker.name }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="经度">
            {{ selectedMarker.lng?.toFixed(6) }}
          </el-descriptions-item>
          <el-descriptions-item label="纬度">
            {{ selectedMarker.lat?.toFixed(6) }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            <el-tag :type="markerTypeColor(selectedMarker.type)">
              {{ selectedMarker.type }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="描述">
            {{ selectedMarker.description || '暂无' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ selectedMarker.createdAt }}
          </el-descriptions-item>
        </el-descriptions>

        <div class="drawer-actions">
          <el-button type="primary" @click="startNavigation">开始导航</el-button>
          <el-button type="danger" @click="deleteCurrentMarker">删除标记</el-button>
        </div>

        <el-divider content-position="left">周边信息</el-divider>
        <el-row :gutter="12">
          <el-col :span="8" v-for="info in nearbyInfo" :key="info.label">
            <el-card shadow="hover" class="info-card">
              <div class="info-value">{{ info.value }}</div>
              <div class="info-label">{{ info.label }}</div>
            </el-card>
          </el-col>
        </el-row>
      </div>
    </el-drawer>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="formVisible" :title="isEdit ? '编辑标记' : '添加新标记'" width="500px">
      <el-form :model="markerForm" :rules="formRules" ref="formRef" label-width="90px">
        <el-form-item label="地点名称" prop="name">
          <el-input v-model="markerForm.name" placeholder="请输入地点名称" />
        </el-form-item>
        <el-form-item label="地点类型" prop="type">
          <el-select v-model="markerForm.type" placeholder="请选择类型" style="width: 100%">
            <el-option label="🏢 写字楼" value="写字楼" />
            <el-option label="🏠 住宅" value="住宅" />
            <el-option label="🛒 商超" value="商超" />
            <el-option label="🏥 医院" value="医院" />
            <el-option label="🏫 学校" value="学校" />
            <el-option label="🅿️ 停车场" value="停车场" />
            <el-option label="🚇 地铁站" value="地铁站" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="markerForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息"
          />
        </el-form-item>
        <el-form-item label="经度" prop="lng">
          <el-input-number v-model="markerForm.lng" :precision="6" :step="0.01" />
        </el-form-item>
        <el-form-item label="纬度" prop="lat">
          <el-input-number v-model="markerForm.lat" :precision="6" :step="0.01" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitMarker">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Location } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

// 地图实例
let map: L.Map | null = null
const markers: L.Marker[] = []
const markerData: any[] = []

const mapContainer = ref<HTMLDivElement | null>(null)
const isDark = ref(false)
const showTraffic = ref(false)
const drawerVisible = ref(false)
const formVisible = ref(false)
const isEdit = ref(false)
const selectedMarker = ref<any>(null)
const formRef = ref()

const markerForm = reactive({
  name: '',
  type: '写字楼',
  description: '',
  lng: 116.4074,
  lat: 39.9042
})

const formRules = {
  name: [{ required: true, message: '请输入地点名称', trigger: 'blur' }],
  lng: [{ required: true, message: '请输入经度', trigger: 'blur' }],
  lat: [{ required: true, message: '请输入纬度', trigger: 'blur' }]
}

const nearbyInfo = ref([
  { label: '餐饮', value: '128家' },
  { label: '住宿', value: '45家' },
  { label: '停车', value: '12处' },
  { label: '公交', value: '23条' },
  { label: '地铁', value: '2条' },
  { label: '医院', value: '3所' }
])

// 城市坐标
const cities: Record<string, { center: [number, number]; zoom: number }> = {
  '北京': { center: [39.9042, 116.4074], zoom: 12 },
  '上海': { center: [31.2304, 121.4737], zoom: 12 },
  '深圳': { center: [22.5431, 114.0579], zoom: 13 },
  '成都': { center: [30.5728, 104.0668], zoom: 12 },
  '杭州': { center: [30.2741, 120.1551], zoom: 12 }
}

// 默认标记点
const defaultMarkers = [
  { name: '天安门广场', type: '写字楼', lng: 116.3975, lat: 39.9084, description: '北京市中心地标' },
  { name: '故宫博物院', type: '写字楼', lng: 116.3972, lat: 39.9163, description: '明清两代皇宫' },
  { name: '北京站', type: '地铁站', lng: 116.4274, lat: 39.9042, description: '主要铁路枢纽' },
  { name: '三里屯', type: '商超', lng: 116.4534, lat: 39.9339, description: '时尚购物区' },
  { name: '望京SOHO', type: '写字楼', lng: 116.4694, lat: 39.9974, description: '大型写字楼群' }
]

// 标记图标颜色
const markerColors: Record<string, string> = {
  '写字楼': '#6366f1',
  '住宅': '#22c55e',
  '商超': '#f59e0b',
  '医院': '#ef4444',
  '学校': '#3b82f6',
  '停车场': '#6b7280',
  '地铁站': '#8b5cf6'
}

function markerTypeColor(type: string) {
  const map: Record<string, string> = {
    '写字楼': 'primary',
    '住宅': 'success',
    '商超': 'warning',
    '医院': 'danger',
    '学校': '',
    '停车场': 'info'
  }
  return map[type] || 'primary'
}

function getMarkerIcon(type: string) {
  const color = markerColors[type] || '#6366f1'
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); color: white; font-size: 14px;">📍</span>
      </div>
    `,
    className: 'custom-marker',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  })
}

function createPopupContent(data: any) {
  return `
    <div style="min-width: 180px; padding: 4px;">
      <div style="font-weight: bold; font-size: 14px; margin-bottom: 8px;">${data.name}</div>
      <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
        <span style="background: ${markerColors[data.type] || '#6366f1'}; color: white; padding: 1px 6px; border-radius: 4px; font-size: 11px;">${data.type}</span>
      </div>
      <div style="font-size: 12px; color: #666;">📍 ${data.lng?.toFixed(4)}, ${data.lat?.toFixed(4)}</div>
      ${data.description ? `<div style="font-size: 12px; color: #888; margin-top: 4px;">${data.description}</div>` : ''}
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <button onclick="window.dispatchEvent(new CustomEvent('marker-edit', ${JSON.stringify(data).replace(/"/g, '&quot;')}))" style="background: #6366f1; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">编辑</button>
        <button onclick="window.dispatchEvent(new CustomEvent('marker-delete', ${JSON.stringify(data).replace(/"/g, '&quot;')}))" style="background: #ef4444; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 11px;">删除</button>
      </div>
    </div>
  `
}

function addMarker(data: any, flyTo = false) {
  if (!map) return

  const icon = getMarkerIcon(data.type)
  const marker = L.marker([data.lat, data.lng], { icon })

  marker.bindPopup(createPopupContent(data), {
    maxWidth: 280,
    className: 'custom-popup'
  })

  marker.on('click', () => {
    selectedMarker.value = data
    drawerVisible.value = true
  })

  marker.addTo(map)
  markers.push(marker)
  markerData.push(data)

  if (flyTo) {
    map.flyTo([data.lat, data.lng], 15, { duration: 1.5 })
  }
}

function initMap() {
  map = L.map(mapContainer.value!, {
    center: [39.9042, 116.4074],
    zoom: 10,
    zoomControl: true
  })

  // 暗色/亮色图层
  const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &copy; CARTO',
    maxZoom: 19
  })

  const lightTiles = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19
  })

  darkTiles.addTo(map)

  // 默认标记
  defaultMarkers.forEach(m => addMarker(m))

  // 地图点击事件
  map.on('click', (e) => {
    markerForm.lng = e.latlng.lng
    markerForm.lat = e.latlng.lat
  })

  // 切换图层
  watch(isDark, (val) => {
    map!.eachLayer(layer => {
      if (layer instanceof L.TileLayer) {
        map!.removeLayer(layer)
      }
    })
    val ? darkTiles.addTo(map!) : lightTiles.addTo(map!)
  })

  // 全局事件监听（popup内按钮）
  window.addEventListener('marker-edit', ((e: CustomEvent) => {
    const data = e.detail
    selectedMarker.value = data
    markerForm.name = data.name
    markerForm.type = data.type
    markerForm.description = data.description || ''
    markerForm.lng = data.lng
    markerForm.lat = data.lat
    isEdit.value = true
    formVisible.value = true
  }) as EventListener)

  window.addEventListener('marker-delete', ((e: CustomEvent) => {
    const data = e.detail
    ElMessageBox.confirm(`确定删除标记「${data.name}」？`, '提示').then(() => {
      deleteMarker(data)
    }).catch(() => {})
  }) as EventListener)
}

function flyToCity(city: string) {
  if (!map) return
  const info = cities[city]
  map.flyTo(info.center, info.zoom, { duration: 2 })
  ElMessage.success(`飞往${city}，请稍候...`)
}

function addRandomMarker() {
  const types = Object.keys(markerColors)
  const type = types[Math.floor(Math.random() * types.length)]
  const lng = 116.3 + Math.random() * 0.3
  const lat = 39.85 + Math.random() * 0.15

  markerForm.name = `${type}-${Math.floor(Math.random() * 1000)}`
  markerForm.type = type
  markerForm.description = `随机添加的${type}标记`
  markerForm.lng = parseFloat(lng.toFixed(6))
  markerForm.lat = parseFloat(lat.toFixed(6))
  isEdit.value = false
  formVisible.value = true
}

function clearMarkers() {
  ElMessageBox.confirm('确定清空所有标记？', '提示').then(() => {
    markers.forEach(m => m.remove())
    markers.length = 0
    markerData.length = 0
    ElMessage.success('已清空所有标记')
  }).catch(() => {})
}

function submitMarker() {
  formRef.value?.validate((valid: boolean) => {
    if (!valid) return

    const data = {
      name: markerForm.name,
      type: markerForm.type,
      description: markerForm.description,
      lng: markerForm.lng,
      lat: markerForm.lat,
      createdAt: new Date().toLocaleString()
    }

    if (isEdit.value) {
      // 编辑模式
      const idx = markerData.findIndex(m => m.name === selectedMarker.value.name)
      if (idx !== -1) {
        markerData[idx] = data
        markers[idx].setPopupContent(createPopupContent(data))
      }
      ElMessage.success('修改成功')
    } else {
      // 添加模式
      addMarker(data, true)
      ElMessage.success('添加成功')
    }

    formVisible.value = false
  })
}

function deleteCurrentMarker() {
  if (!selectedMarker.value) return
  ElMessageBox.confirm(`确定删除标记「${selectedMarker.value.name}」？`, '提示').then(() => {
    deleteMarker(selectedMarker.value)
    drawerVisible.value = false
  }).catch(() => {})
}

function deleteMarker(data: any) {
  const idx = markerData.findIndex(m => m.name === data.name)
  if (idx !== -1) {
    markers[idx].remove()
    markers.splice(idx, 1)
    markerData.splice(idx, 1)
  }
  selectedMarker.value = null
  ElMessage.success('已删除')
}

function startNavigation() {
  if (!selectedMarker.value || !map) return
  map.flyTo([selectedMarker.value.lat, selectedMarker.value.lng], 16, { duration: 1.5 })
  drawerVisible.value = false
  ElMessage.success(`正在导航至：${selectedMarker.value.name}`)
}

function toggleDark() {
  isDark.value = !isDark.value
}

onMounted(() => {
  initMap()
})

onUnmounted(() => {
  map?.remove()
})
</script>

<style scoped>
.map-page {
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.toolbar-card {
  flex-shrink: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.map-container {
  flex: 1;
  min-height: 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #dcdfe6;
}

.drawer-content {
  padding: 0 16px;
}

.drawer-actions {
  margin: 20px 0;
  display: flex;
  gap: 12px;
}

.info-card {
  text-align: center;
  margin-bottom: 12px;
}

.info-value {
  font-size: 20px;
  font-weight: bold;
  color: #409eff;
}

.info-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

:deep(.custom-popup) {
  .leaflet-popup-content-wrapper {
    border-radius: 8px;
  }
}
</style>