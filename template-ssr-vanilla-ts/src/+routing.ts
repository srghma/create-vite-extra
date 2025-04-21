// why in separate file? why not embed it into `server.js`?
// to allow reload of this file `await import('path_to_this_file')` in development

export function routing(url: string): {
  pageId: 'index' | 'about' | 'user' | '_404'
  dataFromUrl?: Record<string, any>
} {
  console.log('routing -> url', url)

  if (url === '') {
    return {
      pageId: 'index',
    }
  } else if (url === 'about') {
    return {
      pageId: 'about',
    }
  } else if (/^user\/\d+$/.test(url)) {
    const userId = url.split('/')[1]
    return {
      pageId: 'user',
      dataFromUrl: { userId },
    }
  }

  return {
    pageId: '_404',
  }
}
