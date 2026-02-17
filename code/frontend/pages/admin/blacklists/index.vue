<template>
    <div class="">
        <AdminHeader />
        <AdminSidebar />

        <!-- Main Content -->
        <main id="main-content" class="main-content mt-16 ml-0 lg:ml-[280px] p-6">
            <!-- Page Title -->
            <div class="mx-auto max-w-8xl">
                <!-- Title + Controls -->
                <div class="flex flex-col gap-3 mb-6 sm:flex-row sm:items-center sm:justify-between">
                    <!-- Left: Title + Create Button -->
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-semibold text-gray-800">Blacklist Management</h1>
                        <button @click="onCreateBlacklist"
                            class="inline-flex items-center gap-2 px-3 py-2 text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700">
                            <i class="fa-solid fa-plus"></i>
                            <span class="hidden sm:inline">เพิ่มผู้ใช้ที่ถูกแบน</span>
                        </button>
                    </div>

                    <!-- Right: Quick Search -->
                    <div class="flex items-center gap-2">
                        <input v-model.trim="filters.q" @keyup.enter="applyFilters" type="text"
                            placeholder="ค้นหา : Email / User / Name"
                            class="max-w-full px-3 py-2 border border-gray-300 rounded-md w-72 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button @click="applyFilters"
                            class="px-4 py-2 text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700">
                            ค้นหา
                        </button>
                    </div>
                </div>

                <!-- Advanced Filters -->
                <div class="mb-4 bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div class="grid grid-cols-1 gap-3 px-4 py-4 sm:px-6 lg:grid-cols-[repeat(24,minmax(0,1fr))]">

                        <!-- Gender -->
                        <div class="lg:col-span-3">
                            <label class="block mb-1 text-xs font-medium text-gray-600">เพศ</label>
                            <select v-model="filters.gender"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500">
                                <option value="">ทั้งหมด</option>
                                <option value="MALE">ชาย</option>
                                <option value="FEMALE">หญิง</option>
                            </select>
                        </div>

                        <!-- status filter -->
                        <div class="lg:col-span-3">
                            <label class="block mb-1 text-xs font-medium text-gray-600">
                                สถานะการใช้งาน
                            </label>
                            <select v-model="filters.isActive"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500">
                                <option value="">ทั้งหมด</option>
                                <option value="true">Active</option>
                                <option value="false">Inactive</option>
                            </select>
                        </div>

                        <!-- เรียงตามวันที่แบน -->
                        <div class="lg:col-span-4">
                            <label class="block mb-1 text-xs font-medium text-gray-600">
                                เรียงตามวันที่แบน
                            </label>
                            <select v-model="filters.sortCreated"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500">
                                <option value="">ค่าเริ่มต้น</option>
                                <option value="asc">เก่า → ใหม่</option>
                                <option value="desc">ใหม่ → เก่า</option>
                            </select>
                        </div>

                        <!-- เรียงตามวันที่ปลดแบน -->
                        <div class="lg:col-span-4">
                            <label class="block mb-1 text-xs font-medium text-gray-600">
                                เรียงตามวันที่ปลดแบน
                            </label>
                            <select v-model="filters.sortLifted"
                                class="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500">
                                <option value="">ค่าเริ่มต้น</option>
                                <option value="asc">เก่า → ใหม่</option>
                                <option value="desc">ใหม่ → เก่า</option>
                            </select>
                        </div>


                        <!-- Actions (2/24) -->
                        <div class="flex items-end justify-end gap-2 mt-1 lg:col-span-4 lg:mt-0">
                            <button @click="clearFilters"
                                class="px-3 py-2 text-gray-700 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50">
                                ล้างตัวกรอง
                            </button>
                            <button @click="applyFilters"
                                class="px-4 py-2 text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700">
                                ใช้ตัวกรอง
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Card -->
                <div class="bg-white border border-gray-300 rounded-lg shadow-sm">
                    <div class="flex items-center justify-between px-4 py-4 border-b border-gray-200 sm:px-6">
                        <div class="text-sm text-gray-600">
                            หน้าที่ {{ pagination.page }} / {{ totalPages }} • ทั้งหมด {{ pagination.total }} ผู้ใช้
                        </div>
                    </div>

                    <!-- Loading / Error -->
                    <div v-if="isLoading" class="p-8 text-center text-gray-500">กำลังโหลดข้อมูล...</div>
                    <div v-else-if="loadError" class="p-8 text-center text-red-600">
                        {{ loadError }}
                    </div>

                    <!-- Table -->
                    <div v-else class="overflow-x-auto">
                        <table class="min-w-full divide-y divide-gray-200">
                            <thead class="bg-gray-50">
                                <tr>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">ชื่อ-นามสกุล</th>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">บทบาท</th>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">เหตุผล</th>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">สถานะการใช้งาน</th>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">วันที่แบน</th>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">วันที่ปลดแบน</th>
                                    <th class="px-4 py-3 text-xs font-medium text-left text-gray-500 uppercase">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody class="bg-white divide-y divide-gray-200">
                                <tr v-for="b in blacklists" :key="b.id">

                                    <!-- User ID -->
                                    <td class="px-4 py-3">
                                        <div class="flex items-center gap-3">
                                            <img :src="b.user.profilePicture || 
                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(b.user.firstName 
                                                || 'U')}&background=random&size=64`"
                                                class="object-cover rounded-full w-9 h-9" alt="avatar" />
                                            <div>
                                                <div class="font-medium text-gray-900">
                                                    {{ b.user.firstName }} {{ b.user.lastName }}
                                                </div>
                                                <div class="text-xs text-gray-500">
                                                    {{ b.user.gender || '-' }}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <!-- บทบาท -->
                                    <td class="px-4 py-3">
                                    <span
                                        class="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full"
                                        :class="b.type === 'PASSENGER' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'"
                                    >
                                        {{ b.type }}
                                    </span>
                                    </td>
                                    <!-- เหตุผล -->
                                    <td class="px-4 py-3 text-gray-700">
                                        {{ b.reason }}
                                    </td>
                                    <!-- สถานะการแบน -->
                                    <td class="px-4 py-3">
                                        <div class="flex items-center">
                                            <label class="inline-flex items-center cursor-pointer select-none switch">
                                                <input type="checkbox" class="switch-input" :checked="b.user.isActive"
                                                    :disabled="isLoading || togglingIds.has(b.user.id)"
                                                    @change="onToggleActive(b.user, $event.target.checked)" />
                                                <span class="switch-slider"></span>
                                            </label>
                                            <span class="ml-2 text-sm "
                                                :class="b.user.isActive ? 'text-green-700' : 'text-gray-500'">
                                                {{ b.user.isActive ? 'Active' : 'Inactive' }}
                                            </span>
                                        </div>
                                    </td>
                                    <!-- วันที่แบน -->
                                    <td class="px-4 py-3 text-gray-700">
                                        {{ b.createdAt ? formatDate(b.createdAt) : '-' }}
                                        <div v-if="b.createdAt" class="text-xs text-gray-400 mt-1">{{ dayjs(b.createdAt).format('HH:mm:ss') }}</div>
                                    </td>
                                    <!-- วันที่ปลดแบน -->
                                    <td class="px-4 py-3 text-gray-700">
                                        {{ b.liftedAt ? formatDate(b.liftedAt) : '-' }}
                                        <div v-if="b.liftedAt" class="text-xs text-gray-400 mt-1">{{ dayjs(b.liftedAt).format('HH:mm:ss') }}</div>
                                    </td>
                                    <!-- ปุ่มจัดการ -->
                                    <td class="px-4 py-3">
                                        <button @click="onEditBlacklist(b)"
                                            class="p-2 text-gray-500 transition-colors cursor-pointer hover:text-blue-600"
                                            title="แก้ไข" aria-label="แก้ไข">
                                            <i class="text-lg fa-regular fa-pen-to-square"></i>
                                        </button>
                                        <!-- <button @click="askDeleteBlacklist(b)"
                                            class="p-2 text-gray-500 transition-colors cursor-pointer hover:text-red-600"
                                            title="ลบ" aria-label="ลบ">
                                            <i class="text-lg fa-regular fa-trash-can"></i>
                                        </button> -->
                                    </td>
                                </tr>

                                <tr v-if="!blacklists.length">
                                    <td colspan="7" class="px-4 py-10 text-center text-gray-500">
                                    ไม่มีข้อมูล Blacklist
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <!-- Pagination -->
                    <div
                        class="flex flex-col gap-3 px-4 py-4 border-t border-gray-200 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
                        <div class="flex flex-wrap items-center gap-3 text-sm">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-gray-500">Limit:</span>
                                <select v-model.number="pagination.limit" @change="applyFilters"
                                    class="px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-blue-500">
                                    <option :value="10">10</option>
                                    <option :value="20">20</option>
                                    <option :value="50">50</option>
                                </select>
                            </div>
                        </div>

                        <nav class="flex items-center gap-1">
                            <button class="px-3 py-2 text-sm border rounded-md disabled:opacity-50"
                                :disabled="pagination.page <= 1 || isLoading" @click="changePage(pagination.page - 1)">
                                Previous
                            </button>

                            <template v-for="(p, idx) in pageButtons" :key="`p-${idx}-${p}`">
                                <span v-if="p === '…'" class="px-2 text-sm text-gray-500">…</span>
                                <button v-else class="px-3 py-2 text-sm border rounded-md"
                                    :class="p === pagination.page ? 'bg-blue-50 text-blue-600 border-blue-200' : 'hover:bg-gray-50'"
                                    :disabled="isLoading" @click="changePage(p)">
                                    {{ p }}
                                </button>
                            </template>

                            <button class="px-3 py-2 text-sm border rounded-md disabled:opacity-50"
                                :disabled="pagination.page >= totalPages || isLoading"
                                @click="changePage(pagination.page + 1)">
                                Next
                            </button>
                        </nav>
                    </div>
                </div>
            </div>
        </main>

        <!-- Mobile Overlay -->
        <div id="overlay" class="fixed inset-0 z-40 hidden bg-black bg-opacity-50 lg:hidden"
            @click="closeMobileSidebar"></div>

        <!-- Confirm Delete Modal -->
        <ConfirmModal :show="showDelete" :title="`ลบ blacklist ของ ${deletingBlacklist?.user?.firstName || ''}`"
            message="การลบนี้เป็นการลบถาวร ข้อมูลทั้งหมดจะถูกลบและไม่สามารถกู้คืนได้ คุณต้องการดำเนินการต่อหรือไม่?"
            confirmText="ลบถาวร" cancelText="ยกเลิก" variant="danger" @confirm="confirmDelete" @cancel="cancelDelete" />
    </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRuntimeConfig, useCookie } from '#app'
import dayjs from 'dayjs'
import 'dayjs/locale/th'
import buddhistEra from 'dayjs/plugin/buddhistEra'
import AdminHeader from '~/components/admin/AdminHeader.vue'
import AdminSidebar from '~/components/admin/AdminSidebar.vue'
import ConfirmModal from '~/components/ConfirmModal.vue'
import { useToast } from '~/composables/useToast'

dayjs.locale('th')
dayjs.extend(buddhistEra)

definePageMeta({ middleware: ['admin-auth'] })

const { toast } = useToast()

const isLoading = ref(false)
const loadError = ref('')
const blacklists = ref([])
const selectedBlacklist = ref(null)

// เก็บ id ที่กำลัง toggle อยู่ เพื่อ disable สวิตช์/กันคลิกซ้ำ
const togglingIds = ref(new Set())

const pagination = reactive({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1
})

const filters = reactive({
    q: '',
    gender: '',
    isActive: '',
    sortCreated: '',
    sortLifted: ''
})



const totalPages = computed(() =>
    Math.max(1, pagination.totalPages || Math.ceil((pagination.total || 0) / (pagination.limit || 20)))
)

const pageButtons = computed(() => {
    const total = totalPages.value
    const current = pagination.page
    if (!total || total < 1) return []
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1)
    const set = new Set([1, total, current])
    if (current - 1 > 1) set.add(current - 1)
    if (current + 1 < total) set.add(current + 1)
    const pages = Array.from(set).sort((a, b) => a - b)
    const out = []
    for (let i = 0; i < pages.length; i++) {
        if (i > 0 && pages[i] - pages[i - 1] > 1) out.push('…')
        out.push(pages[i])
    }
    return out
})

function roleBadge(role) {
    if (role === 'ADMIN') return 'bg-purple-100 text-purple-700'
    if (role === 'DRIVER') return 'bg-blue-100 text-blue-700'
    return 'bg-gray-100 text-gray-700'
}

function formatDate(iso) {
    if (!iso) return '-'
    return dayjs(iso).format('D MMMM BBBB HH:mm')
}

function parseSort(s) {
    const [by, order] = (s || '').split(':')
    if (!by || !['asc', 'desc'].includes(order)) return { sortBy: undefined, sortOrder: undefined }
    return { sortBy: by, sortOrder: order }
}

function asTriBool(v) {
    if (v === '' || v === undefined || v === null) return undefined
    if (v === true || v === 'true') return true
    if (v === false || v === 'false') return false
    return undefined
}

function changePage(next) {
  if (next < 1 || next > totalPages.value) return
  fetchBlacklists(next)
}

function applyFilters() {
  pagination.page = 1
  fetchBlacklists(1)
}

function clearFilters() {
    filters.q = ''
    filters.role = ''
    filters.createdFrom = ''
    filters.sort = ''
    filters.isActive = ''
    pagination.page = 1
    fetchBlacklists(1)
}

function onEditBlacklist(b) {
    navigateTo(`/admin/blacklists/${b.id}/edit`).catch(() => { })
}

/* ---------- Toggle Active Status ---------- */
async function onToggleActive(user, nextActive) {
    const prev = user.isActive
    if (prev === nextActive) return

    // optimistic UI
    user.isActive = nextActive
    togglingIds.value.add(user.id)

    const config = useRuntimeConfig()
    const token = useCookie('token').value || (process.client ? localStorage.getItem('token') : '')

    try {
        const res = await fetch(`${config.public.apiBase}/users/admin/${user.id}/status`, {
            method: 'PATCH',
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: JSON.stringify({ isActive: nextActive }),
            credentials: 'include',
        })
        console.log('API response:', res)
        console.log('API raw res:', res)

        let body
        try { body = await res.json() } catch {
            const text = await res.text()
            const err = new Error(text || 'Unexpected response from server')
            err.status = res.status
            throw err
        }

        if (!res.ok) {
            const err = new Error(body?.message || `Request failed with status ${res.status}`)
            err.status = res.status
            err.payload = body
            throw err
        }

        // success
        toast.success('อัปเดตสถานะแล้ว', nextActive ? 'เปิดใช้งานบัญชีสำเร็จ' : 'ปิดการใช้งานบัญชีสำเร็จ')
    } catch (err) {
        // rollback
        user.isActive = prev
        console.error(err)
        toast.error('อัปเดตสถานะไม่สำเร็จ', err?.message || 'เกิดข้อผิดพลาด')
    } finally {
        togglingIds.value.delete(user.id)
    }
}
/* ----------------------------------------- */

/* ---------- Delete with Confirm Modal ---------- */
const showDelete = ref(false)
const deletingBlacklist = ref(null)

function askDeleteBlacklist(b) {
    deletingBlacklist.value = b
    showDelete.value = true
}

function cancelDelete() {
    showDelete.value = false
    deletingBlacklist.value = null
}

async function confirmDelete() {
    if (!deletingBlacklist.value) return

    const b = deletingBlacklist.value

    try {
        await deleteUser(b.id)
        toast.success(
            'ลบ blacklist เรียบร้อย',
            `${b.user.firstName} ${b.user.lastName} ถูกลบแล้ว`
        )
        cancelDelete()
        fetchBlacklists(Math.min(pagination.page, totalPages.value))
    } catch (err) {
        console.error(err)
        toast.error('ลบไม่สำเร็จ', err?.message || 'เกิดข้อผิดพลาด')
    }
}


async function deleteUser(id) {
    const config = useRuntimeConfig()
    const token = useCookie('token').value || (process.client ? localStorage.getItem('token') : '')
    const res = await fetch(`${config.public.apiBase}/blacklists/admin/${id}`, {
        method: 'DELETE',
        headers: {
            Accept: 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
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
        const err = new Error(body?.message || `Request failed with status ${res.status}`)
        err.status = res.status
        err.payload = body
        throw err
    }

    return body
}
/* --------------------------------------------- */

useHead({
    title: 'TailAdmin Dashboard',
    link: [{ rel: 'stylesheet', href: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css' }]
})

function onCreateBlacklist() {
    navigateTo('/admin/blacklists/create').catch(() => { })
}

function onViewBlacklist(b) {
    navigateTo(`/admin/blacklists/${b.id}`).catch(() => { })
}

function closeMobileSidebar() {
    const sidebar = document.getElementById('sidebar')
    const overlay = document.getElementById('overlay')
    if (!sidebar || !overlay) return
    sidebar.classList.remove('mobile-open')
    overlay.classList.add('hidden')
}

function defineGlobalScripts() {
    window.toggleSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const toggleIcon = document.getElementById('toggle-icon');

        if (!sidebar || !mainContent || !toggleIcon) return;

        sidebar.classList.toggle('collapsed');

        if (sidebar.classList.contains('collapsed')) {
            mainContent.style.marginLeft = '80px';
            toggleIcon.classList.replace('fa-chevron-left', 'fa-chevron-right');
        } else {
            mainContent.style.marginLeft = '280px';
            toggleIcon.classList.replace('fa-chevron-right', 'fa-chevron-left');
        }
    }

    window.toggleMobileSidebar = function () {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');

        if (!sidebar || !overlay) return;

        sidebar.classList.toggle('mobile-open');
        overlay.classList.toggle('hidden');
    }

    window.toggleSubmenu = function (menuId) {
        const menu = document.getElementById(menuId);
        const icon = document.getElementById(menuId + '-icon');

        if (!menu || !icon) return;

        menu.classList.toggle('hidden');

        if (menu.classList.contains('hidden')) {
            icon.classList.replace('fa-chevron-up', 'fa-chevron-down');
        } else {
            icon.classList.replace('fa-chevron-down', 'fa-chevron-up');
        }
    }

    window.__adminResizeHandler__ = function () {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        const overlay = document.getElementById('overlay');

        if (!sidebar || !mainContent || !overlay) return;

        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('mobile-open');
            overlay.classList.add('hidden');

            if (sidebar.classList.contains('collapsed')) {
                mainContent.style.marginLeft = '80px';
            } else {
                mainContent.style.marginLeft = '280px';
            }
        } else {
            mainContent.style.marginLeft = '0';
        }
    }

    window.addEventListener('resize', window.__adminResizeHandler__)
}

function cleanupGlobalScripts() {
    window.removeEventListener('resize', window.__adminResizeHandler__ || (() => { }))
    delete window.toggleSidebar
    delete window.toggleMobileSidebar
    delete window.closeMobileSidebar
    delete window.toggleSubmenu
    delete window.__adminResizeHandler__
}

async function fetchBlacklists(page = 1) {
  isLoading.value = true
  loadError.value = ''

  try {
    const config = useRuntimeConfig()
    const token = useCookie('token').value

    const res = await $fetch('/blacklists/admin', {
      baseURL: config.public.apiBase,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    query: {
        page,
        limit: pagination.limit,
        q: filters.q || undefined,
        gender: filters.gender || undefined,
        isActive: filters.isActive !== ''
            ? filters.isActive === 'true'
            : undefined,
        sortCreated: filters.sortCreated || undefined,
        sortLifted: filters.sortLifted || undefined
    }


    })

    console.log('RAW API:', res)

    // 🔥 รองรับทุกกรณี
    if (Array.isArray(res)) {
      blacklists.value = res
    } else if (Array.isArray(res.data)) {
      blacklists.value = res.data
    } else if (Array.isArray(res.items)) {
      blacklists.value = res.items
    } else {
      blacklists.value = []
    }

    pagination.total =
      res.pagination?.total ||
      res.total ||
      blacklists.value.length

    pagination.totalPages =
      res.pagination?.totalPages ||
      Math.ceil(pagination.total / pagination.limit)

    pagination.page = page

  } catch (err) {
    console.error(err)
    loadError.value = err?.data?.message || 'โหลด blacklist ไม่สำเร็จ'
    blacklists.value = []
  } finally {
    isLoading.value = false
  }
}


onMounted(() => {
    defineGlobalScripts()
    if (typeof window.__adminResizeHandler__ === 'function') window.__adminResizeHandler__()
    fetchBlacklists(1)
})

// onMounted(() => {
//   defineGlobalScripts()
//   fetchBlacklists(1)
// })

onUnmounted(() => {
    cleanupGlobalScripts()
})

</script>

<style>
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

.main-content {
    transition: margin-left 0.3s ease;
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

/* ---- สไตล์ของสวิตช์ ---- */
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
    /* gray-200 */
    border-radius: 9999px;
    transition: background 0.2s ease;
}

.switch-input:checked+.switch-slider {
    background: #22c55e;
    /* green-500 */
}

.switch-slider::after {
    content: "";
    position: absolute;
    top: 3px;
    left: 3px;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 9999px;
    box-shadow: 0 1px 2px rgba(0, 0, 0, .2);
    transition: transform 0.2s ease;
}

.switch-input:checked+.switch-slider::after {
    transform: translateX(18px);
}

.switch-input:disabled+.switch-slider {
    filter: grayscale(0.4);
    opacity: .6;
}
</style>
