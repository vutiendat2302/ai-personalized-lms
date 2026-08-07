import { defineConfig } from "vite"; // Hàm defineConfig từ vite: giúp ide và ts hiểu cấu hình vite, kiểm tra lỗi 
import react from "@vitejs/plugin-react"; // plugin react xử ls tsx, jsx -> trình duyệt hiểu được 
import tailwindcss from "@tailwindcss/vite"; // sử dụng plugin của tailwindcss 
import path from "path"; // module của node.js -> làm việc với đường dẫn file, 

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],

  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // __dirname: thu muc goc: ailms, node tu dinh nghia 
    },
  },
});