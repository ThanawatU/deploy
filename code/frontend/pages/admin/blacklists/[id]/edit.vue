<template>
    <div>
        <AdminHeader />
        <AdminSidebar />

        <!-- Main Content -->
        <main id="main-content" class="main-content mt-16 ml-0 lg:ml-[280px] p-6">
            <div class="mb-8">
                <!-- <NuxtLink to="/admin/blacklists" -->
                <NuxtLink :to="`/admin/blacklists`"
                    class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>ย้อนกลับ</span>
                </NuxtLink>
            </div>

            <div class="mx-auto max-w-8xl">
                <!-- Title -->
                <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-semibold text-gray-800">แก้ไขผู้ใช้</h1>
                        <span class="text-sm text-gray-500">ปรับข้อมูลแล้วกด “บันทึก”</span>
                    </div>
                </div>

                <!-- Card -->
                <div class="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div class="px-4 py-4 border-b border-gray-200 sm:px-6">
                        <h2 class="font-medium text-gray-800">ข้อมูลผู้ใช้</h2>
                    </div>

                    <!-- Loading / Error -->
                    <div v-if="isLoading" class="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
                    <div v-else-if="loadError" class="p-8 text-center text-red-600">{{ loadError }}</div>

                    <div v-else class="grid grid-cols-1 gap-6 p-4 sm:p-6">
                        <div class="w-full max-w-[80rem] mx-auto space-y-6">
                            <!-- Account -->
                            <div>
                                <div>
                                    <label class="block mb-1 text-sm font-medium">ชื่อ</label>
                                        <input
                                        :value="`${user?.firstName ||''} ${user?.lastName || ''}`"
                                        disabled
                                        class="w-full px-3 py-2 border rounded-md bg-gray-100"
                                        />
                                </div>

                                <div>
                                    <label class="block mb-1 text-sm font-medium">ประเภท</label>
                                    <select v-model="form.type"
                                            class="w-full px-3 py-2 border rounded-md">
                                    <option value="PASSENGER">PASSENGER</option>
                                    <option value="DRIVER">DRIVER</option>
                                    </select>
                                </div>
                                <div>
                                    <label class="block mb-1 text-sm font-medium">เหตุผล</label>
                                    <textarea v-model="form.reason"
                                            class="w-full px-3 py-2 border rounded-md"></textarea>
                                </div>

                                <div>
                                    <label class="block mb-1 text-sm font-medium">สถานะ</label>
                                    <div
                                        class="px-3 py-2 border rounded-md bg-gray-50"
                                        :class="form.status === 'ACTIVE'">
                                        {{ form.status === 'ACTIVE'
                                            ? 'กำลังแบน'
                                            : 'ปลดแบนแล้ว' }}
                                    </div>
                                    </div>


                                <div>
                                    <label class="block mb-1 text-sm font-medium">วันปลดแบน</label>
                                    <input type="datetime-local"
                                        v-model="form.suspendedUntil"
                                        class="w-full px-3 py-2 border rounded-md" />
                                </div>
                            </div>

                            <!-- Uploads -->
                            <section>
                                <h3 class="mb-3 text-sm font-semibold text-gray-700">
                                    หลักฐานการแบน
                                </h3>

                                <div v-if="!evidences.length" class="text-gray-500 text-sm">
                                    ไม่มีหลักฐาน
                                </div>

                                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                                    <div
                                    v-for="ev in evidences"
                                    :key="ev.id"
                                    class="p-4 border border-gray-300 rounded-lg bg-gray-50"
                                    >
                                    <div class="mb-2 text-xs text-gray-500">
                                        {{ ev.type }}
                                    </div>

                                    <img
                                        v-if="ev.type === 'IMAGE'"
                                        :src="ev.url"
                                        class="object-cover w-full rounded max-h-64"
                                    />

                                    <video
                                        v-else
                                        :src="ev.url"
                                        controls
                                        class="w-full rounded max-h-64"
                                    />
                                    </div>
                                </div>
                                </section>

                        </div>
                    </div>

                    <!-- Footer actions -->
                    <div class="flex items-center justify-end gap-2 px-4 py-4 border-t border-gray-200 sm:px-6">
                        <button @click="handleSubmit" :disabled="isSubmitting || isLoading"
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
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRuntimeConfig, useCookie } from '#app'
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminSidebar from '~/components/admin/AdminSidebar.vue'
import { useToast } from '~/composables/useToast'

definePageMeta({ middleware: ['admin-auth'] })

const route = useRoute()
const { toast } = useToast()

