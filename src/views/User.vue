<template>
  <div>
    <el-card>
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户名/邮箱"
              style="width: 200px; margin-right: 10px"
              clearable
              @keyup.enter="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="resetSearch">重置</el-button>
          </div>
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增用户</el-button>
        </div>
      </template>

      <!-- 用户列表表格 -->
      <el-table :data="tableData" v-loading="loading" stripe style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="姓名" />
        <el-table-column prop="email" label="邮箱" />
        <el-table-column prop="age" label="年龄" width="100">
          <template #default="{ row }">
            {{ row.age ?? '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button size="small" type="primary" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[5, 10, 20, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <!-- 用户表单弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="500px"
      @close="handleDialogClose"
    >
      <el-form ref="formRef" :model="formData" :rules="formRules" label-width="80px">
        <el-form-item label="姓名" prop="name">
          <el-input v-model="formData.name" placeholder="请输入姓名" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="formData.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="年龄" prop="age">
          <el-input-number v-model="formData.age" :min="0" :max="150" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  searchUsers,
  type User,
  type UserCreateRequest,
  type UserUpdateRequest
} from '../api/user'

// ─── 状态 ────────────────────────────────
const loading = ref(false)
const submitLoading = ref(false)

// 表格数据
const tableData = ref<User[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)

// 搜索
const searchKeyword = ref('')

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('')
const isEdit = ref(false)
const editingUserId = ref<number | null>(null)

// 表单
const formRef = ref<FormInstance>()
const formData = reactive<UserCreateRequest>({
  name: '',
  email: '',
  age: undefined
})

// 表单验证规则
const formRules: FormRules = {
  name: [
    { required: true, message: '请输入姓名', trigger: 'blur' },
    { min: 2, max: 20, message: '姓名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  email: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ]
}

// ─── 方法 ────────────────────────────────

// 加载用户列表
const loadUsers = async () => {
  loading.value = true
  try {
    if (searchKeyword.value) {
      // 搜索模式
      const res = await searchUsers({
        keyword: searchKeyword.value,
        page: currentPage.value,
        page_size: pageSize.value
      })
      tableData.value = res.results
      total.value = res.total
    } else {
      // 普通模式
      const res = await getUsers()
      tableData.value = res
      total.value = res.length
    }
  } catch (error) {
    ElMessage.error('加载用户列表失败')
    console.error(error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  currentPage.value = 1
  loadUsers()
}

// 重置搜索
const resetSearch = () => {
  searchKeyword.value = ''
  currentPage.value = 1
  loadUsers()
}

// 分页
const handlePageChange = (page: number) => {
  currentPage.value = page
  loadUsers()
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadUsers()
}

// 打开新增弹窗
const handleAdd = () => {
  dialogTitle.value = '新增用户'
  isEdit.value = false
  editingUserId.value = null
  resetForm()
  dialogVisible.value = true
}

// 打开编辑弹窗
const handleEdit = (row: User) => {
  dialogTitle.value = '编辑用户'
  isEdit.value = true
  editingUserId.value = row.id
  formData.name = row.name
  formData.email = row.email
  formData.age = row.age
  dialogVisible.value = true
}

// 重置表单
const resetForm = () => {
  formData.name = ''
  formData.email = ''
  formData.age = undefined
  formRef.value?.clearValidate()
}

// 关闭弹窗
const handleDialogClose = () => {
  resetForm()
}

// 提交表单
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    submitLoading.value = true

    if (isEdit.value && editingUserId.value) {
      // 编辑
      const data: UserUpdateRequest = {
        name: formData.name,
        email: formData.email,
        age: formData.age
      }
      await updateUser(editingUserId.value, data)
      ElMessage.success('更新成功')
    } else {
      // 新增
      await createUser({
        name: formData.name,
        email: formData.email,
        age: formData.age
      })
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadUsers()
  } catch (error: any) {
    if (error?.message) {
      ElMessage.error(error.message)
    }
  } finally {
    submitLoading.value = false
  }
}

// 删除用户
const handleDelete = async (row: User) => {
  try {
    await ElMessageBox.confirm(`确认删除用户「${row.name}」吗？`, '删除确认', {
      type: 'warning'
    })
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    loadUsers()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// ─── 初始化 ────────────────────────────────
onMounted(() => {
  loadUsers()
})
</script>

<style scoped>
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-left {
  display: flex;
  align-items: center;
}
.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}
</style>