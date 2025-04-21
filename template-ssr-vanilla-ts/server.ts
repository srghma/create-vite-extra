import express from 'express'

import { getConfig, getPageFunctions, render } from './getConfig.ts'
import { type ViteDevServer } from 'vite'

// Constants
const isProduction = process.env.NODE_ENV === 'production'
const port = process.env.PORT || 5173
const base = process.env.BASE || '/'

// Create http server
const app = express()

// Add Vite or respective production middlewares
/** @type {import('vite').ViteDevServer | undefined} */
let vite: null | ViteDevServer = null
if (!isProduction) {
  const { createServer } = await import('vite')
  const { plusFilesPlugin } = await import('./plusFilesWatcherPlugin.ts')
  vite = await createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    base,
    plugins: [plusFilesPlugin()],
  })
  app.use(vite.middlewares)
} else {
  const compression = (await import('compression')).default
  const sirv = (await import('sirv')).default
  app.use(compression())
  app.use(base, sirv('./dist/client', { extensions: [] }))
}

// Cached production assets for production
let templateAndRouting__production: null | { template: string; routing: any } =
  null

let perPageFunctions__production: null | Record<
  string,
  { Page: any; Head: any; onRenderClientPath: string }
> = null
if (isProduction) {
  const options = isProduction ? { isProduction } : { isProduction, vite }
  templateAndRouting__production = await getConfig(options)
  perPageFunctions__production = Object.fromEntries(
    await Promise.all(
      ['user', 'about', '_404', 'index'].map(async (pageId) => [
        pageId,
        await getPageFunctions(options, pageId),
      ]),
    ),
  )
}

// Serve HTML
app.use('*all', async (req, res) => {
  try {
    const url = req.originalUrl.replace(base, '')
    // console.log('express * originalUrl', req.originalUrl)

    // Get config based on environment
    const options = { isProduction, vite: vite as ViteDevServer }
    const config = templateAndRouting__production || (await getConfig(options))

    let template = config.template
    if (!isProduction && vite) {
      template = await vite.transformIndexHtml(url, template)
    }

    // Get routing info
    const { pageId, dataFromUrl } = config.routing(url)

    const pageFunction = perPageFunctions__production
      ? perPageFunctions__production[pageId]
      : await getPageFunctions(options, pageId)

    if (!pageFunction) {
      throw new Error(`[IMPOSSIBLE] no such page in prod ${pageId}`)
    }

    const { Page, Head, onRenderClientPath } = pageFunction

    // Load and render page
    const { renderedPage, renderedHead, onRenderClientScript } = render(
      Page,
      Head,
      onRenderClientPath,
      dataFromUrl,
    )

    // Inject content into template
    const html = config.template
      .replace(`<!--app-head-->`, renderedHead)
      .replace(`<!--app-html-->`, renderedPage)
      .replace(`<!--app-body-bottom-->`, onRenderClientScript)

    // console.log('html after', html.toString())
    res.status(200).set({ 'Content-Type': 'text/html' }).send(html)
  } catch (e) {
    vite?.ssrFixStacktrace(e)
    console.log(e.stack)
    res.status(500).end(e.stack)
  }
})

// Start http server
app.listen(port, () => {
  console.log(`Server started at http://localhost:${port}`)
})
