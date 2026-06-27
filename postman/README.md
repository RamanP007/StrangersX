# StrangerX — Postman Collection

API collection for the StrangerX Go backend.

## Files
- `StrangerX.postman_collection.json` — all REST endpoints (with headers, bodies, and example responses) + WebSocket docs.
- `StrangerX.postman_environment.json` — `baseUrl`, `wsBaseUrl`, `jwtToken`, `guestToken`.

## Import
1. Postman → **Import** → drop both JSON files.
2. Select the **StrangerX — Local** environment (top-right).
3. Make sure the backend is running (`make up`) at `http://localhost:8080`.

## Auth flow
Protected endpoints accept **either**:
- `Authorization: Bearer {{jwtToken}}` (registered Google users), or
- `X-Guest-Token: {{guestToken}}` (anonymous guests).

Get a token first:
- **Auth → Create Guest Session** → auto-saves `guestToken`.
- **Auth → Google Sign In** → paste a Google ID token → auto-saves `jwtToken`.

(Both have test scripts that store the token into collection variables, so the protected requests just work afterward.)

> A real Google **ID token** is needed for `POST /api/auth/google`. The easiest way to grab one is from the running web app: sign in with Google, then read `session.idToken` (the frontend sends exactly this to the backend).

## Endpoints
| Folder | Method | Path | Auth |
|---|---|---|---|
| System | GET | `/health` | — |
| System | GET | `/api/online` | — |
| Auth | POST | `/api/auth/google` | — |
| Auth | POST | `/api/guest/session` | — |
| Account | GET | `/api/me` | JWT |
| Account | GET | `/api/username/check?username=` | JWT/Guest |
| Account | PATCH | `/api/me/username` | JWT |
| Account | POST | `/api/me/username/confirm` | JWT |
| Account | POST | `/api/me/terms/accept` | JWT |
| Account | DELETE | `/api/me` | JWT |
| Moderation | POST | `/api/report` | JWT/Guest |
| Realtime | WS | `/ws?token=` | JWT/Guest |
| Realtime | WS | `/ws/presence` | — |

## WebSockets
Postman can't send WS frames from a normal collection request — use **New → WebSocket Request** and connect to:
- `ws://localhost:8080/ws?token=<jwtOrGuestToken>`
- `ws://localhost:8080/ws/presence`

The message protocols are documented in the **Realtime (WebSocket)** folder description.