const blacklist = ref(null)
const user = ref(null)
const evidences = ref([])

// ---------- STATE ----------
const form = reactive({
    userId: '',
    type: '',
    reason: '',
    status: '',
    suspendedUntil: ''
})

const isLoading = ref(true)
const loadError = ref('')
const isSubmitting = ref(false)
const idPreview = ref(null)     // string | null (URL/preview)
const selfiePreview = ref(null) // string | null (URL/preview)
const idCardInput = ref(null)
const selfieInput = ref(null)

useHead({
    title: 'Edit User • Admin',
    link: [{ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }]
})

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('overlay')
    if (!sidebar || !overlay) return
    sidebar.classList.remove('mobile-open')
    overlay.classList.add('hidden')
}

// ---- global scripts (เหมือนหน้าอื่น ๆ) ----
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
    delete window.__adminResizeHandler__
}

// onMounted(async () => {
//     defineGlobalScripts()
//     if (typeof window.__adminResizeHandler__ === 'function') window.__adminResizeHandler__()
//     await fetchUser()
// })

onUnmounted(() => { cleanupGlobalScripts() })

// ---------- FILE PICKERS ----------
function pick(refName) {
    if (refName === 'idCardInput') idCardInput.value?.click()
    if (refName === 'selfieInput') selfieInput.value?.click()
}

function onFile(e, type) {
    const f = e.target.files?.[0]
    if (!f) return
    const reader = new FileReader()
    reader.onload = ev => {
        if (type === 'id') {
            form.nationalIdPhotoUrl = f
            idPreview.value = ev.target?.result
        } else {
            form.selfiePhotoUrl = f
            selfiePreview.value = ev.target?.result
        }
    }
    reader.readAsDataURL(f)
}

// ---------- DATE HELPERS ----------
function toISODate(yyyy_mm_dd) {
    if (!yyyy_mm_dd) return ''
    const d = new Date(`${yyyy_mm_dd}T00:00:00.000Z`)
    return d.toISOString()
}
function isoToInputDate(iso) {
    if (!iso) return ''
    const d = new Date(iso)
    const yyyy = d.getUTCFullYear()
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
    const dd = String(d.getUTCDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
}

// ---------- FETCH: GET blacklist ----------
async function fetchBlacklist() {
    try {
        const id = route.params.id
        const config = useRuntimeConfig()
        const token = useCookie('token')?.value

        const res = await $fetch(`/blacklists/admin/${id}`, {
        baseURL: config.public.apiBase,
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
        })

        const b = res?.data || res

        blacklist.value = b
        user.value = b.user
        evidences.value = b.evidences || []

        form.userId = b.userId
        form.type = b.type
        form.reason = b.reason
        form.status = b.status
        form.suspendedUntil = b.suspendedUntil
        ? b.suspendedUntil.slice(0, 16)
        : ''

    } catch (err) {
        loadError.value = err?.data?.message || 'โหลดข้อมูลไม่สำเร็จ'
    } finally {
        isLoading.value = false
    }
}

// ---------- PUT (form-data) ----------
async function putForm(url, formData, token) {
    await $fetch(`/blacklists/admin/${id}`, {
        method: 'PUT',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            // ห้ามตั้ง Content-Type เอง
        },
        body: formData,
        credentials: 'include',
    })

    let body
    try { body = await res.json() } catch {
        const text = await res.text()
        const err = new Error(text || 'Unexpected response from server')
        err.status = res.status
        throw err
    }

    if (!res.ok) {
        const msg = body?.message || `Request failed with status ${res.status}`
        const err = new Error(msg)
        err.status = res.status
        err.payload = body
        throw err
    }

    return body
}

// ---------- SUBMIT ----------
async function handleSubmit() {
  if (!form.reason || !form.status) {
    toast.error('กรอกข้อมูลไม่ครบ')
    return
  }

  isSubmitting.value = true

  try {
    const id = route.params.id
    const config = useRuntimeConfig()
    const token = useCookie('token').value

    await $fetch(`/blacklists/admin/${id}`, {
      method: 'PUT',
      baseURL: config.public.apiBase,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      body: {
        reason: form.reason,
        status: form.status,
        suspendedUntil: form.suspendedUntil
      }
    })

    toast.success('อัปเดตสำเร็จ')
    navigateTo('/admin/blacklists')

  } catch (err) {
    console.error(err)
    toast.error('อัปเดตไม่สำเร็จ', err?.data?.message || err.message)
  } finally {
    isSubmitting.value = false
  }
}

onMounted(fetchBlacklist)

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
