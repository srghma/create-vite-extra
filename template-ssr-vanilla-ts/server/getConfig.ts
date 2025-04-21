import fs from 'node:fs/promises'
import fileExists from 'file-exists'
import { type ViteDevServer } from 'vite'

async function getPage(
  vite_ifProd: ViteDevServer | null,
  pageId: string,
): Promise<(dataFromUrl: string) => string> {
  return vite_ifProd
    ? (await vite_ifProd.ssrLoadModule(`/src/pages/${pageId}/+Page.ts`)).Page
    : (await import(`./dist/server/pages/${pageId}/+Page.js`)).Page
}

async function getHead(
  vite_ifProd: ViteDevServer | null,
  pageId: string,
): Promise<((dataFromUrl: string) => string) | null> {
  const HeadPath = vite_ifProd
    ? `./dist/server/pages/${pageId}/+Head.js`
    : `./src/pages/${pageId}/+Head.ts`

  if (!(await fileExists(HeadPath))) {
    return null
  }
  return vite_ifProd
    ? (await vite_ifProd.ssrLoadModule(HeadPath.replace(/^\./, ''))).Head
    : (await import(HeadPath)).Head
}

async function getOnRenderClientPath(
  isProduction: boolean,
  pageId: string,
): Promise<string | null> {
  let onRenderClientPath: null | string = isProduction
    ? `./dist/server/pages/${pageId}/+onRenderClient.ts`
    : `./src/pages/${pageId}/+onRenderClient.ts`

  if (!(await fileExists(onRenderClientPath))) return null

  return onRenderClientPath
}

export async function getPageFunctions(
  options:
    | { isProduction: false; vite: ViteDevServer }
    | { isProduction: true },
  pageId: string,
) {
  const { isProduction } = options
  const vite_ifProd = isProduction ? null : options.vite
  const Page = await getPage(vite_ifProd, pageId)
  const Head = await getHead(vite_ifProd, pageId)
  const onRenderClientPath = await getOnRenderClientPath(isProduction, pageId)

  return {
    Page,
    Head,
    onRenderClientPath,
  }
}

export function render(
  Page: (dataFromUrl: any) => string,
  Head: ((dataFromUrl: any) => string) | null,
  onRenderClientPath: string | null,
  dataFromUrl: any,
) {
  const renderedPage = Page(dataFromUrl)
  const renderedHead = Head ? Head(dataFromUrl) : ''

  return {
    renderedPage,
    renderedHead,
    onRenderClientScript: onRenderClientPath
      ? `<script type="module" src="${onRenderClientPath.replace(/^\./, '')}"></script>`
      : '',
  }
}

// Extract file paths and content loading logic into a function
export async function getConfig(
  options:
    | { isProduction: false; vite: ViteDevServer }
    | { isProduction: true },
) {
  // Get template HTML
  let template = options.isProduction
    ? await fs.readFile('./dist/client/index.html', 'utf-8')
    : await fs.readFile('./index.html', 'utf-8')

  // Load routing module
  const routing = options.isProduction
    ? // @ts-expect-error
    (await import('./dist/server/routing.js')).routing
    : (await options.vite.ssrLoadModule('/src/+routing.ts')).routing

  return {
    template,
    routing,
  }
}
