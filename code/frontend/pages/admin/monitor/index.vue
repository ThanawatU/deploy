<template>
  <div>
    <AdminHeader />
    <AdminSidebar />

    <main id="main-content" class="main-content mt-16 ml-0 lg:ml-[280px] p-6">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-semibold text-gray-800">Monitor Dashboard</h1>
        <p class="text-sm text-gray-500">ตรวจสอบ System & API Logs</p>
      </div>

      <!-- ALERT -->
      <div
        v-if="summary.highError"
        class="mb-6 p-4 bg-red-100 text-red-700 rounded-md"
      >
        พบ Error จำนวนมากในช่วง 5 นาทีล่าสุด ({{ summary.errorCount }} ครั้ง)
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white border rounded-lg p-4 shadow-sm">
          <p class="text-sm text-gray-500">Total Requests</p>
          <p class="text-2xl font-bold text-black">
            {{ summary.total }}
          </p>
        </div>

        <div class="bg-white border rounded-lg p-4 shadow-sm">
          <p class="text-sm text-gray-500">Errors (5 min)</p>
          <p class="text-2xl font-bold text-red-600">
            {{ summary.errorCount }}
          </p>
        </div>

        <div class="bg-white border rounded-lg p-4 shadow-sm">
          <p class="text-sm text-gray-500">Avg Response Time</p>
          <p class="text-2xl font-bold text-black">
            {{ summary.avgResponse }} ms
          </p>
        </div>
      </div>

      <!-- Tabs -->
      <div class="mb-4 border-b border-gray-200">
        <nav class="flex space-x-6">
          <button
            v-for="tab in tabs"
            :key="tab"
            @click="changeTab(tab)"
            :class="[
              'pb-2 text-sm font-medium',
              activeTab === tab
                ? 'border-b-2 border-black text-black'
                : 'text-gray-500 hover:text-black',
            ]"
          >
            {{ tab }}
          </button>
        </nav>
      </div>

      <!-- Log Table -->
      <div class="bg-white border border-gray-300 rounded-lg shadow-sm">
        <!-- Header row -->
        <div
          class="px-4 py-4 border-b border-gray-200 flex justify-between items-center"
        >
          <h2 class="font-medium text-gray-800">
            {{ activeTab }} (ล่าสุด 100 รายการ)
          </h2>

          <div class="flex items-center gap-3">
            <select
              v-if="activeTab === 'SystemLog'"
              v-model="selectedLevel"
              @change="fetchLogs"
              class="border px-3 py-2 rounded-md text-sm"
            >
              <option value="ALL">All Levels</option>
              <option value="INFO">INFO</option>
              <option value="WARN">WARN</option>
              <option value="ERROR">ERROR</option>
            </select>

            <!-- Date filter -->
            <input
              type="date"
              v-model="selectedDate"
              @change="fetchLogs"
              class="border px-3 py-2 rounded-md text-sm"
            />
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="min-w-full table-fixed text-sm text-left">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-4 py-2 w-[180px]">Time</th>

                <!-- AuditLog -->
                <template v-if="activeTab === 'AuditLog'">
                  <th class="px-4 py-2 w-[120px]">User</th>
                  <th class="px-4 py-2 w-[100px]">Role</th>
                  <th class="px-4 py-2 w-[200px]">Action</th>
                  <th class="px-4 py-2 w-[150px]">Entity</th>
                  <th class="px-4 py-2 w-[120px]">Entity ID</th>
                  <th class="px-4 py-2 w-[150px]">IP Address</th>
                  <th class="px-4 py-2 w-[200px]">User Agent</th>
                </template>

                <!-- SystemLog -->
                <template v-else-if="activeTab === 'SystemLog'">
                  <th class="px-4 py-2 w-[80px]">Level</th>
                  <th class="px-4 py-2 w-[120px]">Request ID</th>
                  <th class="px-4 py-2 w-[80px]">Method</th>
                  <th class="px-4 py-2 w-[250px]">Path</th>
                  <th class="px-4 py-2 w-[80px]">Status</th>
                  <th class="px-4 py-2 w-[100px]">Duration</th>
                  <th class="px-4 py-2 w-[120px]">User</th>
                  <th class="px-4 py-2 w-[140px]">IP</th>
                  <th class="px-4 py-2 w-[200px]">User Agent</th>
                  <th class="px-4 py-2 w-[200px]">Error</th>
                  <th class="px-4 py-2 w-[200px]">Metadata</th>
                </template>

                <!-- AccessLog -->
                <template v-else>
                  <th class="px-4 py-2 w-[120px]">User</th>
                  <th class="px-4 py-2 w-[150px]">Login Time</th>
                  <th class="px-4 py-2 w-[150px]">Logout Time</th>
                  <th class="px-4 py-2 w-[140px]">IP Address</th>
                  <th class="px-4 py-2 w-[200px]">User Agent</th>
                  <th class="px-4 py-2 w-[160px]">Session ID</th>
                </template>
              </tr>
            </thead>

            <tbody>
              <tr
                v-for="log in logs"
                :key="log.id"
                class="border-b odd:bg-white even:bg-gray-50 hover:bg-gray-100"
              >
                <td class="px-4 py-2">
                  {{ formatDate(log.createdAt) }}
                </td>

                <!-- AuditLog -->
                <template v-if="activeTab === 'AuditLog'">
                  <td class="px-4 py-2 font-medium">
                    {{ log.userId || "-" }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.role || "-" }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.action }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.entity || "-" }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.entityId || "-" }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.ipAddress || "-" }}
                  </td>

                  <td class="px-4 py-2 truncate" :title="log.userAgent">
                    {{ log.userAgent || "-" }}
                  </td>

                  <td
                    class="px-4 py-2 truncate"
                    :title="JSON.stringify(log.metadata)"
                  >
                    {{ log.metadata ? JSON.stringify(log.metadata) : "-" }}
                  </td>
                </template>

                <!-- SystemLog -->
                <template v-else-if="activeTab === 'SystemLog'">
                  <td class="px-4 py-2">
                    <span
                      class="px-2 py-1 text-xs font-semibold rounded"
                      :class="levelClass(log.level)"
                    >
                      {{ log.level }}
                    </span>
                  </td>

                  <td class="px-4 py-2">{{ log.requestId || "-" }}</td>
                  <td class="px-4 py-2">{{ log.method || "-" }}</td>

                  <td class="px-4 py-2 truncate" :title="log.path">
                    {{ log.path || "-" }}
                  </td>

                  <td class="px-4 py-2">{{ log.statusCode || "-" }}</td>
                  <td class="px-4 py-2">
                    {{ log.duration ? log.duration + " ms" : "-" }}
                  </td>

                  <td class="px-4 py-2">{{ log.userId || "-" }}</td>
                  <td class="px-4 py-2">{{ log.ipAddress || "-" }}</td>

                  <td class="px-4 py-2 truncate" :title="log.userAgent">
                    {{ log.userAgent || "-" }}
                  </td>

                  <td
                    class="px-4 py-2 truncate"
                    :title="JSON.stringify(log.error)"
                  >
                    {{ log.error ? JSON.stringify(log.error) : "-" }}
                  </td>

                  <td
                    class="px-4 py-2 truncate"
                    :title="JSON.stringify(log.metadata)"
                  >
                    {{ log.metadata ? JSON.stringify(log.metadata) : "-" }}
                  </td>
                </template>

                <!-- AccessLog -->
                <template v-else>
                  <td class="px-4 py-2">{{ log.userId }}</td>

                  <td class="px-4 py-2">
                    {{ formatDate(log.loginTime) }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.logoutTime ? formatDate(log.logoutTime) : "-" }}
                  </td>

                  <td class="px-4 py-2">{{ log.ipAddress }}</td>

                  <td class="px-4 py-2 truncate" :title="log.userAgent">
                    {{ log.userAgent || "-" }}
                  </td>

                  <td class="px-4 py-2">
                    {{ log.sessionId || "-" }}
                  </td>
                </template>
              </tr>

              <tr v-if="logs.length === 0">
                <td
                  :colspan="
                    activeTab === 'AuditLog'
                      ? 8
                      : activeTab === 'SystemLog'
                        ? 12
                        : 7
                  "
                  class="px-4 py-6 text-center text-gray-500"
                >
                  ไม่พบข้อมูล Log
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useRuntimeConfig } from "#app";
import dayjs from "dayjs";
import AdminHeader from "~/components/admin/AdminHeader.vue";
import AdminSidebar from "~/components/admin/AdminSidebar.vue";

