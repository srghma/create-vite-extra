export function Page({ userId }: { userId: string }) {
  return `<div>
    <h1>User Page</h1>
    <p>Showing user with ID: ${userId}</p>
    <a href="/">Go home</a>
  </div>`
}
