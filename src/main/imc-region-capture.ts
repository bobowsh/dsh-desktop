/**
 * IMC 全屏区域截图：透明置顶遮罩窗（框选 UI）+ desktopCapturer 抓屏裁剪。
 *
 * 流程：renderer invoke 'imc:screenshot-region' → 主进程创建覆盖虚拟桌面的
 * 透明 frameless 置顶窗（data URL 内嵌框选 UI）→ 用户拖出矩形（Esc 取消）→
 * 主进程用 desktopCapturer 按选区所在显示器的物理分辨率 1:1 抓屏，
 * nativeImage.crop 裁剪后落盘临时 PNG，返回路径。
 *
 * 多显示器：只对选区中心所在的显示器做 1:1 抓取（跨显示器混合 DPI 的
 * 精确裁剪需要逐屏窗口，成本高收益低；选区落在哪屏就截哪屏）。
 */
import { BrowserWindow, ipcMain, desktopCapturer, screen, nativeImage } from 'electron'
import path from 'node:path'
import os from 'node:os'
import { writeFile } from 'node:fs/promises'

const OVERLAY_HTML = `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<style>
  html,body{margin:0;padding:0;height:100%;overflow:hidden;background:transparent;cursor:crosshair;user-select:none}
  #mask{position:fixed;inset:0}
  #rect{position:absolute;border:1px solid #07c160;display:none;box-shadow:0 0 0 100000px rgba(0,0,0,.32)}
  #size{position:absolute;background:#07c160;color:#fff;font:11px/1.6 sans-serif;padding:0 6px;border-radius:3px;display:none}
  #bar{position:absolute;display:none;gap:6px}
  #bar button{border:0;border-radius:4px;width:30px;height:24px;cursor:pointer;font-size:13px}
  #ok{background:#07c160;color:#fff}
  #no{background:#fff;color:#666;border:1px solid #ccc}
  #hint{position:fixed;top:14px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,.72);color:#fff;padding:7px 16px;border-radius:6px;font:12.5px sans-serif}
</style>
</head>
<body>
<div id="mask"></div>
<div id="rect"></div>
<div id="size"></div>
<div id="bar"><button id="ok" title="发送截图">&#10003;</button><button id="no" title="重新框选">&#10005;</button></div>
<div id="hint">按住鼠标左键框选区域，Esc 取消</div>
<script>
  var rectEl=document.getElementById('rect'),sizeEl=document.getElementById('size'),barEl=document.getElementById('bar'),hintEl=document.getElementById('hint')
  var start=null,rect=null,drag=false
  function norm(a,b){return{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.abs(a.x-b.x),h:Math.abs(a.y-b.y)}}
  function show(r){
    rect=r
    rectEl.style.cssText='display:block;left:'+r.x+'px;top:'+r.y+'px;width:'+r.w+'px;height:'+r.h+'px'
    sizeEl.style.cssText='display:block;left:'+r.x+'px;top:'+Math.max(r.y-22,2)+'px'
    sizeEl.textContent=r.w+' \u00d7 '+r.h
    var by=r.y+r.h+6>window.innerHeight-30?r.y+r.h-30:r.y+r.h+6
    barEl.style.cssText='display:flex;left:'+(r.x+r.w-68)+'px;top:'+by+'px'
    hintEl.style.display='none'
  }
  function hide(){rect=null;rectEl.style.display='none';sizeEl.style.display='none';barEl.style.display='none';hintEl.style.display='block'}
  document.addEventListener('mousedown',function(e){if(e.button!==0)return;start={x:e.clientX,y:e.clientY};drag=true;show({x:start.x,y:start.y,w:0,h:0})})
  document.addEventListener('mousemove',function(e){if(drag&&start)show(norm(start,{x:e.clientX,y:e.clientY}))})
  document.addEventListener('mouseup',function(){drag=false;if(rect&&rect.w<3)hide()})
  document.getElementById('no').addEventListener('click',function(e){e.stopPropagation();hide()})
  document.getElementById('ok').addEventListener('click',function(e){e.stopPropagation();if(rect&&rect.w>2)window.imcRegion&&window.imcRegion(rect)})
  window.addEventListener('keydown',function(e){if(e.key==='Escape')window.imcRegion&&window.imcRegion(null)})
  window.imcRegionReady=true
</script>
</body>
</html>`

