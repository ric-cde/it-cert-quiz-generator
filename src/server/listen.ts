/**
 * Where the server listens. With no `HOST` it listens on every interface, as it always has on the
 * laptop. On the eq14 `HOST=127.0.0.1` keeps it off the home network, so only Tailscale Serve,
 * running on the same machine, can reach it.
 */
export function listenOptions(port: number, env: NodeJS.ProcessEnv = process.env) {
  const hostname = env.HOST?.trim() || undefined
  return { port, hostname, url: `http://${hostname ?? 'localhost'}:${port}` }
}
