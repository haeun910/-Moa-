import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// iOS Safari는 viewport의 user-scalable=no를 무시하고 두 손가락 확대를 허용하므로 직접 막음
// (gesture* 이벤트는 iOS Safari에만 있음)
for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(type, e => e.preventDefault(), { passive: false })
}
// 여러 손가락 터치로 확대하는 경우(일부 브라우저)도 막음
document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault()
}, { passive: false })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
