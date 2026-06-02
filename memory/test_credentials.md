# Test Credentials - SmartDomo

## Admin
- Username: `Admin`
- Password: `SmartMaster2026`
- Role: admin
- User ID: efa0b9bb-277d-4cb2-afad-5c45869e39c5

## MPSKIN Test User (Baunei)
- Username: `Baunei`
- Password: `Baunei2026$`
- Role: user
- 3D Tour: MPSKIN iframe

## Notes
- Login endpoint: `POST /api/auth/login` with `{"username":..., "password":...}`
- Session verify: `GET /api/auth/verify?token=...`
- Module config (admin): `PUT /api/users/{user_id}/modules?token=...` body `{"modules_enabled": {...}}`
