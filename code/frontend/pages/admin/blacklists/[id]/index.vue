<template>
    <div>
        <AdminHeader />
        <AdminSidebar />

        <main id="main-content" class="main-content mt-16 ml-0 lg:ml-[280px] p-6">
            <!-- Back -->
            <div class="mb-8">
                <NuxtLink :to="`/admin/blacklists/${item.id}/edit`">
                    class="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50">
                    <i class="fa-solid fa-arrow-left"></i>
                    <span>ย้อนกลับ</span>
                </NuxtLink>
            </div>

            <div class="mx-auto max-w-8xl">
                <!-- Title -->
                <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-semibold text-gray-800">รายละเอียดผู้ใช้</h1>
                        <span class="text-sm text-gray-500">ดูข้อมูลทั้งหมดของผู้ใช้งาน</span>
                    </div>

                    <!-- Verify switch -->
                    <div v-if="user" class="flex items-center gap-2">
                        <label class="inline-flex items-center cursor-pointer select-none switch">
                            <input type="checkbox" class="switch-input" :checked="user.isVerified"
                                :disabled="isLoading || toggling" @change="onToggleVerify($event.target.checked)" />
                            <span class="switch-slider"></span>
                        </label>
                        
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

                    <!-- Content -->
                    <div v-else class="p-6 space-y-8">
                        <!-- ข้อมูลผู้ใช้ -->
                        <section>
                            <h3 class="mb-3 text-sm font-semibold text-gray-700">ข้อมูลผู้ใช้</h3>

                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div>
                                <label class="block mb-1 text-xs font-medium text-gray-600">ชื่อจริง</label>
                                <div class="px-3 py-2 bg-gray-50 border rounded-md">
                                {{ user.firstName }}
                                </div>
                            </div>

                            <div>
                                <label class="block mb-1 text-xs font-medium text-gray-600">นามสกุล</label>
                                <div class="px-3 py-2 bg-gray-50 border rounded-md">
                                {{ user.lastName }}
                                </div>
                            </div>
                            </div>
                        </section>

                        <!-- ข้อมูลการแบน -->
                        <section>
                            <h3 class="mb-3 text-sm font-semibold text-gray-700">ข้อมูลการแบน</h3>

                            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">

                            <div>
                                <label class="block mb-1 text-xs font-medium text-gray-600">ประเภท</label>
                                <div class="px-3 py-2 bg-gray-50 border rounded-md">
                                {{ blacklist.type }}
                                </div>
                            </div>

                            <div>
                                <label class="block mb-1 text-xs font-medium text-gray-600">สถานะ</label>
                                <div class="px-3 py-2 bg-gray-50 border rounded-md">
                                {{ b.status }}
                                </div>
                            </div>

                            <div class="sm:col-span-2">
                                <label class="block mb-1 text-xs font-medium text-gray-600">เหตุผล</label>
                                <div class="px-3 py-2 bg-gray-50 border rounded-md">
                                {{ blacklist.reason }}
                                </div>
                            </div>

                            <div>
                                <label class="block mb-1 text-xs font-medium text-gray-600">
                                ระงับถึงวันที่
                                </label>
                                <div class="px-3 py-2 bg-gray-50 border rounded-md">
                                {{ formatDate(blacklist.suspendedUntil, true) }}
                                </div>
                            </div>

                            </div>
                        </section>

                        <!-- เปิด/ปิดการใช้งาน -->
                        <section>
                            <h3 class="mb-3 text-sm font-semibold text-gray-700">สถานะบัญชี</h3>

                            <div class="flex items-center gap-3">
                            <label class="inline-flex items-center cursor-pointer switch">
                                <input
                                type="checkbox"
                                class="switch-input"
                                :checked="user.isActive"
                                :disabled="toggling"
                                @change="onToggleActive($event.target.checked)"
                                />
                                <span class="switch-slider"></span>
                            </label>

                            <span class="text-sm"
                                :class="user.isActive ? 'text-green-600' : 'text-red-600'">
                                {{ user.isActive ? 'Active' : 'Inactive' }}
                            </span>
                            </div>
                        </section>

                        <!-- หลักฐานการแบน -->
                        <section>
                            <h3 class="mb-3 text-sm font-semibold text-gray-700">หลักฐานการแบน</h3>

                            <div v-if="evidences.length === 0" class="text-gray-500">
                            ไม่มีหลักฐาน
                            </div>

                            <div v-else class="grid grid-cols-2 gap-4 sm:grid-cols-3">
                                <div v-for="e in evidences" :key="e.id"
                                    class="p-2 border rounded-md">

                                    <a :href="e.url" target="_blank">
                                    <img
                                        v-if="e.type === 'IMAGE'"
                                        :src="e.url"
                                        class="object-cover w-full h-40 rounded-md"
                                    />

                                    <video
                                        v-else
                                        :src="e.url"
                                        controls
                                        class="w-full h-40 rounded-md"
                                    />
                                    </a>

                                </div>
                            </div>
                        </section>
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
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute, useRuntimeConfig, useCookie } from '#app'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminSidebar from '~/components/admin/AdminSidebar.vue'
import { useToast } from '~/composables/useToast'

dayjs.locale('th')
definePageMeta({ middleware: ['admin-auth'] })
useHead({
    title: 'ดูรายละเอียดผู้ใช้ • Admin',
    link: [{ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }]
})

const route = useRoute()
const { toast } = useToast()

const isLoading = ref(true)
const loadError = ref('')
const toggling = ref(false)
const blacklist = ref(null)
const user = ref(null)

const sending = ref(false)
const presetKey = ref('')
const customBody = ref('')   

const evidences = ref([])