interface RegionRect { x: number; y: number; w: number; h: number }

export function registerImcRegionCapture(): void {
  ipcMain.removeHandler('imc:screenshot-region')
  ipcMain.handle('imc:screenshot-region', async (): Promise<{ path: string | null }> => {
    const displays = screen.getAllDisplays()
    const origin = {
      x: Math.min(...displays.map((d) => d.bounds.x)),
      y: Math.min(...displays.map((d) => d.bounds.y)),
    }
    const right = Math.max(...displays.map((d) => d.bounds.x + d.bounds.width))
    const bottom = Math.max(...displays.map((d) => d.bounds.y + d.bounds.height))
    const width = right - origin.x
    const height = bottom - origin.y

    const overlay = new BrowserWindow({
      x: origin.x,
      y: origin.y,
      width,
      height,
      frame: false,
      transparent: true,
      resizable: false,
      movable: false,
      alwaysOnTop: true,
      skipTaskbar: true,
      hasShadow: false,
      enableLargerThanScreen: true,
      fullscreenable: false,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true },
    })
    overlay.setAlwaysOnTop(true, 'screen-saver')
    await overlay.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(OVERLAY_HTML))
    overlay.show()

    const rect = await new Promise<RegionRect | null>((resolve) => {
      let settled = false
      const done = (r: RegionRect | null) => {
        if (settled) return
        settled = true
        resolve(r)
      }
      ipcMain.removeHandler('imc-region:pick')
      ipcMain.handle('imc-region:pick', (_e, r: RegionRect | null) => {
        // overlay 的 client 坐标 → 虚拟桌面屏幕坐标
        done(r ? { x: r.x + origin.x, y: r.y + origin.y, w: r.w, h: r.h } : null)
      })
      // overlay 被系统关掉（失焦兜底等）也不能永久挂起
      overlay.once('closed', () => done(null))
    }).finally(() => {
      if (!overlay.isDestroyed()) overlay.destroy()
      ipcMain.removeHandler('imc-region:pick')
    })

    if (!rect || rect.w < 2 || rect.h < 2) return { path: null }

    // 选区中心落在哪块屏，就用哪块屏的 scaleFactor 做 1:1 抓取
    const cx = rect.x + rect.w / 2
    const cy = rect.y + rect.h / 2
    const display = screen.getDisplayNearestPoint({ x: Math.round(cx), y: Math.round(cy) })
    const scale = display.scaleFactor || 1
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: {
        width: Math.round(display.bounds.width * scale),
        height: Math.round(display.bounds.height * scale),
      },
    })
    const source = sources.find((s) => {
      // display_id 关联当前屏；拿不到就退回第一块
      return s.display_id === String(display.id)
    }) ?? sources[0]
    if (!source) return { path: null }

    const full = source.thumbnail
    const cropX = Math.round((rect.x - display.bounds.x) * scale)
    const cropY = Math.round((rect.y - display.bounds.y) * scale)
    const cropW = Math.min(Math.round(rect.w * scale), full.getSize().width - cropX)
    const cropH = Math.min(Math.round(rect.h * scale), full.getSize().height - cropY)
    if (cropW <= 0 || cropH <= 0) return { path: null }
    const cropped = full.crop({
      x: Math.max(cropX, 0),
      y: Math.max(cropY, 0),
      width: cropW,
      height: cropH,
    })
    const target = path.join(os.tmpdir(), `imc-shot-${Date.now()}.png`)
    await writeFile(target, cropped.toPNG())
    return { path: target }
  })
}
