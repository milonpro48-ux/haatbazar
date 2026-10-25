import React from "react";
import { createRoot } from "react-dom/client";
import Home from "@/pages/Home";
import { Router } from "wouter";
import "@/index.css";

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Router base={import.meta.env.BASE_URL.replace(/\/$/, "") || undefined}>
      <Home />
    </Router>
  </React.StrictMode>
);
