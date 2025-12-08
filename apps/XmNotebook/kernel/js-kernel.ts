/**
 * Simple kernel helper that POSTs to /api/execute.
 * For advanced kernels, implement deno_core isolate here.
 */
export async function runCode(code) {
  const res = await fetch("/api/execute", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code, lang: "js" }),
  });
  return await res.json();
}