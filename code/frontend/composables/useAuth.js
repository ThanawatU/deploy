import { useCookie } from '#app'
import { useRouter } from 'vue-router'

export function useAuth() {
  const { $api } = useNuxtApp()

  const cookieOpts = {
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
    sameSite: 'none',
    secure: process.env.NODE_ENV === 'production'
  }
  const token = useCookie('token', cookieOpts)
  const user = useCookie('user', cookieOpts)
  // const token = useCookie('token', { maxAge: 60 * 60 * 24 * 7, secure: true })
  // const user = useCookie('user', { maxAge: 60 * 60 * 24 * 7, secure: true })
  const router = useRouter()

  const login = async (identifier, password) => {
    const payload = { password }
    if (identifier.includes('@')) {
      payload.email = identifier
    } else {
      payload.username = identifier
    }

    const res = await $api('/auth/login', {
      method: 'POST',
      body: payload
    })
    token.value = res.token
    user.value = res.user
    return res
  }

  // const register = async (email, password, firstName, lastName) => {
  //   const res = await $api('/users', {
  //     method: 'POST',
  //     body: { email, password, firstName, lastName }
  //   })
  //   return res
  // }

  const register = async (formData) => {
    const res = await $api('/users', {
      method: 'POST',
      body: formData // ส่ง FormData ไปทั้งก้อน ไม่ต้องแปลงเป็น JSON
    })
    return res
  }

  const logout = async () => {
  try {
    await $api('/auth/logout', {
      method: 'POST'
    })
  } catch (err) {
    console.error('Logout error:', err)
  }

  token.value = null
  user.value = null
  return router.push('/')
}


  return { token, user, login, logout, register }
}
