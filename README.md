# Cloud-Native SaaS Task & Incident Tracker

```mermaid
flowchart LR
    Dev[GitHub Push] --> CI[GitHub Actions: Test & Docker Build]
    CI --> Render[Render Cloud Web Service]
    Render <--> Supa[(Supabase PostgreSQL & Auth)]
    Render --> Mon[JSON Logs + /health + /metrics + UptimeRobot]
