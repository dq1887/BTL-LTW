const BASE_URL = "http://localhost:5000/api";

type Params = Record<string, string | number | undefined>;

interface Options {
  params?: Params;
  body?: unknown;
}

async function request(method: string, path: string, opts: Options = {}) {
  const url = new URL(BASE_URL + path);
  if (opts.params) {
    Object.entries(opts.params).forEach(([k, v]) => {
      if (v !== undefined) url.searchParams.set(k, String(v));
    });
  }

  const token = localStorage.getItem("token");
  const res = await fetch(url.toString(), {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    // Giữ cùng dạng lỗi với axios để getErr() trong PayrollPage đọc được
    const err = new Error(data.message || "Đã có lỗi xảy ra!") as Error & {
      response?: { data: unknown };
    };
    err.response = { data };
    throw err;
  }

  return { data };
}

const api = {
  get: (path: string, opts?: { params?: Params }) =>
    request("GET", path, opts),
  post: (path: string, body?: unknown) => request("POST", path, { body }),
  put: (path: string, body?: unknown) => request("PUT", path, { body }),
};

export default api;