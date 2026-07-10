import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    // 收藏系统：在浏览器端加载
    if (typeof window !== 'undefined') {
      const script = document.createElement('script')
      script.src = '/favorites.js'
      script.defer = true
      document.head.appendChild(script)
    }
  }
}