// body ปัจจุบันที่พร้อมส่ง (คำนวณจาก preset หรือ custom)
const currentBody = computed(() => {
    if (presetKey.value === 'CUSTOM') return (customBody.value || '').trim()
    return BODY_PRESETS[presetKey.value] || ''
})

function resetNotify() {
    presetKey.value = ''
    customBody.value = ''
}

function applyPreset() {
    // ถ้าเปลี่ยนจาก CUSTOM เป็น preset อื่น ให้ล้าง customBody
    if (presetKey.value !== 'CUSTOM') customBody.value = ''
}

function formatDate(iso, withTime = false) {
    if (!iso) return '-'
    return withTime ? dayjs(iso).format('D MMM BBBB HH:mm') : dayjs(iso).format('D MMM BBBB')
}

/* ---------- GET: fetch blacklists ---------- */
async function fetchBlacklists() {
    isLoading.value = true
    loadError.value = ''

    try {
        const config = useRuntimeConfig()
        const token = useCookie('token')?.value

        const res = await $fetch(`/blacklists/admin/${id}`, {
        baseURL: config.public.apiBase,
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
        })

        const data = res?.data || res

        blacklist.value = data
        user.value = data.user
        evidences.value = data.evidences || []

    } catch (err) {
        console.error(err)
        loadError.value = err?.data?.message || 'ไม่สามารถโหลดข้อมูลได้'
        toast.error('เกิดข้อผิดพลาด', loadError.value)
    } finally {
        isLoading.value = false
    }
}

/* ---------- PATCH: toggle verify ---------- */
async function onToggleVerify(next) {
    if (!user.value) return
    const prev = !!user.value.isVerified
    if (prev === next) return

    // optimistic
    user.value.isVerified = next
    toggling.value = true

    try {
        const id = route.params.id
        const apiBase = useRuntimeConfig().public.apiBase
        let token = useCookie('token')?.value || (process.client ? localStorage.getItem('token') : '')

        const res = await fetch(`${apiBase}/users/admin/${user.value.id}/status`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ isVerified: next }),
            credentials: 'include'
        })

        let body
        try { body = await res.json() } catch {
            const txt = await res.text()
            const e = new Error(txt || 'Unexpected response from server'); e.status = res.status; throw e
        }
        if (!res.ok) {
            const e = new Error(body?.message || `Request failed with status ${res.status}`); e.status = res.status; e.payload = body; throw e
        }

        toast.success('อัปเดตการยืนยันแล้ว', next ? 'ยืนยันผู้ใช้สำเร็จ' : 'ยกเลิกการยืนยันผู้ใช้สำเร็จ')
    } catch (err) {
        console.error(err)
        user.value.isVerified = prev // rollback
        toast.error('ไม่สามารถอัปเดตสถานะยืนยันได้', err?.message || 'เกิดข้อผิดพลาด')
    } finally {
        toggling.value = false
    }
}

async function onToggleActive(next) {
    if (!user.value) return

    const prev = user.value.isActive
    user.value.isActive = next
    toggling.value = true

    try {
        const apiBase = useRuntimeConfig().public.apiBase
        const token = useCookie('token')?.value

        const res = await fetch(
        `${apiBase}/users/admin/${user.value.id}/status`,
        {
            method: 'PATCH',
            headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify({ isActive: next })
        }
        )

        if (!res.ok) throw new Error('update failed')

        toast.success('อัปเดตสถานะสำเร็จ')

    } catch (err) {
        user.value.isActive = prev
        toast.error('ไม่สามารถอัปเดตสถานะได้')
    } finally {
        toggling.value = false
    }
}

/* ---------- layout helpers ---------- */
function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('overlay')
    if (!sidebar || !overlay) return
    sidebar.classList.remove('mobile-open')
    overlay.classList.add('hidden')
}
function defineGlobalScripts() {
    window.__adminResizeHandler__ = function () {
        const sidebar = document.getElementById('sidebar')
        const mainContent = document.getElementById('main-content')
        const overlay = document.getElementById('overlay')
        if (!sidebar || !mainContent || !overlay) return
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('mobile-open'); overlay.classList.add('hidden')
            mainContent.style.marginLeft = sidebar.classList.contains('collapsed') ? '80px' : '280px'
        } else {
            mainContent.style.marginLeft = '0'
        }
    }
    window.addEventListener('resize', window.__adminResizeHandler__)
}
function cleanupGlobalScripts() {
    window.removeEventListener('resize', window.__adminResizeHandler__ || (() => { }))
    delete window.__adminResizeHandler__
}

onMounted(async () => {
    defineGlobalScripts()
    if (typeof window.__adminResizeHandler__ === 'function') window.__adminResizeHandler__()
    await fetchBlacklists()
})
onUnmounted(() => cleanupGlobalScripts())
</script>



<style>
.main-content {
    transition: margin-left 0.3s ease;
}

/* สวิตช์ (แบบเดียวกับหน้า list) */
.switch {
    position: relative;
    width: 42px;
    height: 24px;
}

.switch-input {
    appearance: none;
    -webkit-appearance: none;
    width: 42px;
    height: 24px;
    margin: 0;
    outline: none;
    position: relative;
    cursor: pointer;
}

.switch-slider {
    pointer-events: none;
    position: absolute;
    inset: 0;
    background: #e5e7eb;
    border-radius: 9999px;
    transition: background .2s ease;
}

.switch-input:checked+.switch-slider {
    background: #22c55e;
}

.switch-slider::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    background: #fff;
    border-radius: 9999px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .2);
    transition: transform .2s ease;
}

.switch-input:checked+.switch-slider::after {
    transform: translateX(18px);
}

.switch-input:disabled+.switch-slider {
    filter: grayscale(.4);
    opacity: .6;
}
</style>
