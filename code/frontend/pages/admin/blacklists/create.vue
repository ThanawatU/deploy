<template>
    <div>
        <AdminHeader />
        <AdminSidebar />

        <!-- Main Content -->
        <main id="main-content" class="main-content mt-16 ml-0 lg:ml-[280px] p-6">
            <div class="mb-8">
                <NuxtLink to="/admin/blacklists"
                    class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>ย้อนกลับ</span>
                </NuxtLink>
            </div>

            <div class="mx-auto max-w-8xl">
                <!-- Title + Actions (same structure as index) -->
                <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <!-- Left -->
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-semibold text-gray-800">เพิ่มผู้ใช้ที่ถูกแบน</h1>
                        <span class="text-sm text-gray-500">กรอกข้อมูลให้ครบถ้วน แล้วกด “บันทึก”</span>
                    </div>

                </div>

                <!-- Form Card (same card look as index) -->
                <div class="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div class="px-4 py-4 border-b border-gray-200 sm:px-6">
                        <h2 class="font-medium text-gray-800">ข้อมูลผู้ใช้</h2>
                    </div>

                    <div class="grid grid-cols-1 gap-6 p-4 sm:p-6">
                        <!-- ข้อมูลข้อความทั้งหมด -->
                        <div class="w-full max-w-[40rem] mx-auto space-y-6">
                            <div class="grid grid-cols-1 gap-6">
                                <!-- User Search -->
                                <div class="relative">
                                    <label class="block mb-1 text-xs font-medium text-gray-600">ค้นหาผู้ใช้ (อีเมล / ชื่อ / Username) <span class="text-red-500">*</span></label>
                                    <input v-model.trim="userQuery" @input="onSearchUsers" type="text" placeholder="เช่น user@gmail.com หรือ ชื่อ"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                                    <!-- Show User List -->
                                    <div v-if="showUserList"
                                        class="absolute z-20 w-full mt-1 overflow-auto bg-white border rounded-md shadow max-h-60">
                                        <button v-for="u in userResults" :key="u.id" type="button"
                                            @click="selectUser(u)"
                                            class="w-full px-3 py-2 text-left hover:bg-blue-50">
                                            <div class="text-sm font-medium text-gray-800">
                                                {{ u.firstName }} {{ u.lastName }}
                                                <span v-if="u.username" class="text-xs text-gray-500">(@{{ u.username }})</span>
                                            </div>
                                            <div class="text-xs text-gray-500">{{ u.email }}</div>
                                        </button>
                                        <div v-if="!isSearchingUsers && userResults.length === 0"
                                            class="px-3 py-2 text-sm text-gray-500">
                                            ไม่พบผู้ใช้ที่ตรงกับคำค้น
                                        </div>
                                    </div>
                                    <p v-if="!form.username" class="mt-2 text-xs text-amber-600">* ต้องเลือกผู้ใช้จากรายการก่อนส่งฟอร์ม</p>
                                    <div v-if="selectedUser" class="mt-2 p-2 bg-gray-50 rounded border text-xs text-gray-700">
                                        <div><b>ชื่อ:</b> {{ selectedUser.firstName }} {{ selectedUser.lastName }}</div>
                                        <div><b>Email:</b> {{ selectedUser.email }}</div>
                                        <div><b>Username:</b> {{ selectedUser.username }}</div>
                                        <div><b>Role:</b> {{ selectedUser.role }}</div>
                                    </div>
                                </div>
                        
                                <!-- Reason -->
                                <div>
                                    <label class="block mb-1 text-xs font-medium text-gray-600">Reason <span class="text-red-500">*</span></label>
                                    <input v-model.trim="form.reason" type="text" placeholder="เหตุผล"
                                        class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <!-- Suspend Until -->
                                <div>
                                    <label class="block mb-1 text-xs font-medium text-gray-600">ระยะเวลาการแบน (วัน) <span class="text-red-500">*</span></label>
                                    <input type="number" min="1" v-model.number="suspendDays" @input="onInputSuspendDays" placeholder="จำนวนวัน"
                                        class="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500" />
                                </div>
                                <!-- Upload Evidence -->
                                <div>
                                    <label class="block mb-1 text-xs font-medium text-gray-600">Upload Evidence <span class="text-red-500">*</span></label>
                                    <div class="flex items-center gap-3">
                                        <button type="button" @click="evidenceInput?.click()"
                                            class="px-3 py-2 bg-gray-100 border border-gray-300 rounded hover:bg-blue-50 text-sm">
                                            + Add File
                                        </button>
                                        <span v-if="form.evidenceFile" class="text-xs text-gray-700">{{ form.evidenceFile.name }}</span>
                                        <input ref="evidenceInput" type="file" class="hidden" @change="onEvidenceFile" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Footer actions -->
                    <div class="flex items-center justify-end gap-2 px-4 py-4 border-t border-gray-200 sm:px-6">
                        <button @click="handleSubmit" :disabled="isSubmitting"
                            class="inline-flex items-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed">
                            <svg v-if="isSubmitting" class="w-4 h-4 mr-1 -ml-1 animate-spin" viewBox="0 0 24 24">
                                <circle cx="12" cy="12" r="10" stroke="white" stroke-width="4" fill="none"
                                    opacity="0.25" />
                                <path d="M4 12a8 8 0 018-8" fill="white" opacity="0.75" />
                            </svg>
                            บันทึก
                        </button>
                    </div>
                </div>
            </div>
        </main>

        <!-- Mobile Overlay -->
        <div id="overlay" class="fixed inset-0 z-40 hidden bg-black bg-opacity-50 lg:hidden"
            @click="closeMobileSidebar"></div>
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminSidebar from '~/components/admin/AdminSidebar.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: ['admin-auth'] })

