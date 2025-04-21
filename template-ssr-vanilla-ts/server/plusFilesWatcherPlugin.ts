import { normalizePath, type ViteDevServer } from 'vite'

function assert(condition: any, msg: string) {
  if (condition) return
  throw new Error(msg)
}

function assertPosixPath(path: string): void {
  const errMsg = (msg: string) => `Not a posix path: ${msg}`
  assert(path !== null, errMsg('null'))
  assert(
    typeof path === 'string',
    errMsg(`typeof path === ${JSON.stringify(typeof path)}`),
  )
  assert(path !== '', errMsg('(empty string)'))
  assert(path, errMsg('(empty)'))
  assert(!path.includes('\\'), errMsg(path))
}

function isPlusFile(filePath: string): boolean {
  assertPosixPath(filePath)
  const fileName = filePath.split('/').pop()!
  return fileName.startsWith('+')
}

// similar to
// https://github.com/vikejs/vike/blob/0725dabc6e2234b96db87b573c6d3149cf07a8d9/vike/node/plugin/plugins/importUserCode/index.ts#L66C1-L78C1
export function plusFilesPlugin() {
  return {
    name: 'plus-files-watcher',
    configureServer(server: ViteDevServer) {
      // Set up a watcher for plus files
      server.watcher.on('change', (file: string) => {
        if (isPlusFile(normalizePath(file))) {
          server.ws.send({ type: 'full-reload' })
        }
      })
    },
  }
}
