export async function register() {
// 仅在服务端 Node.js 环境且配置了 HTTP_PROXY 时生效
if (process.env.NEXT_RUNTIME === "nodejs" && process.env.HTTP_PROXY) {
try {
  const undici = await import("undici");
  const proxyAgent = new undici.ProxyAgent({
    uri: process.env.HTTP_PROXY,
  });
  
  const originalFetch = globalThis.fetch;
  
  globalThis.fetch = ((input: any, init?: any) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    
    // 过滤掉本地通信和数据库连接，防止数据库请求也走代理导致延迟
    const isLocal = url?.includes("localhost") || 
                    url?.includes("127.0.0.1") || 
                    url?.includes("neon.tech") || 
                    url?.includes("supabase");
    
    if (isLocal) {
      return originalFetch(input, init);
    }
    
    // 对外部请求（如 B 站 API）注入代理分发器
    return originalFetch(input, {
      ...init,
      dispatcher: proxyAgent,
    } as any);
  }) as typeof fetch;
  
  console.log("[Proxy] 成功拦截全局 fetch，外部请求将通过代理发送: " + process.env.HTTP_PROXY);
} catch (error) {
  console.error("[Proxy] 代理分发器初始化失败:", error);
}
}
}