const { toast } = useToast()

// ---------- STATE ----------
const form = reactive({
    userId: '',
    type: '',
    reason: '',
    liftedAt: '',
    evidenceFile: null
})

const isSubmitting = ref(false)
const evidenceInput = ref(null)

const userQuery = ref('')
const userResults = ref([])
const isSearchingUsers = ref(false)
const selectedUser = ref(null)
const lastUserLabel = ref('')
const showUserList = computed(() => userQuery.value && (isSearchingUsers.value || userResults.value.length > 0))

// ---------- SUSPEND DAYS ----------
const suspendDays = ref('')
const suspendOptions = [1, 3, 7, 30, 90]

function onSelectSuspend(days) {
    suspendDays.value = days
    // คำนวณ liftedAt เป็น ISO string
    const now = new Date()
    now.setDate(now.getDate() + Number(days))
    form.liftedAt = now.toISOString()
}

function onInputSuspendDays() {
    if (!suspendDays.value || suspendDays.value < 1) {
        form.liftedAt = ''
        return
    }
    const now = new Date()
    now.setDate(now.getDate() + Number(suspendDays.value))
    form.liftedAt = now.toISOString()
}

// ---------- UPLOAD FILE TO CLOUDINARY ----------
async function uploadToCloudinary(file) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', 'painamnae_unsigned')

  const res = await fetch(
    'https://api.cloudinary.com/v1_1/dryt5cwks/image/upload',
    { method: 'POST', body: formData }
  )

  const data = await res.json()

  if (!res.ok) {
    console.error(data)
    throw new Error(data.error?.message || 'Upload failed')
  }

  return data.secure_url
}


async function saveEvidenceToDB(url) {
  const config = useRuntimeConfig()
  const token = useCookie('token')?.value

  await $fetch(`/blacklists/admin/${blacklistId}/evidence`, {
    method: 'POST',
    baseURL: config.public.apiBase,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: {
      type: 'IMAGE',
      url
    }
  })

  toast.success('บันทึกหลักฐานสำเร็จ')
}



// ---------- SELECT USER in SYSTEM ----------
let userTimer = null
async function onSearchUsers() {
    if (userQuery.value !== lastUserLabel.value) form.userId = ''
    clearTimeout(userTimer)
    const q = userQuery.value.trim()
    if (!q) { userResults.value = []; return }
    userTimer = setTimeout(async () => {
        try {
            isSearchingUsers.value = true
            const config = useRuntimeConfig()
            const token = useCookie('token').value || (process.client ? localStorage.getItem('token') : '')
            const res = await $fetch('/users/admin', {  
                baseURL: config.public.apiBase,
                headers: { Accept: 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                query: { q, page: 1, limit: 10 }
            })
            userResults.value = res?.data || []
        } catch (e) {
            userResults.value = []
        } finally {
            isSearchingUsers.value = false
        }
    }, 300)
}
function selectUser(u) {
    form.userId = u.id
    selectedUser.value = u
    const label = `${u.firstName || ''} ${u.lastName || ''} (${u.username ? '@' + u.username : u.email})`
    userQuery.value = label
    lastUserLabel.value = label
    userResults.value = []
}

// ---------- UI HELPERS ----------
useHead({
    title: 'Add blacklist • Admin',
    link: [{ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }]
})

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('overlay')
    if (!sidebar || !overlay) return
    sidebar.classList.remove('mobile-open')
    overlay.classList.add('hidden')
}

