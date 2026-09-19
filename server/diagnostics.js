// Never pass raw requests, decrypted bodies, credentials or provider errors here.
export function diagnostic(event, fields = {}) {
  console.log(
    JSON.stringify({ time: new Date().toISOString(), event, ...fields }),
  );
}

export function safeError(error) {
  const known = new Set([
    "回调签名无效",
    "回调时间戳无效",
    "回调填充无效",
    "回调接收者或消息长度无效",
    "机器人身份不匹配",
    "主动回复地址不合法",
  ]);
  return {
    errorType: error instanceof SyntaxError ? "SyntaxError" : "Error",
    reason: known.has(error?.message) ? error.message : "processing_failed",
    // Error messages can contain decrypted JSON or secrets. Keep stack frames only.
    stack: String(error?.stack || "")
      .split("\n")
      .filter((line) => /^\s+at /.test(line))
      .slice(0, 8),
  };
}
