import DefaultTheme from 'vitepress/theme'
import { withBase } from 'vitepress'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app, router }) {
    // 收藏系统：在浏览器端加载
    if (typeof window !== 'undefined') {
      const favScript = document.createElement('script')
      favScript.src = withBase('/favorites.js')
      favScript.defer = true
      document.head.appendChild(favScript)

      // 每日简报渲染器
      const briefScript = document.createElement('script')
      briefScript.src = withBase('/daily-brief.js')
      briefScript.defer = true
      document.head.appendChild(briefScript)
    }
  }
}