definePageMeta({ middleware: ["admin-auth"] });

const selectedDate = ref("");
const logs = ref([]);
const selectedLevel = ref("ALL");
const tabs = ["AuditLog", "SystemLog", "AccessLog"];
const activeTab = ref("AuditLog");

function changeTab(tab) {
  activeTab.value = tab;
  fetchLogs();
}

const summary = ref({
  total: 0,
  errorCount: 0,
  avgResponse: 0,
  highError: false,
});

const config = useRuntimeConfig();
function formatDate(date) {
  if (!date) return "-";
  return dayjs(date).format("D MMM YYYY HH:mm:ss");
}

function levelClass(level) {
  switch (level) {
    case "ERROR":
      return "bg-red-100 text-red-700";
    case "WARN":
      return "bg-yellow-100 text-yellow-700";
    default:
      return "bg-green-100 text-green-700";
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchLogs() {
  try {
    const data = await $fetch("/monitor/logs", {
      baseURL: config.public.apiBase,
      headers: getAuthHeaders(),
      query: {
        level: selectedLevel.value,
        type: activeTab.value,
        date: selectedDate.value || undefined,
      },
    });

    logs.value = data;
  } catch (error) {
    console.error("Fetch logs error:", error);
  }
}

async function fetchSummary() {
  try {
    const data = await $fetch("/monitor/logs/summary", {
      baseURL: config.public.apiBase,
      headers: getAuthHeaders(),
    });

    summary.value = data;
  } catch (error) {
    console.error("Fetch summary error:", error);
  }
}

let interval;

onMounted(async () => {
  await fetchLogs();
  await fetchSummary();

  interval = setInterval(() => {
    fetchSummary();
  }, 10000); 
});

onUnmounted(() => {
  clearInterval(interval);
});

</script>
