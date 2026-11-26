const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function api(path, { token, ...options } = {}) {
  const headers = { ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }), ...options.headers };
  if (token) headers.Authorization = `Bearer ${token}`;
  let response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...options, headers });
  } catch {
    throw new Error(`Can’t reach the cafe API at ${API_URL}. Start the server and check MongoDB and JWT_SECRET in .env.`);
  }
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Request failed (${response.status}).`);
  return data;
}

export const money = (value) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2
}).format(Number(value || 0));

