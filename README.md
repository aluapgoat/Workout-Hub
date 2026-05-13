# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.

## Deployment option: frontend on Vercel, backend on a Node-friendly PaaS

This project already supports a separate frontend and API deployment. The React app reads the backend URL from `VITE_API_URL`.

1. Deploy the frontend to Vercel
   - Use `npm run build` as the build command
   - Use `dist` as the output directory
   - Set environment variables in Vercel if needed

2. Deploy the Express API to a Node-friendly PaaS
   - Use Render, Railway, Fly, or another Node host
   - Set `MONGODB_URI` for the database
   - Set `CLIENT_ORIGIN` if you want to restrict CORS to your frontend host
   - Optionally set `OPENAI_API_KEY` for recommendation support

3. Point the frontend to the API host
   - Add `VITE_API_URL=https://your-api-host.example.com` to your Vercel environment variables
   - The frontend will call the API at `https://your-api-host.example.com/splits`, `/recommend`, etc.

### Notes

- If `VITE_API_URL` is not set, the app falls back to localStorage-only mode.
- Your Express API can expose `/splits`, `/splits/:id`, `/recommend`, and `/api/recommend`.
- Use `server/index.js` when deploying the backend; no frontend changes are required beyond `VITE_API_URL`.