function defineGlobalScripts() {
    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar')
        const mainContent = document.getElementById('main-content')
        const toggleIcon = document.getElementById('toggle-icon')
        if (!sidebar || !mainContent) return
        sidebar.classList.toggle('collapsed')
        if (sidebar.classList.contains('collapsed')) {
            mainContent.style.marginLeft = '80px'
            if (toggleIcon) toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right')
        } else {
            mainContent.style.marginLeft = '280px'
            if (toggleIcon) toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left')
        }
    }

    window.toggleMobileSidebar = function () {
        const sidebar = document.getElementById('sidebar')
        const overlay = document.getElementById('overlay')
        if (!sidebar || !overlay) return
        sidebar.classList.toggle('mobile-open')
        overlay.classList.toggle('hidden')
    }

    // window.closeMobileSidebar = function () {
    //     const sidebar = document.getElementById('sidebar')
    //     const overlay = document.getElementById('overlay')
    //     if (!sidebar || !overlay) return
    //     sidebar.classList.remove('mobile-open')
    //     overlay.classList.add('hidden')
    // }

    window.__adminResizeHandler__ = function () {
        const sidebar = document.getElementById('sidebar')
        const mainContent = document.getElementById('main-content')
        const overlay = document.getElementById('overlay')
        if (!sidebar || !mainContent || !overlay) return
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('mobile-open')
            overlay.classList.add('hidden')
            mainContent.style.marginLeft = sidebar.classList.contains('collapsed') ? '80px' : '280px'
        } else {
            mainContent.style.marginLeft = '0'
        }
    }

    window.addEventListener('resize', window.__adminResizeHandler__)
}

function cleanupGlobalScripts() {
    window.removeEventListener('resize', window.__adminResizeHandler__ || (() => { }))
    delete window.toggleSidebar
    delete window.toggleMobileSidebar
    delete window.closeMobileSidebar
    delete window.__adminResizeHandler__
}

onMounted(() => {
    defineGlobalScripts()
    if (typeof window.__adminResizeHandler__ === 'function') window.__adminResizeHandler__()
})
onUnmounted(() => { cleanupGlobalScripts() })

// ---------- EVIDENCE FILE PICKERS ----------
function onEvidenceFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  form.evidenceFile = file
}



// ---------- SUBMIT ----------
async function handleSubmit() {
    if (!form.userId) {
        toast.error('กรุณาเลือกผู้ใช้ก่อน')
        return
    }

    if (!form.reason) {
        toast.error('กรุณากรอกเหตุผล')
        return
    }

    isSubmitting.value = true

    try {
        const config = useRuntimeConfig()
        const token = useCookie('token')?.value

        const blacklistRes = await $fetch('/blacklists/admin', {
        method: 'POST',
        baseURL: config.public.apiBase,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: {
            userId: form.userId,
            type: selectedUser.value?.role || 'PASSENGER',
            reason: form.reason,
            suspendDays: suspendDays.value
        }
        })

        const createdBlacklist = blacklistRes.data || blacklistRes
        const blacklistId = createdBlacklist.id

        if (form.evidenceFile) {
        const imageUrl = await uploadToCloudinary(form.evidenceFile)

        await $fetch(`blacklists/admin/${blacklistId}/evidence`, {
            method: 'POST',
            baseURL: config.public.apiBase,
            headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: {
            type: 'IMAGE',
            url: imageUrl
            }
        })
        }

        toast.success('เพิ่ม Blacklist สำเร็จ')
        navigateTo('/admin/blacklists')

    } catch (err) {
        toast.error('เกิดข้อผิดพลาด', err?.message || 'ไม่สำเร็จ')
    } finally {
        isSubmitting.value = false
    }
    }

</script>


<style>
.main-content {
    transition: margin-left 0.3s ease;
}

.sidebar {
    transition: width 0.3s ease;
}

.sidebar.collapsed {
    width: 80px;
}

.sidebar:not(.collapsed) {
    width: 280px;
}

.sidebar-item {
    transition: all 0.3s ease;
}

.sidebar-item:hover {
    background-color: rgba(59, 130, 246, 0.05);
}

.sidebar.collapsed .sidebar-text {
    display: none;
}

.sidebar.collapsed .sidebar-item {
    justify-content: center;
}



@media (max-width: 768px) {
    .sidebar {
        position: fixed;
        z-index: 1000;
        transform: translateX(-100%);
    }

    .sidebar.mobile-open {
        transform: translateX(0);
    }

    .main-content {
        margin-left: 0 !important;
    }
}
</style>
