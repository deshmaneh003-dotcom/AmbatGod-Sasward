# Aam Bat God Cafe

A cafe operations and billing app built with React, Express, MongoDB and JWT authentication.

## What’s included

- Admin registration and sign-in with bcrypt-hashed passwords and JWT-protected API routes. Sign-in accepts the registered email address or phone number; usernames are not login credentials.
- Responsive dashboard with daily stats, weekly sales, six-month revenue, popular items and payment mix.
- Menu management with item names and prices. Admins can add, edit and delete items for billing. A fresh database is seeded with the cafe menu.
- POS cart with item search, order type, guest details, discounts, configurable GST and Cash/UPI/Card payment.
- Saved orders, printable receipts (use the browser print dialog to save a PDF), customer history and CSV export.
- Cafe profile and receipt settings, with recent successful sign-ins recorded and shown in Settings (latest 50 entries).

## Run locally

1. Install Node.js 18+ and start MongoDB locally, or create a MongoDB Atlas connection string.
2. Copy `.env.example` to `.env`; set `MONGODB_URI` and a long random `JWT_SECRET`.
3. Install packages and start the API and frontend:

   ```sh
   npm install
   npm run dev
   ```

4. Open [http://localhost:5173](http://localhost:5173), choose **Create an account**, then sign in.

The API listens on port `5000`. Set `VITE_API_URL` if the frontend should use a different API address. Product image uploads are limited to 5 MB and stored in `server/uploads`.

## Production build

```sh
npm run build
npm start
```

Configure a production `MONGODB_URI`, `JWT_SECRET`, `CLIENT_URL`, and `VITE_API_URL` before deployment. `npm start` starts the API; serve the generated `dist` directory from a static host or web server.

## Notes

- The first person to register creates the single admin account. Registration closes after that account exists.
- Each browser tab requires sign-in; the active session is retained in that tab across navigation and page refreshes.
- Password recovery email delivery needs an email provider and is not configured in this starter.
- Receipt printing uses the browser print dialog, which can save the invoice as a PDF.
